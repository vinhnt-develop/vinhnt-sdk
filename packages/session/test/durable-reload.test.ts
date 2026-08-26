import { describe, expect, it } from "vitest";
import { findActiveSessionIds, restoreRunFromStore } from "../src/durable-reload.js";
import { NullRunEventStore, NullSessionStore } from "../src/null-store.js";
import { COMPACTION_SUMMARY_PREFIX } from "@vinhnt-sdk/schema";
import type { RunEvent, RunId, SessionId, Message } from "@vinhnt-sdk/schema";
import type { RunEventStore, SessionStore } from "../src/store.js";

function startedEvent(runId: string, sessionId: string, sequence: number): RunEvent {
  return {
    id: `evt-${runId}-${sequence}`,
    runId,
    type: "run.started",
    occurredAt: new Date().toISOString(),
    sequence,
    data: { sessionId, prompt: "test" },
  } as RunEvent;
}

function completedEvent(runId: string, sequence: number): RunEvent {
  return {
    id: `evt-${runId}-${sequence}`,
    runId,
    type: "run.completed",
    occurredAt: new Date().toISOString(),
    sequence,
    data: { status: "succeeded" },
  } as RunEvent;
}

describe("findActiveSessionIds", () => {
  it("returns session ids for runs that started but never completed (RV-34)", async () => {
    const store = new PersistingStore();
    const aid = "sess-active" as SessionId;
    await store.appendWithSequence(startedEvent("run-1", aid, 1));

    const active = await findActiveSessionIds(store);
    expect(active).toEqual([aid]);
  });

  it("excludes runs that have a run.completed event", async () => {
    const store = new PersistingStore();
    const aid = "sess-done" as SessionId;
    await store.appendWithSequence(startedEvent("run-1", aid, 1));
    await store.appendWithSequence(startedEvent("run-2", aid, 1));
    await store.appendWithSequence(completedEvent("run-2", 2));

    const active = await findActiveSessionIds(store);
    expect(active).toEqual([aid]);
  });

  it("excludes runs that never emitted run.started", async () => {
    const store = new PersistingStore();
    await store.appendWithSequence(completedEvent("run-1", 1));

    const active = await findActiveSessionIds(store);
    expect(active).toEqual([]);
  });

  it("excludes runs whose snapshot carries a terminal status", async () => {
    const store = new PersistingStore();
    const aid = "sess-gone" as SessionId;
    await store.appendWithSequence(startedEvent("run-1", aid, 1));
    await store.saveSnapshot("run-1", { sessionId: aid, status: "complete" });

    const active = await findActiveSessionIds(store);
    expect(active).toEqual([]);
  });
});

describe("restoreRunFromStore", () => {
  it("returns null when no events exist for the run", async () => {
    const store = new NullRunEventStore();
    const restored = await restoreRunFromStore(store, new NullSessionStore(), "no-such-run" as RunId);
    expect(restored).toBeNull();
  });
});

describe("durable compaction reload (RV-15)", () => {
  function msg(id: string, role: string, content: string): Message {
    return {
      id: id as Message["id"],
      sessionId: "sess-rv15" as Message["sessionId"],
      role,
      content,
      createdAt: "2026-07-16T00:00:00.000Z",
    };
  }

  function storeWithMessages(messages: Message[]): SessionStore {
    return {
      async listMessages() { return messages; },
      async createSession() { return { id: "sess-rv15" as SessionId, title: "t", createdAt: "", updatedAt: "", isActive: true } as never; },
      async getSession() { return null; },
      async listSessions() { return []; },
      async updateSession() {},
      async deleteSession() {},
      async addMessage(_sid, _role, _content, _toolCallId?, _tokens?, _model?, _cost?, _admittedSeq?) { return messages[0] ?? msg("m-0", "user", ""); },
      async forkSession() { return { id: "sess-f" as SessionId, title: "t", createdAt: "", updatedAt: "", isActive: true } as never; },
      async searchMessages() { return []; },
      async getSessionStats() { return { totalSessions: 0, totalCost: 0, totalInputTokens: 0, totalOutputTokens: 0, totalMessages: 0, sessionsByDate: [], costByModel: [] }; },
    } as SessionStore;
  }

  it("collapses the transcript to the last summary marker on reload", async () => {
    const eventStore = new PersistingStore();
    await eventStore.appendWithSequence(startedEvent("run-compact", "sess-rv15", 1));
    await eventStore.saveSnapshot("run-compact", { sessionId: "sess-rv15", step: 3 });

    const messages = [
      msg("m-1", "user", "first prompt"),
      msg("m-2", "assistant", "first reply"),
      msg("m-3", "system", `${COMPACTION_SUMMARY_PREFIX}Everything before here was compressed.`),
      msg("m-4", "assistant", "post-compaction reply"),
    ];

    const restored = await restoreRunFromStore(eventStore, storeWithMessages(messages), "run-compact" as RunId);
    expect(restored).not.toBeNull();
    const reloaded = restored!.sessionState.messages;
    // Pre-marker messages are subsumed by the summary; the marker becomes the head.
    expect(reloaded).toHaveLength(2);
    expect(reloaded[0]!.role).toBe("system");
    expect(reloaded[0]!.content).toBe("Everything before here was compressed.");
    expect(reloaded[1]!.role).toBe("assistant");
    expect(reloaded[1]!.content).toBe("post-compaction reply");
  });

  it("keeps the full transcript when no compaction marker exists", async () => {
    const eventStore = new PersistingStore();
    await eventStore.appendWithSequence(startedEvent("run-plain", "sess-rv15", 1));
    await eventStore.saveSnapshot("run-plain", { sessionId: "sess-rv15", step: 2 });

    const messages = [
      msg("m-1", "user", "hello"),
      msg("m-2", "assistant", "hi"),
    ];

    const restored = await restoreRunFromStore(eventStore, storeWithMessages(messages), "run-plain" as RunId);
    expect(restored!.sessionState.messages).toHaveLength(2);
    expect(restored!.sessionState.messages.map((m) => m.content)).toEqual(["hello", "hi"]);
  });

  it("keeps the LAST marker when compaction happened multiple times", async () => {
    const eventStore = new PersistingStore();
    await eventStore.appendWithSequence(startedEvent("run-multi", "sess-rv15", 1));
    await eventStore.saveSnapshot("run-multi", { sessionId: "sess-rv15", step: 5 });

    const messages = [
      msg("m-0", "user", "orig"),
      msg("m-1", "system", `${COMPACTION_SUMMARY_PREFIX}First compression.`),
      msg("m-2", "assistant", "mid reply"),
      msg("m-3", "system", `${COMPACTION_SUMMARY_PREFIX}Second compression.`),
      msg("m-4", "assistant", "final reply"),
    ];

    const restored = await restoreRunFromStore(eventStore, storeWithMessages(messages), "run-multi" as RunId);
    const reloaded = restored!.sessionState.messages;
    expect(reloaded).toHaveLength(2);
    expect(reloaded[0]!.content).toBe("Second compression.");
    expect(reloaded[1]!.content).toBe("final reply");
  });
});

/** Minimal in-memory store that actually keeps snapshots (for snapshot-based tests). */
class PersistingStore implements RunEventStore {
  private events: RunEvent[] = [];
  private snapshots = new Map<string, { sequence: number; state: Record<string, unknown>; occurredAt: string }>();

  async append(event: RunEvent): Promise<void> {
    if (event.persist === false) return;
    this.events.push(event);
  }

  async appendWithSequence(event: RunEvent): Promise<number> {
    if (event.persist === false) return 0;
    const seq = this.events.filter((e) => e.runId === event.runId).length + 1;
    await this.append({ ...event, sequence: seq } as RunEvent);
    return seq;
  }

  async list(runId: string): Promise<readonly RunEvent[]> {
    return this.events.filter((e) => e.runId === runId);
  }

  async listRunIds(): Promise<string[]> {
    return [...new Set(this.events.map((e) => e.runId))];
  }

  async saveSnapshot(runId: string, state: Record<string, unknown>): Promise<void> {
    const maxSeq = this.events.filter((e) => e.runId === runId).reduce((m, e) => Math.max(m, e.sequence ?? 0), 0);
    this.snapshots.set(runId, { sequence: maxSeq, state, occurredAt: new Date().toISOString() });
  }

  async getSnapshot(runId: string) {
    const s = this.snapshots.get(runId);
    return s ? { runId, sequence: s.sequence, state: s.state, occurredAt: s.occurredAt } : null;
  }

  async getSnapshotAfterSequence(runId: string, _sequence: number) {
    const s = this.snapshots.get(runId);
    return s ? { runId, sequence: s.sequence, state: s.state, occurredAt: s.occurredAt } : null;
  }

  async getNextSequence(aggregateId: string): Promise<number> {
    return this.events.filter((e) => e.runId === aggregateId).length + 1;
  }

  subscribe(): () => void {
    return () => {};
  }
}