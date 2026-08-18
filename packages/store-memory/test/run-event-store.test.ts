import { describe, expect, it, vi } from "vitest";
import type { RunEvent, RunId } from "@vinhnt-sdk/schema";
import { InMemoryRunEventStore, InMemorySessionStore } from "../src/index.js";

const runId = "run-1" as RunId;

function makeEvent(partial: Partial<RunEvent> = {}): RunEvent {
  return {
    id: `evt-${partial.sequence ?? Math.random()}`,
    runId,
    sequence: partial.sequence ?? 1,
    type: "test.event",
    occurredAt: new Date().toISOString(),
    traceId: "trace-1",
    data: { hello: "world" },
    ...partial,
  };
}

describe("InMemoryRunEventStore", () => {
  it("appends and lists events for a run", async () => {
    const store = new InMemoryRunEventStore();
    await store.append(makeEvent({ sequence: 1, id: "e1" }));
    await store.append(makeEvent({ sequence: 2, id: "e2" }));

    const events = await store.list(runId);
    expect(events.map((e) => e.id)).toEqual(["e1", "e2"]);
  });

  it("lists events after a sequence", async () => {
    const store = new InMemoryRunEventStore();
    await store.append(makeEvent({ sequence: 1, id: "e1" }));
    await store.append(makeEvent({ sequence: 2, id: "e2" }));
    await store.append(makeEvent({ sequence: 3, id: "e3" }));

    const events = await store.list(runId, 1);
    expect(events.map((e) => e.id)).toEqual(["e2", "e3"]);
  });

  it("is idempotent on append by event id", async () => {
    const store = new InMemoryRunEventStore();
    const event = makeEvent({ sequence: 1, id: "dup" });
    await store.append(event);
    await store.append(event);

    const events = await store.list(runId);
    expect(events).toHaveLength(1);
  });

  it("broadcasts persist=false events without storing them", async () => {
    const store = new InMemoryRunEventStore();
    const listener = vi.fn();
    store.subscribe(listener);

    await store.append(makeEvent({ id: "live", persist: false }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(await store.list(runId)).toHaveLength(0);
  });

  it("allocates sequences atomically with appendWithSequence", async () => {
    const store = new InMemoryRunEventStore();
    const seq1 = await store.appendWithSequence(makeEvent({ id: "a" }));
    const seq2 = await store.appendWithSequence(makeEvent({ id: "b" }));

    expect(seq1).toBe(1);
    expect(seq2).toBe(2);
    const events = await store.list(runId);
    expect(events.map((e) => e.sequence)).toEqual([1, 2]);
  });

  it("never assigns duplicate sequences under concurrency (RV-30)", async () => {
    const store = new InMemoryRunEventStore();
    const results = await Promise.all([
      store.appendWithSequence(makeEvent({ id: "c1" })),
      store.appendWithSequence(makeEvent({ id: "c2" })),
      store.appendWithSequence(makeEvent({ id: "c3" })),
      store.appendWithSequence(makeEvent({ id: "c4" })),
    ]);

    expect(new Set(results).size).toBe(4);
    expect([...results].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  it("returns existing sequence for duplicate appendWithSequence", async () => {
    const store = new InMemoryRunEventStore();
    const event = makeEvent({ id: "dup" });
    await store.appendWithSequence(event);
    const seq = await store.appendWithSequence(event);
    expect(seq).toBe(1);
  });

  it("getNextSequence returns max+1", async () => {
    const store = new InMemoryRunEventStore();
    await store.append(makeEvent({ sequence: 5, id: "e1" }));
    await store.append(makeEvent({ sequence: 9, id: "e2" }));
    expect(await store.getNextSequence(runId)).toBe(10);
  });

  it("saves and loads the latest snapshot", async () => {
    const store = new InMemoryRunEventStore();
    await store.append(makeEvent({ sequence: 1, id: "e1" }));
    await store.saveSnapshot(runId, { step: 1 });
    await store.saveSnapshot(runId, { step: 2 });

    const snapshot = await store.getSnapshot(runId);
    expect(snapshot?.state).toEqual({ step: 2 });
    expect(snapshot?.sequence).toBe(1);
  });

  it("getSnapshotAfterSequence finds the latest snapshot at or below a sequence", async () => {
    const store = new InMemoryRunEventStore();
    await store.append(makeEvent({ sequence: 1, id: "s1" }));
    await store.saveSnapshot(runId, { step: 1 });
    await store.append(makeEvent({ sequence: 2, id: "s2" }));
    await store.saveSnapshot(runId, { step: 2 });

    expect(await store.getSnapshotAfterSequence(runId, 0)).toBeNull();
    const snap = await store.getSnapshotAfterSequence(runId, 2);
    expect(snap?.state).toEqual({ step: 2 });
    const older = await store.getSnapshotAfterSequence(runId, 1);
    expect(older?.state).toEqual({ step: 1 });
  });

  it("returns null when no snapshot exists", async () => {
    const store = new InMemoryRunEventStore();
    expect(await store.getSnapshot(runId)).toBeNull();
  });

  it("applies session updates in appendTransactional", async () => {
    const sessions = new InMemorySessionStore();
    const session = await sessions.createSession("Initial");
    const store = new InMemoryRunEventStore(sessions);

    await store.appendTransactional(
      makeEvent({ id: "tx" }),
      { sessionId: session.id, updates: { title: "Updated" } },
    );

    const updated = await sessions.getSession(session.id);
    expect(updated?.title).toBe("Updated");
  });

  it("subscribe returns an unsubscribe function", async () => {
    const store = new InMemoryRunEventStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    await store.append(makeEvent({ id: "e1" }));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await store.append(makeEvent({ id: "e2" }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
