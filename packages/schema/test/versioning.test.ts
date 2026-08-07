import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  versionedSchema,
  deprecated,
  isExpiredDeprecation,
  DurableEventEnvelopeSchema,
  upcastEventToCurrent,
  type SchemaMigration,
  type DurableEventDefinition,
} from "../src/versioned.js";

// v1 payload: `task.completed` with only { taskId, doneAt }
const taskV1 = z.object({
  taskId: z.string(),
  doneAt: z.string().datetime(),
});

// v2 payload: adds optional durationMs (additive-only rule)
const taskV2 = z.object({
  taskId: z.string(),
  doneAt: z.string().datetime(),
  durationMs: z.number().optional(),
});

const taskMigrations: SchemaMigration[] = [
  {
    from: 1,
    to: 2,
    up: (old: { taskId: string; doneAt: string }) => ({ taskId: old.taskId, doneAt: old.doneAt }),
    note: "v2 adds optional durationMs",
  },
];

const task = versionedSchema<z.infer<typeof taskV2>>({
  kind: "task.completed",
  versions: { 1: taskV1, 2: taskV2 },
  migrations: taskMigrations,
  current: 2,
});

describe("versionedSchema", () => {
  it("parses a raw current payload directly", () => {
    const out = task.parse({ taskId: "t1", doneAt: "2026-01-01T00:00:00Z", durationMs: 42 });
    expect(out.taskId).toBe("t1");
    expect(out.durationMs).toBe(42);
  });

  it("upcasts an enveloped v1 payload to current shape", () => {
    const out = task.parse({ type: "task.completed", version: 1, data: { taskId: "t1", doneAt: "2026-01-01T00:00:00Z" } });
    expect(out.taskId).toBe("t1");
    expect(out.durationMs).toBeUndefined();
  });

  it("upcasts a raw v1 payload via explicit version", () => {
    const out = task.upcastFrom(1, { taskId: "t1", doneAt: "2026-01-01T00:00:00Z" });
    expect(out).toMatchObject({ taskId: "t1" });
  });

  it("rejects a non-single-step migration at construction", () => {
    expect(() =>
      versionedSchema({
        kind: "bad",
        versions: { 1: taskV1, 3: taskV2 },
        migrations: [{ from: 1, to: 3, up: (o: any) => o, note: "jumps two steps" }],
        current: 3,
      }),
    ).toThrow(/single step/);
  });

  it("rejects an unknown current version on parse", () => {
    const s = versionedSchema({ kind: "x", versions: { 1: taskV1 }, migrations: [], current: 1 });
    expect(() => s.parse({ type: "x", version: 5, data: {} })).toThrow(/unknown version 5/);
  });

  it("no-ops when payload is already at current version", () => {
    const out = task.parse({ taskId: "t1", doneAt: "2026-01-01T00:00:00Z" });
    expect(out.taskId).toBe("t1");
  });
});

describe("deprecation + forward compatibility", () => {
  it("marks a field deprecated with a sunset date", () => {
    const field = deprecated(z.string(), { since: "2026-01-01", removalDate: "2026-06-01", useInstead: "newOne" });
    expect(isExpiredDeprecation(field)).toBe(true);
  });

  it("is not expired before the removal date", () => {
    const field = deprecated(z.string(), { since: "2026-01-01", removalDate: "2030-06-01" });
    expect(isExpiredDeprecation(field, new Date("2026-03-01"))).toBe(false);
  });

  it("is not deprecated when no note is attached", () => {
    expect(isExpiredDeprecation(z.string())).toBe(false);
  });

  it("defaults to opening records so forward-unknown fields are tolerated", () => {
    // `parse` reads a hypothetical v3 with an added optional field via catchall-free
    // open record: unknown keys are stripped, no throw.
    const out = task.parse({ taskId: "t1", doneAt: "2026-01-01T00:00:00Z", futureField: "ignored" });
    expect(out.taskId).toBe("t1");
  });
});

describe("DurableEventEnvelopeSchema + upcastEventToCurrent", () => {
  const envelope = {
    id: "evt_1",
    aggregate: "session:s1",
    aggregateVersion: 0,
    type: "run.completed",
    version: 1,
    occurredAt: "2026-01-01T00:00:00Z",
    traceId: "tr_1",
    data: { status: "succeeded", output: "ok" },
  };

  it("validates a well-formed durable envelope", () => {
    expect(DurableEventEnvelopeSchema.parse(envelope).type).toBe("run.completed");
  });

  it("rejects a payload-version envelope missing required fields", () => {
    const bad = { ...envelope };
    delete (bad as any).aggregateVersion;
    expect(() => DurableEventEnvelopeSchema.parse(bad)).toThrow();
  });

  it("upcasts historical event data through its migration chain", () => {
    const runV1 = z.object({ status: z.enum(["succeeded", "failed"]), output: z.string().optional() });
    const runV2 = z.object({
      status: z.enum(["succeeded", "failed"]),
      output: z.string().optional(),
      totalSteps: z.number().optional(),
    });
    const def: DurableEventDefinition = {
      type: "run.completed",
      version: 2,
      aggregate: "session",
      dataSchema: runV2,
      migrations: [
        { from: 1, to: 2, up: (o: any) => ({ status: o.status, output: o.output }), note: "v2 adds totalSteps" },
      ],
    };
    const current = upcastEventToCurrent(def, { status: "succeeded" });
    expect(current).toMatchObject({ status: "succeeded" });
  });

  it("throws when a migration link is missing", () => {
    const def: DurableEventDefinition = {
      type: "run.completed",
      version: 3,
      aggregate: "session",
      dataSchema: z.object({ status: z.string() }),
      migrations: [{ from: 1, to: 2, up: (o: any) => o, note: "skip 2->3" }],
    };
    expect(() => upcastEventToCurrent(def, { status: "succeeded" })).toThrow(/missing migration 2 -> 3/);
  });
});