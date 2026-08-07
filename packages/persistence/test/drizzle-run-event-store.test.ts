import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DrizzleRunEventStore } from "../src/drizzle/run-event-store.js";
import type { RunEvent } from "@vinhnt-sdk/agent-core";

const TEST_DB_DIR = mkdtempSync(join(tmpdir(), "vnt-drizzle-run-test-"));
const TEST_DB_PATH = join(TEST_DB_DIR, "test.db");

function makeEvent(overrides: Partial<RunEvent> & { data?: unknown } = {}): RunEvent {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    runId: overrides.runId ?? "drizzle-test-run-1",
    sequence: overrides.sequence ?? 0,
    type: overrides.type ?? "test.event",
    occurredAt: overrides.occurredAt ?? new Date().toISOString(),
    traceId: overrides.traceId ?? "test-trace",
    data: overrides.data ?? { message: "hello" },
  };
}

describe("DrizzleRunEventStore", () => {
  let store: DrizzleRunEventStore;

  beforeAll(() => {
    store = new DrizzleRunEventStore(TEST_DB_PATH);
  });

  afterAll(() => {
    try {
      if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);
      if (existsSync(TEST_DB_PATH + "-wal")) unlinkSync(TEST_DB_PATH + "-wal");
      if (existsSync(TEST_DB_PATH + "-shm")) unlinkSync(TEST_DB_PATH + "-shm");
    } catch { /* ignore */ }
  });

  it("TC01: append event — save to SQLite via Drizzle", async () => {
    const event = makeEvent({ type: "run.started", data: { prompt: "Hello" } });
    await expect(store.append(event)).resolves.toBeUndefined();
  });

  it("TC02: list events — reads back correct data", async () => {
    const event = makeEvent({
      runId: "drizzle-list-test",
      sequence: 0,
      type: "custom.event",
      data: { key: "value", number: 42 },
    });
    await store.append(event);
    const events = await store.list("drizzle-list-test");
    expect(events).toHaveLength(1);
    expect(events[0]!.id).toBe(event.id);
    expect(events[0]!.runId).toBe("drizzle-list-test");
    expect(events[0]!.sequence).toBe(0);
    expect(events[0]!.type).toBe("custom.event");
    expect(events[0]!.data).toEqual({ key: "value", number: 42 });
  });

  it("TC03: list events — non-existent run returns []", async () => {
    const events = await store.list("nonexistent-run");
    expect(events).toEqual([]);
  });

  it("TC03b: subscribe — listeners notified on persisted event append", async () => {
    const runId = "drizzle-subscribe-run";
    const received: RunEvent[] = [];
    const unsub = store.subscribe((e) => received.push(e));
    await store.append(makeEvent({ runId, sequence: 0, type: "run.started" }));
    await store.append(makeEvent({ runId, sequence: 1, type: "step.started" }));
    unsub();
    expect(received).toHaveLength(2);
    expect(received[0]!.type).toBe("run.started");
    expect(received[1]!.type).toBe("step.started");
    // unsubscribed listeners stop receiving
    await store.append(makeEvent({ runId, sequence: 2, type: "step.completed" }));
    expect(received).toHaveLength(2);
  });

  it("TC03c: subscribe — persist:false events still broadcast to listeners", async () => {
    const received: RunEvent[] = [];
    const unsub = store.subscribe((e) => received.push(e));
    const liveEvent: RunEvent = {
      id: crypto.randomUUID(),
      runId: "live-only",
      sequence: 0,
      type: "token.streamed",
      occurredAt: new Date().toISOString(),
      traceId: "test-trace",
      data: { token: "x" },
      persist: false,
    };
    await store.append(liveEvent);
    unsub();
    expect(received).toHaveLength(1);
    expect(received[0]!.type).toBe("token.streamed");
    expect(received[0]!.persist).toBe(false);
    // live-only events are NOT persisted
    const events = await store.list("live-only");
    expect(events).toHaveLength(0);
  });

  it("TC04: multiple events — returns correct sequence order", async () => {
    const runId = "drizzle-multi-event-run";
    await store.append(makeEvent({ runId, sequence: 0, data: { step: 0 } }));
    await store.append(makeEvent({ runId, sequence: 1, data: { step: 1 } }));
    await store.append(makeEvent({ runId, sequence: 2, data: { step: 2 } }));
    const events = await store.list(runId);
    expect(events).toHaveLength(3);
    expect(events[0]!.sequence).toBe(0);
    expect(events[1]!.sequence).toBe(1);
    expect(events[2]!.sequence).toBe(2);
  });

  it("TC05: list afterSequence — only returns events with sequence > N", async () => {
    const runId = "drizzle-after-seq-run";
    await store.append(makeEvent({ runId, sequence: 0 }));
    await store.append(makeEvent({ runId, sequence: 1 }));
    await store.append(makeEvent({ runId, sequence: 2 }));
    await store.append(makeEvent({ runId, sequence: 3 }));
    const events = await store.list(runId, 1);
    expect(events).toHaveLength(2);
    expect(events[0]!.sequence).toBe(2);
    expect(events[1]!.sequence).toBe(3);
  });

  it("TC06: afterSequence undefined — returns all events", async () => {
    const runId = "drizzle-no-after-run";
    await store.append(makeEvent({ runId, sequence: 5 }));
    await store.append(makeEvent({ runId, sequence: 10 }));
    const events = await store.list(runId, undefined);
    expect(events).toHaveLength(2);
  });

  it("TC07: stores nested object data", async () => {
    const runId = "drizzle-nested-data-run";
    const complexData = {
      user: { name: "Alice", scores: [1, 2, 3] },
      nested: { level1: { level2: { value: "deep" } } },
    };
    await store.append(makeEvent({ runId, sequence: 0, data: complexData }));
    const events = await store.list(runId);
    expect(events[0]!.data).toEqual(complexData);
  });

  // ======================================================================
  // TC08–TC12: Snapshot persistence (A3)
  // ======================================================================
  const snapRunId = "drizzle-snapshot-test";

  it("TC08: saveSnapshot — saves snapshot successfully", async () => {
    await store.append(makeEvent({ runId: snapRunId, sequence: 0, data: { step: 0 } }));
    await store.append(makeEvent({ runId: snapRunId, sequence: 1, data: { step: 1 } }));
    await store.saveSnapshot(snapRunId, { state: "after-step-1", count: 2 });
    const snap = await store.getSnapshot(snapRunId);
    expect(snap).not.toBeNull();
    expect(snap!.runId).toBe(snapRunId);
    expect(snap!.state).toEqual({ state: "after-step-1", count: 2 });
  });

  it("TC09: getSnapshot — returns latest snapshot", async () => {
    await store.append(makeEvent({ runId: snapRunId, sequence: 2, data: { step: 2 } }));
    await store.saveSnapshot(snapRunId, { state: "after-step-2", count: 3 });
    const snap = await store.getSnapshot(snapRunId);
    expect(snap!.sequence).toBe(2);
    expect(snap!.state).toEqual({ state: "after-step-2", count: 3 });
  });

  it("TC10: getSnapshot — run with no snapshot returns null", async () => {
    const snap = await store.getSnapshot("no-snap-run");
    expect(snap).toBeNull();
  });

  it("TC11: getSnapshotAfterSequence — finds snapshot before given sequence", async () => {
    // snapshots at seq=1 and seq=2, query at seq=2 should return seq=2 snapshot
    const snap = await store.getSnapshotAfterSequence(snapRunId, 2);
    expect(snap).not.toBeNull();
    expect(snap!.sequence).toBe(2);
    expect(snap!.state).toEqual({ state: "after-step-2", count: 3 });
  });

  it("TC12: getSnapshotAfterSequence — queries before earliest snapshot", async () => {
    // query at seq=0 — should be null (no snapshot at seq=0)
    const snap = await store.getSnapshotAfterSequence(snapRunId, 0);
    expect(snap).toBeNull();
  });
});
