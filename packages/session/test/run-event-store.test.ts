import { describe, expect, it } from "vitest";
import type { RunEvent, RunId, TraceId } from "@vinhnt-sdk/schema";
import { InMemoryRunEventStore, NullRunEventStore } from "../src/index.js";

const traceId = "trace_seq" as TraceId;

function makeEvent(runId: string, sequence: number, id?: string): RunEvent {
  return {
    id: id ?? `evt_${runId}_${sequence}`,
    runId: runId as RunId,
    sequence,
    type: "run.started",
    occurredAt: new Date(1_700_000_000_000 + sequence * 1000).toISOString(),
    traceId,
    data: { model: "m", provider: "p" },
  };
}

// PS-01 regression: a sequence that never advances (the old constant `1`)
// silently violates "sequence is monotonic per aggregate".
describe.each([
  ["NullRunEventStore", () => new NullRunEventStore()],
  ["InMemoryRunEventStore", () => new InMemoryRunEventStore()],
])("%s sequence invariant", (_name, factory) => {
  it("assigns strictly increasing sequences per aggregate", async () => {
    const store = factory();
    const a = await store.appendWithSequence(makeEvent("run_1", 0));
    const b = await store.appendWithSequence(makeEvent("run_1", 0));
    const c = await store.appendWithSequence(makeEvent("run_1", 0));
    expect([a, b, c]).toEqual([0, 1, 2]);
    expect(await store.getNextSequence("run_1")).toBe(3);
  });

  it("tracks sequences independently per aggregate", async () => {
    const store = factory();
    expect(await store.appendWithSequence(makeEvent("run_a", 0))).toBe(0);
    expect(await store.appendWithSequence(makeEvent("run_b", 0))).toBe(0);
    expect(await store.appendWithSequence(makeEvent("run_a", 0))).toBe(1);
  });

  it("never hands out a duplicate sequence to concurrent writers", async () => {
    const store = factory();
    const seqs = await Promise.all(
      Array.from({ length: 20 }, (_, i) => store.appendWithSequence(makeEvent("run_par", 0, `evt_${i}`))),
    );
    expect(new Set(seqs).size).toBe(20);
    expect([...seqs].sort((x, y) => x - y)).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });
});

describe("NullRunEventStore non-persisted events", () => {
  it("does not advance the sequence for persist:false events", async () => {
    const store = new NullRunEventStore();
    const seq = await store.appendWithSequence({ ...makeEvent("run_x", 0), persist: false });
    expect(seq).toBe(0);
    expect(await store.getNextSequence("run_x")).toBe(0);
  });
});
