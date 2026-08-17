import { describe, expect, it } from "vitest";
import type { RunEvent, Message } from "@vinhnt-sdk/schema";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { restoreRunFromStore, InMemorySessionState } from "@vinhnt-sdk/session";

function makeEvent(overrides: Partial<RunEvent> = {}): RunEvent {
  return {
    id: "evt_001",
    runId: "run_abc",
    sequence: 1,
    type: "run.started",
    occurredAt: "2026-07-16T00:00:00.000Z",
    traceId: "trace_xyz",
    data: { prompt: "Hello" },
    ...overrides,
  };
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg_001" as Message["id"],
    sessionId: "session_001" as Message["sessionId"],
    role: "user",
    content: "Hello",
    createdAt: "2026-07-16T00:00:00.000Z",
    ...overrides,
  };
}

/** Minimal SessionStore mock for testing */
function createMockSessionStore(messages: Message[] = []) {
  return {
    listMessages: async () => messages,
    createSession: async () => ({ id: "session_001", title: "Test", createdAt: "", updatedAt: "" }),
    getSession: async () => null,
    listSessions: async () => [],
    updateSession: async () => {},
    deleteSession: async () => {},
    addMessage: async () => messages[0] ?? makeMessage(),
    forkSession: async () => ({ id: "session_002", title: "Fork", createdAt: "", updatedAt: "" }),
    searchMessages: async () => [],
    getSessionStats: async () => ({ totalSessions: 0, totalCost: 0, totalInputTokens: 0, totalOutputTokens: 0, totalMessages: 0, sessionsByDate: [], costByModel: [] }),
  };
}

describe("restoreRunFromStore", () => {
  it("returns null when no events exist for runId", async () => {
    const store = new FakeRunEventStore();
    const result = await restoreRunFromStore(store, undefined, "run_nonexistent" as never);
    expect(result).toBeNull();
  });

  it("restores basic run state from snapshot", async () => {
    const store = new FakeRunEventStore();
    await store.append(makeEvent({ id: "evt_001", type: "run.started", data: { prompt: "Hello" } }));
    await store.saveSnapshot("run_abc" as never, {
      step: 3,
      totalInputTokens: 1000,
      totalOutputTokens: 500,
      model: "gpt-4o",
      sessionId: "session_001",
    });

    const result = await restoreRunFromStore(store, undefined, "run_abc" as never);
    expect(result).not.toBeNull();
    expect(result!.step).toBe(3);
    expect(result!.totalInputTokens).toBe(1000);
    expect(result!.totalOutputTokens).toBe(500);
    expect(result!.model).toBe("gpt-4o");
    expect(result!.sessionId).toBe("session_001");
  });

  it("restores messages from SessionStore", async () => {
    const store = new FakeRunEventStore();
    await store.append(makeEvent({ id: "evt_001", type: "run.started", data: { prompt: "Hello" } }));
    await store.saveSnapshot("run_abc" as never, {
      step: 1,
      sessionId: "session_001",
    });

    const messages = [
      makeMessage({ role: "user", content: "Hello" }),
      makeMessage({ id: "msg_002" as Message["id"], role: "assistant", content: "Hi there!" }),
    ];
    const sessionStore = createMockSessionStore(messages);

    const result = await restoreRunFromStore(store, sessionStore as never, "run_abc" as never);
    expect(result).not.toBeNull();
    expect(result!.sessionState.messages).toHaveLength(2);
    expect(result!.sessionState.messages[0].role).toBe("user");
    expect(result!.sessionState.messages[0].content).toBe("Hello");
    expect(result!.sessionState.messages[1].role).toBe("assistant");
    expect(result!.sessionState.messages[1].content).toBe("Hi there!");
  });

  it("restores step count from snapshot", async () => {
    const store = new FakeRunEventStore();
    await store.append(makeEvent({ id: "evt_001", type: "run.started", data: {} }));
    await store.saveSnapshot("run_abc" as never, { step: 5 });

    const result = await restoreRunFromStore(store, undefined, "run_abc" as never);
    expect(result!.step).toBe(5);
    expect(result!.sessionState.step).toBe(5);
  });

  it("returns defaults when no snapshot exists", async () => {
    const store = new FakeRunEventStore();
    await store.append(makeEvent({ id: "evt_001", type: "run.started", data: {} }));

    const result = await restoreRunFromStore(store, undefined, "run_abc" as never);
    expect(result).not.toBeNull();
    expect(result!.step).toBe(0);
    expect(result!.totalInputTokens).toBe(0);
    expect(result!.totalOutputTokens).toBe(0);
    expect(result!.model).toBeUndefined();
    expect(result!.finalOutput).toBeUndefined();
  });

  it("creates a fresh SessionRuntimeState", async () => {
    const store = new FakeRunEventStore();
    await store.append(makeEvent({ id: "evt_001", type: "run.started", data: {} }));

    const result = await restoreRunFromStore(store, undefined, "run_abc" as never);
    expect(result!.sessionState).toBeInstanceOf(InMemorySessionState);
    expect(result!.sessionState.isRunning).toBe(false);
    expect(result!.sessionState.messages).toEqual([]);
  });
});
