import { describe, expect, it } from "vitest";
import { findActiveSessionIds, restoreRunFromStore, loadSessionHistory } from "../src/durable-reload.js";
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

describe("loadSessionHistory", () => {
  function msg(id: string, role: string, content: string, toolCallId?: string): Message {
    return {
      id: id as Message["id"],
      sessionId: "sess-hist" as Message["sessionId"],
      role,
      content,
      ...(toolCallId ? { toolCallId } : {}),
      createdAt: "2026-10-03T00:00:00.000Z",
    };
  }

  function storeWith(messages: Message[]): SessionStore {
    return {
      async listMessages() { return messages; },
    } as unknown as SessionStore;
  }

  it("returns an empty transcript when no store is provided", async () => {
    expect(await loadSessionHistory(undefined, "sess-hist")).toEqual([]);
  });

  it("collapses to the last compaction marker and maps rows to ChatMessage", async () => {
    const messages = [
      msg("m-1", "user", "old prompt"),
      msg("m-2", "system", `${COMPACTION_SUMMARY_PREFIX}Compressed context.`),
      msg("m-3", "user", "recent prompt"),
      msg("m-4", "assistant", "recent reply"),
    ];

    const history = await loadSessionHistory(storeWith(messages), "sess-hist");
    expect(history.map((m) => [m.role, m.content])).toEqual([
      ["system", "Compressed context."],
      ["user", "recent prompt"],
      ["assistant", "recent reply"],
    ]);
  });

  it("keeps toolCallId so tool rows stay valid in the transcript", async () => {
    // P1.2: a tool row is only valid behind a declaration — pair it up.
    const assistant: Message = {
      id: "m-0" as Message["id"],
      sessionId: "sess-hist" as Message["sessionId"],
      role: "assistant",
      content: "running the check",
      toolCalls: [{ id: "call-1", name: "shell", args: { command: "echo hi" } }],
      createdAt: "2026-10-03T00:00:00.000Z",
    };
    const history = await loadSessionHistory(
      storeWith([assistant, msg("m-1", "tool", "tool output", "call-1")]),
      "sess-hist",
    );
    expect(history).toEqual([
      {
        role: "assistant",
        content: "running the check",
        toolCalls: [{ id: "call-1", name: "shell", args: { command: "echo hi" } }],
      },
      { role: "tool", content: "tool output", toolCallId: "call-1" },
    ]);
  });
});

describe("loadSessionHistory — P1.2 tool pairing repair", () => {
  function row(id: string, role: string, content: string, extra?: Partial<Message>): Message {
    return {
      id: id as Message["id"],
      sessionId: "sess-pair" as Message["sessionId"],
      role,
      content,
      createdAt: "2026-10-08T00:00:00.000Z",
      ...extra,
    };
  }

  function storeWith(messages: Message[]): SessionStore {
    return { async listMessages() { return messages; } } as unknown as SessionStore;
  }

  it("drops orphan tool rows with no preceding assistant declaration", async () => {
    const history = await loadSessionHistory(
      storeWith([
        row("m-1", "user", "do something"),
        row("m-2", "tool", "dangling output", { toolCallId: "ghost" }),
        row("m-3", "assistant", "reply"),
      ]),
      "sess-pair",
    );
    expect(history.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("drops duplicate tool results for the same call id", async () => {
    const history = await loadSessionHistory(
      storeWith([
        row("m-1", "assistant", "", { toolCalls: [{ id: "c1", name: "shell", args: {} }] }),
        row("m-2", "tool", "first", { toolCallId: "c1" }),
        row("m-3", "tool", "second", { toolCallId: "c1" }),
      ]),
      "sess-pair",
    );
    expect(history).toHaveLength(2);
    expect((history[1] as { content: string }).content).toBe("first");
  });

  it("strips dangling toolCalls that never got a result, keeping the text", async () => {
    const history = await loadSessionHistory(
      storeWith([
        row("m-1", "assistant", "I called a tool but lost the result", {
          toolCalls: [{ id: "lost", name: "shell", args: {} }],
        }),
      ]),
      "sess-pair",
    );
    expect(history).toEqual([
      { role: "assistant", content: "I called a tool but lost the result" },
    ]);
  });

  it("drops an assistant row left with neither text nor tool calls", async () => {
    const history = await loadSessionHistory(
      storeWith([
        row("m-1", "assistant", "", {
          toolCalls: [{ id: "lost", name: "shell", args: {} }],
        }),
        row("m-2", "user", "next prompt"),
      ]),
      "sess-pair",
    );
    expect(history.map((m) => m.role)).toEqual(["user"]);
  });

  it("repairs a mixed transcript: valid pairs kept, orphans removed", async () => {
    const history = await loadSessionHistory(
      storeWith([
        row("m-1", "user", "check the file"),
        row("m-2", "assistant", "checking", {
          toolCalls: [{ id: "ok", name: "read_file", args: { path: "a.ts" } }],
        }),
        row("m-3", "tool", "file contents", { toolCallId: "ok" }),
        row("m-4", "tool", "orphan", { toolCallId: "never-declared" }),
        row("m-5", "assistant", "done"),
      ]),
      "sess-pair",
    );
    expect(history.map((m) => [m.role, m.content])).toEqual([
      ["user", "check the file"],
      ["assistant", "checking"],
      ["tool", "file contents"],
      ["assistant", "done"],
    ]);
  });
});

describe("loadSessionHistory — P1.2 content round-trip", () => {
  function row(id: string, role: string, content: string, extra?: Partial<Message>): Message {
    return {
      id: id as Message["id"],
      sessionId: "sess-blocks" as Message["sessionId"],
      role,
      content,
      createdAt: "2026-10-08T00:00:00.000Z",
      ...extra,
    };
  }

  function storeWith(messages: Message[]): SessionStore {
    return { async listMessages() { return messages; } } as unknown as SessionStore;
  }

  it("restores assistant toolCalls into the ChatMessage", async () => {
    const history = await loadSessionHistory(
      storeWith([
        row("m-1", "assistant", "let me run that", {
          toolCalls: [{ id: "c1", name: "shell", args: { command: "ls" } }],
        }),
        row("m-2", "tool", "file.txt", { toolCallId: "c1" }),
      ]),
      "sess-blocks",
    );
    const assistant = history[0] as { toolCalls?: readonly { id: string; name: string; args: unknown }[] };
    expect(assistant.toolCalls).toEqual([{ id: "c1", name: "shell", args: { command: "ls" } }]);
  });

  it("reconstructs content from contentBlocks when the text lives in a block", async () => {
    const blocks = [
      { type: "text" as const, text: "look at this" },
      { type: "image_url" as const, image_url: { url: "data:image/png;base64,AAA" } },
    ];
    const history = await loadSessionHistory(
      storeWith([row("m-1", "user", "look at this", { contentBlocks: blocks })]),
      "sess-blocks",
    );
    expect(history[0]!.content).toEqual(blocks);
  });

  it("appends the text column as a part when blocks carry no text", async () => {
    const blocks = [{ type: "image_url" as const, image_url: { url: "data:image/png;base64,BBB" } }];
    const history = await loadSessionHistory(
      storeWith([row("m-1", "user", "what is this?", { contentBlocks: blocks })]),
      "sess-blocks",
    );
    expect(history[0]!.content).toEqual([
      { type: "image_url", image_url: { url: "data:image/png;base64,BBB" } },
      { type: "text", text: "what is this?" },
    ]);
  });
});

describe("loadSessionHistory — P4.1 historyLimit", () => {
  function row(id: string, role: string, content: string, extra?: Partial<Message>): Message {
    return {
      id: id as Message["id"],
      sessionId: "sess-limit" as Message["sessionId"],
      role,
      content,
      createdAt: "2026-10-09T00:00:00.000Z",
      ...extra,
    };
  }

  function storeWith(messages: Message[]): SessionStore {
    return { async listMessages() { return messages; } } as unknown as SessionStore;
  }

  it("keeps only the last N messages when limit is set (no store deletion)", async () => {
    const messages = Array.from({ length: 30 }, (_, i) =>
      row(`m-${i + 1}`, i % 2 === 0 ? "user" : "assistant", `message ${i + 1}`),
    );
    const history = await loadSessionHistory(storeWith(messages), "sess-limit", { limit: 20 });
    expect(history).toHaveLength(20);
    expect(history[0]!.content).toBe("message 11");
    expect(history[19]!.content).toBe("message 30");
  });

  it("loads the full transcript when limit is 0 or omitted", async () => {
    const messages = [row("m-1", "user", "a"), row("m-2", "assistant", "b")];
    expect(await loadSessionHistory(storeWith(messages), "sess-limit")).toHaveLength(2);
    expect(await loadSessionHistory(storeWith(messages), "sess-limit", { limit: 0 })).toHaveLength(2);
  });

  it("leaves transcripts shorter than the limit untouched", async () => {
    const messages = [row("m-1", "user", "only")];
    const history = await loadSessionHistory(storeWith(messages), "sess-limit", { limit: 20 });
    expect(history).toEqual([{ role: "user", content: "only" }]);
  });

  it("drops tool rows orphaned by the window cut (pairs repaired after slicing)", async () => {
    const messages = [
      row("m-1", "assistant", "first call", { toolCalls: [{ id: "c1", name: "shell", args: {} }] }),
      row("m-2", "tool", "first result", { toolCallId: "c1" }),
      row("m-3", "user", "next"),
    ];
    // limit=2 cuts between the declaration and its result — the orphaned tool
    // row must be dropped so providers never reject the transcript.
    const history = await loadSessionHistory(storeWith(messages), "sess-limit", { limit: 2 });
    expect(history.map((m) => m.role)).toEqual(["user"]);
  });

  it("applies the limit AFTER compaction collapse, not before", async () => {
    const messages = [
      row("m-1", "user", "ancient prompt"),
      row("m-2", "assistant", "ancient reply"),
      row("m-3", "system", `${COMPACTION_SUMMARY_PREFIX}Compressed.`),
      row("m-4", "user", "recent"),
      row("m-5", "assistant", "reply"),
    ];
    // Collapse yields 3 rows [summary, recent, reply]; limit=2 trims to the
    // last 2 — the summary marker is the cut point, never dropped mid-window.
    const history = await loadSessionHistory(storeWith(messages), "sess-limit", { limit: 2 });
    expect(history.map((m) => [m.role, m.content])).toEqual([
      ["user", "recent"],
      ["assistant", "reply"],
    ]);
    // Without the cut the summary stays at the head.
    const full = await loadSessionHistory(storeWith(messages), "sess-limit", { limit: 3 });
    expect(full.map((m) => m.role)).toEqual(["system", "user", "assistant"]);
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