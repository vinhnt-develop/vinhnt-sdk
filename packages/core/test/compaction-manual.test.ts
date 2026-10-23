import { describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "../src/model.js";
import type { RequestContext, RequestId, RunId, TraceId } from "@vinhnt-sdk/schema";
import type { SessionStore } from "@vinhnt-sdk/session";
import { InMemorySessionState } from "@vinhnt-sdk/session";
import { AgentKernel } from "../src/kernel/kernel.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeTool } from "../src/fakes/fake-tool.js";

const testCtx: RequestContext = {
  requestId: "req_compaction" as RequestId,
  traceId: "trace_compaction" as TraceId,
  actorId: "test",
  tenantId: "default",
};

function msg(role: ChatMessage["role"], content: string): ChatMessage {
  return { role, content };
}

function makeSessionStore(messages: Array<{ role: string; content: string }>): SessionStore {
  return {
    async createSession() { return { id: "s1", title: "t", createdAt: "", updatedAt: "", isActive: true }; },
    async getSession() { return null; },
    async listSessions() { return []; },
    async updateSession() {},
    async deleteSession() {},
    async addMessage(_sid: string, roleOrMsg: string | { role: string; content: string }, maybeContent?: string) {
      const role = typeof roleOrMsg === "string" ? roleOrMsg : roleOrMsg.role;
      const content = typeof roleOrMsg === "string" ? (maybeContent ?? "") : roleOrMsg.content;
      messages.push({ role, content });
    },
    async forkSession() { return { id: "s-fork", title: "t", createdAt: "", updatedAt: "", isActive: true }; },
    async listMessages() { return []; },
    async searchMessages() { return []; },
    async getSessionStats() {
      return { totalSessions: 0, totalCost: 0, totalInputTokens: 0, totalOutputTokens: 0, totalMessages: 0, sessionsByDate: [], costByModel: [] };
    },
  } as unknown as SessionStore;
}

function makeCompactor(result?: (msgs: readonly ChatMessage[]) => ChatMessage[]) {
  return {
    compact: vi.fn(async (msgs: readonly ChatMessage[]) => ({
      messages: result ? result(msgs) : msgs.slice(0, 1),
      summary: {
        originalMessageCount: msgs.length,
        compressedMessageCount: result ? result(msgs).length : Math.min(1, msgs.length),
        summary: "short summary",
      },
    })),
  };
}

describe("AgentKernel.runCompaction", () => {
  it("compacts the idle kernel state when forced", async () => {
    const state = new InMemorySessionState();
    state.pushMessage(msg("system", "system"));
    state.pushMessage(msg("user", "hello"));
    const persisted: Array<{ role: string; content: string }> = [];
    const compactor = makeCompactor();

    const kernel = new AgentKernel({
      model: new FakeModelProvider([{ content: "unused" }]),
      store: new FakeRunEventStore(),
      sessionState: state,
      sessionStore: makeSessionStore(persisted),
      compactor: compactor as never,
    });

    const result = await kernel.runCompaction({ force: true, sessionId: "s1" });

    expect(result).toMatchObject({ status: "compacted", originalCount: 2, compressedCount: 1 });
    expect(state.messages).toHaveLength(1);
    expect(compactor.compact).toHaveBeenCalledTimes(1);
    expect(persisted).toEqual([
      { role: "system", content: expect.stringContaining("[vnt-compaction-summary]") },
    ]);
  });

  it("skips below the threshold unless forced", async () => {
    const state = new InMemorySessionState();
    state.pushMessage(msg("user", "hello"));
    const compactor = makeCompactor();

    const kernel = new AgentKernel({
      model: new FakeModelProvider([{ content: "unused" }]),
      store: new FakeRunEventStore(),
      sessionState: state,
      compactor: compactor as never,
    });

    const result = await kernel.runCompaction();

    expect(result).toMatchObject({ status: "skipped", reason: "below_threshold" });
    expect(compactor.compact).not.toHaveBeenCalled();
  });

  it("discards a compaction result when the state generation changed", async () => {
    const state = new InMemorySessionState();
    state.pushMessage(msg("user", "hello"));
    state.pushMessage(msg("assistant", "hi"));

    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let started!: () => void;
    const entered = new Promise<void>((resolve) => { started = resolve; });
    const compactor = {
      compact: vi.fn(async (msgs: readonly ChatMessage[]) => {
        started();
        await gate;
        return {
          messages: msgs.slice(0, 1),
          summary: { originalMessageCount: msgs.length, compressedMessageCount: 1 },
        };
      }),
    };

    const kernel = new AgentKernel({
      model: new FakeModelProvider([{ content: "unused" }]),
      store: new FakeRunEventStore(),
      sessionState: state,
      compactor: compactor as never,
    });

    const pending = kernel.runCompaction({ force: true });
    await entered;
    state.pushMessage(msg("user", "concurrent turn"));
    release();

    await expect(pending).resolves.toMatchObject({ status: "stale", reason: "stale_generation" });
    expect(state.messages).toHaveLength(3);
  });

  it("queues an active-run request and applies it at the next step boundary", async () => {
    const echo = new FakeTool("echo", async (input) => input);
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "call-1", name: "echo", args: { text: "first" } }] },
      { content: "Final answer" },
    ]);
    const store = new FakeRunEventStore();
    const persisted: Array<{ role: string; content: string }> = [];
    const compactor = makeCompactor();
    const state = new InMemorySessionState();
    state.pushMessage(msg("user", "history"));

    const kernel = new AgentKernel({
      model,
      store,
      tools: [echo],
      maxSteps: 5,
      sessionState: state,
      sessionStore: makeSessionStore(persisted),
      compactor: compactor as never,
    });

    const handle = kernel.run("Hello", testCtx, "s1");
    const queued = await kernel.runCompaction({ runId: handle.runId, force: true });
    expect(queued.status).toBe("queued");

    await handle.completed;

    expect(compactor.compact).toHaveBeenCalledTimes(1);
    const events = await store.list(handle.runId);
    const compressed = events.find((event) => event.type === "context.compressed");
    expect((compressed?.data as { trigger?: string } | undefined)?.trigger).toBe("manual");
    expect(persisted.some((row) => row.content.includes("[vnt-compaction-summary]"))).toBe(true);
  });

  it("returns no_state for an unknown run id and never compacts another state", async () => {
    const state = new InMemorySessionState();
    state.pushMessage(msg("user", "hello"));
    const compactor = makeCompactor();

    const kernel = new AgentKernel({
      model: new FakeModelProvider([{ content: "unused" }]),
      store: new FakeRunEventStore(),
      sessionState: state,
      compactor: compactor as never,
    });

    const result = await kernel.runCompaction({ runId: "missing" as RunId, force: true });

    expect(result.status).toBe("no_state");
    expect(compactor.compact).not.toHaveBeenCalled();
    expect(state.messages).toHaveLength(1);
  });
});
