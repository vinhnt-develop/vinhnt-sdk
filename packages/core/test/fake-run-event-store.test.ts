import { describe, expect, it } from "vitest";
import type { RunEvent, RunId, TraceId } from "@vinhnt-sdk/schema";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";

function makeEvent(overrides: Partial<RunEvent> = {}): RunEvent {
  return {
    id: "evt_001",
    runId: "run_abc" as RunId,
    sequence: 1,
    type: "run.started",
    occurredAt: "2026-07-16T00:00:00.000Z",
    traceId: "trace_xyz" as TraceId,
    data: { prompt: "Hello" },
    ...overrides,
  };
}

describe("FakeRunEventStore", () => {
  it("appends events normally", async () => {
    const store = new FakeRunEventStore();
    const event = makeEvent();
    await store.append(event);
    const events = await store.list("run_abc");
    expect(events).toHaveLength(1);
    expect(events[0]!.id).toBe("evt_001");
  });

  it("idempotent: duplicate append is skipped", async () => {
    const store = new FakeRunEventStore();
    const event = makeEvent();
    await store.append(event);
    await store.append(event); // duplicate
    const events = await store.list("run_abc");
    expect(events).toHaveLength(1);
  });

  it("idempotent: different IDs are not skipped", async () => {
    const store = new FakeRunEventStore();
    await store.append(makeEvent({ id: "evt_001" }));
    await store.append(makeEvent({ id: "evt_002", sequence: 2 }));
    const events = await store.list("run_abc");
    expect(events).toHaveLength(2);
  });

  it("exists() returns true for stored events", async () => {
    const store = new FakeRunEventStore();
    expect(await store.exists("evt_001")).toBe(false);
    await store.append(makeEvent());
    expect(await store.exists("evt_001")).toBe(true);
    expect(await store.exists("evt_999")).toBe(false);
  });

  it("ephemeral events (persist=false) are not stored but notify listeners", async () => {
    const store = new FakeRunEventStore();
    const received: RunEvent[] = [];
    store.subscribe((e) => received.push(e));
    const ephemeral = makeEvent({ id: "eph_001", persist: false });
    await store.append(ephemeral);
    expect(await store.list("run_abc")).toHaveLength(0);
    expect(received).toHaveLength(1);
    expect(received[0]!.id).toBe("eph_001");
  });

  it("ephemeral duplicate is NOT idempotent (re-notifies)", async () => {
    const store = new FakeRunEventStore();
    const received: RunEvent[] = [];
    store.subscribe((e) => received.push(e));
    const ephemeral = makeEvent({ id: "eph_001", persist: false });
    await store.append(ephemeral);
    await store.append(ephemeral);
    expect(received).toHaveLength(2); // ephemeral events re-notify
  });

  it("appendWithSequence assigns unique monotonically increasing sequences atomically", async () => {
    const store = new FakeRunEventStore();
    const seq1 = await store.appendWithSequence(makeEvent({ id: "evt_001", sequence: 0 }));
    const seq2 = await store.appendWithSequence(makeEvent({ id: "evt_002", sequence: 0 }));
    const seq3 = await store.appendWithSequence(makeEvent({ id: "evt_003", sequence: 0 }));

    expect(seq1).toBe(1);
    expect(seq2).toBe(2);
    expect(seq3).toBe(3);

    const events = await store.list("run_abc");
    expect(events.map((e) => e.sequence)).toEqual([1, 2, 3]);
  });

  it("appendWithSequence under concurrent calls never produces duplicate sequences", async () => {
    const store = new FakeRunEventStore();
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => store.appendWithSequence(makeEvent({ id: `evt_${i}`, sequence: 0 }))),
    );
    const unique = new Set(results);
    expect(unique.size).toBe(20);
    expect(results.sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
});
