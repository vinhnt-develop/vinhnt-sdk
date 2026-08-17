import { describe, expect, it, vi, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
import type { RunEvent, RunId } from "@vinhnt-sdk/schema";
import { DrizzleRunEventStore, DrizzleSessionStore } from "../src/index.js";

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

const dbs: string[] = [];
function tempDb(): string {
  const p = join(tmpdir(), `store-drizzle-${crypto.randomUUID()}.db`);
  dbs.push(p);
  return p;
}

afterEach(() => {
  for (const p of dbs.splice(0)) {
    try {
      rmSync(`${p}-wal`, { force: true });
      rmSync(`${p}-shm`, { force: true });
      rmSync(p, { force: true });
    } catch {
      // ignore cleanup errors
    }
  }
});

describe("DrizzleRunEventStore", () => {
  it("appends and lists events for a run", async () => {
    const store = new DrizzleRunEventStore(tempDb());
    await store.append(makeEvent({ sequence: 1, id: "e1" }));
    await store.append(makeEvent({ sequence: 2, id: "e2" }));

    const events = await store.list(runId);
    expect(events.map((e) => e.id)).toEqual(["e1", "e2"]);
  });

  it("lists events after a sequence", async () => {
    const store = new DrizzleRunEventStore(tempDb());
    await store.append(makeEvent({ sequence: 1, id: "e1" }));
    await store.append(makeEvent({ sequence: 2, id: "e2" }));
    await store.append(makeEvent({ sequence: 3, id: "e3" }));

    const events = await store.list(runId, 1);
    expect(events.map((e) => e.id)).toEqual(["e2", "e3"]);
  });

  it("is idempotent on append by event id", async () => {
    const store = new DrizzleRunEventStore(tempDb());
    const event = makeEvent({ sequence: 1, id: "dup" });
    await store.append(event);
    await store.append(event);

    expect(await store.exists("dup")).toBe(true);
    expect(await store.list(runId)).toHaveLength(1);
  });

  it("broadcasts persist=false events without storing them", async () => {
    const store = new DrizzleRunEventStore(tempDb());
    const listener = vi.fn();
    store.subscribe(listener);

    await store.append(makeEvent({ id: "live", persist: false }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(await store.list(runId)).toHaveLength(0);
  });

  it("allocates sequences with appendWithSequence", async () => {
    const store = new DrizzleRunEventStore(tempDb());
    const seq1 = await store.appendWithSequence(makeEvent({ id: "a" }));
    const seq2 = await store.appendWithSequence(makeEvent({ id: "b" }));

    expect(seq1).toBe(1);
    expect(seq2).toBe(2);
  });

  it("tracks next sequence per aggregate", async () => {
    const store = new DrizzleRunEventStore(tempDb());
    await store.append(makeEvent({ sequence: 3, id: "e1" }));
    expect(await store.getNextSequence(runId)).toBe(4);
  });

  it("saves and loads the latest snapshot", async () => {
    const store = new DrizzleRunEventStore(tempDb());
    await store.append(makeEvent({ sequence: 1, id: "e1" }));
    await store.saveSnapshot(runId, { step: 1 });
    await store.saveSnapshot(runId, { step: 2 });

    const snapshot = await store.getSnapshot(runId);
    expect(snapshot?.state).toEqual({ step: 2 });
    expect(snapshot?.sequence).toBe(1);
  });

  it("getSnapshotAfterSequence finds the latest snapshot at or below a sequence", async () => {
    const store = new DrizzleRunEventStore(tempDb());
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
    const store = new DrizzleRunEventStore(tempDb());
    expect(await store.getSnapshot(runId)).toBeNull();
  });

  it("applies session updates in appendTransactional", async () => {
    const dbPath = tempDb();
    const sessions = new DrizzleSessionStore(dbPath);
    const session = await sessions.createSession("Initial");
    const store = new DrizzleRunEventStore(dbPath);

    await store.appendTransactional(
      makeEvent({ id: "tx" }),
      { sessionId: session.id, updates: { title: "Updated" } },
    );

    const updated = await sessions.getSession(session.id);
    expect(updated?.title).toBe("Updated");
  });
});