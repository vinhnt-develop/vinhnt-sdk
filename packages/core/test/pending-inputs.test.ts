import { describe, expect, it } from "vitest";
import type { RequestContext, RequestId, TraceId } from "@vinhnt-sdk/schema";
import type { Message, Session, SessionId, MessageId, SessionStore, SessionUpdates } from "@vinhnt-sdk/schema";
import type { ModelProvider, ModelRequest, ModelResponse, ModelStreamEvent, ModelPricing } from "../src/model.js";
import type { ToolDefinition } from "@vinhnt-sdk/tools";
import { AgentKernel } from "../src/kernel/kernel.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";

// ---------------------------------------------------------------------------
// RV-21 — pending user input admission ordering + persistence
// ---------------------------------------------------------------------------

const testCtx: RequestContext = {
  requestId: "test-req-pi-1" as RequestId,
  traceId: "test-trace-pi-1" as TraceId,
  actorId: "test-actor-pi-1",
  tenantId: "test-tenant-pi-1",
};

class TestSessionStore implements SessionStore {
  private session: Session | null = null;
  private messages: Message[] = [];

  async createSession(title = "New Session"): Promise<Session> {
    this.session = { id: "sess-1" as SessionId, title, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isActive: true };
    return this.session;
  }

  async forkSession(): Promise<Session> {
    return { id: "sess-fork" as SessionId, title: "Fork", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isActive: true };
  }

  async getSession(_id: string): Promise<Session | null> {
    return this.session;
  }

  async listSessions(limit = 50): Promise<readonly Session[]> {
    return this.session ? [this.session] : [];
  }

  async updateSession(_id: string, _updates: SessionUpdates): Promise<void> {}

  async deleteSession(): Promise<void> {
    this.session = null;
    this.messages = [];
  }

  async addMessage(
    sessionId: string,
    role: string,
    content: string,
    _toolCallId?: string,
    _tokens?: { input: number; output: number; reasoning?: number },
    _model?: string,
    _cost?: number,
    admittedSeq?: number,
  ): Promise<Message> {
    const message: Message = {
      id: `msg-${this.messages.length + 1}` as MessageId,
      sessionId: sessionId as SessionId,
      role,
      content,
      createdAt: new Date().toISOString(),
      ...(admittedSeq !== undefined ? { admittedSeq } : {}),
    };
    this.messages.push(message);
    return message;
  }

  async updateMessage(_sessionId: string, messageId: string, updates: { admittedSeq?: number; promotedSeq?: number }): Promise<void> {
    const index = this.messages.findIndex((m) => m.id === (messageId as MessageId));
    if (index < 0) return;
    const current = this.messages[index]!;
    const next: Message = {
      ...current,
      ...(updates.admittedSeq !== undefined ? { admittedSeq: updates.admittedSeq } : {}),
      ...(updates.promotedSeq !== undefined ? { promotedSeq: updates.promotedSeq } : {}),
    };
    this.messages[index] = next;
  }

  async listMessages(_sessionId: string): Promise<readonly Message[]> {
    return [...this.messages];
  }

  async searchMessages(): Promise<readonly Message[]> {
    return [];
  }

  async getSessionStats() {
    return { totalSessions: 0, totalMessages: this.messages.length, totalCost: 0, totalInputTokens: 0, totalOutputTokens: 0, sessionsByDate: [], costByModel: [] };
  }

  messagesFor(sessionId: string): readonly Message[] {
    return this.messages;
  }
}

/** A model whose first call can be gated until the test releases it. */
class GatedModel implements ModelProvider {
  readonly provider = "gated";
  readonly model = "gated-model";
  readonly pricing: ModelPricing = { input: 1, output: 1 };
  readonly capabilities = { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false } as const;
  readonly contextLimit: number | undefined;

  seenUserTexts: string[][] = [];
  private callCount = 0;
  private startedResolve!: () => void;
  readonly started = new Promise<void>((resolve) => { this.startedResolve = resolve; });
  private releaseResolve!: () => void;
  private gated = false;

  constructor(private readonly responses: ModelResponse[]) {}

  gate(): void {
    this.gated = true;
  }

  release(): void {
    if (!this.gated) return;
    this.gated = false;
    this.releaseResolve();
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async *stream(request: ModelRequest, signal?: AbortSignal): AsyncIterable<ModelStreamEvent> {
    const response = await this.generate(request, signal);
    if (response.content) yield { type: "text", content: response.content };
    if (response.toolCalls) {
      for (const tc of response.toolCalls) {
        yield { type: "tool_call", id: tc.id, name: tc.name, args: (tc.args ?? {}) as Record<string, unknown> };
      }
    }
    yield { type: "done" };
  }

  async generate(request: ModelRequest, _signal?: AbortSignal): Promise<ModelResponse> {
    this.callCount++;
    this.seenUserTexts.push(request.messages.filter((m) => m.role === "user").map((m) => (typeof m.content === "string" ? m.content : "")));
    this.startedResolve();
    if (this.gated && this.callCount === 1) {
      await new Promise<void>((resolve) => { this.releaseResolve = resolve; });
    }
    const response = this.responses[Math.min(this.callCount - 1, this.responses.length - 1)]!;
    return response;
  }
}

describe("RV-21: pending session_input admission, persistence and re-drain", () => {
  it("hydrated un-promoted inputs are re-queued in admission order and promoted once", async () => {
    const store = new TestSessionStore();
    const session = await store.createSession("PI Session");
    await store.addMessage(session.id, "user", "followup-a", undefined, undefined, undefined, undefined, 1);
    await store.addMessage(session.id, "user", "followup-b", undefined, undefined, undefined, undefined, 2);
    const done = await store.addMessage(session.id, "user", "already-handled", undefined, undefined, undefined, undefined, 3);
    await store.updateMessage(session.id, done.id, { promotedSeq: 3 });

    const model = new GatedModel([{ content: "final" }]);
    const eventStore = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store: eventStore, tools: [], maxSteps: 10, sessionStore: store });

    const handle = kernel.run("initial prompt", testCtx, session.id);
    await handle.completed;

    const firstCall = model.seenUserTexts[0] ?? [];
    expect(firstCall).toContain("followup-a");
    expect(firstCall).toContain("followup-b");
    expect(firstCall.indexOf("followup-a")).toBeLessThan(firstCall.indexOf("followup-b"));

    const messages = await store.listMessages(session.id);
    const byContent = Object.fromEntries(messages.map((m) => [m.content, m]));
    expect(byContent["followup-a"]?.promotedSeq).toBe(1);
    expect(byContent["followup-b"]?.promotedSeq).toBe(2);
    // Already-promoted input is NOT re-drained or re-promoted.
    expect(byContent["already-handled"]?.promotedSeq).toBe(3);
  });

  it("live inputs during a run persist with FIFO admitted seqs and are promoted on drain", async () => {
    const store = new TestSessionStore();
    const session = await store.createSession("PI Session 2");
    // A previous run already drained up through admitted seq 5; live inputs must continue from 6.
    const past = await store.addMessage(session.id, "user", "past-1", undefined, undefined, undefined, undefined, 5);
    await store.updateMessage(session.id, past.id, { promotedSeq: 5 });

    const model = new GatedModel([
      { content: "", toolCalls: [{ id: "c1", name: "noop", args: {} }] },
      { content: "final answer" },
    ]);
    const noop: ToolDefinition = { id: "noop", description: "no-op", risk: "read", async execute() { return "ok"; } };
    const eventStore = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store: eventStore, tools: [noop], maxSteps: 10, sessionStore: store });

    model.gate();
    const handle = kernel.run("start", testCtx, session.id);

    await model.started;
    kernel.sendInput(handle.runId, "live-b");
    kernel.sendInput(handle.runId, "live-a");
    model.release();

    await handle.completed;

    // FIFO admission order: b was admitted before a.
    const messages = await store.listMessages(session.id);
    const live = messages.filter((m) => m.content.startsWith("live-")).sort((x, y) => (x.admittedSeq ?? 0) - (y.admittedSeq ?? 0));
    expect(live.map((m) => m.content)).toEqual(["live-b", "live-a"]);
    expect(live[0]!.admittedSeq).toBe(6);
    expect(live[1]!.admittedSeq).toBe(7);

    // Both were drained into the second model call in arrival order and promoted.
    const secondCall = model.seenUserTexts[1] ?? [];
    expect(secondCall.indexOf("live-b")).toBeLessThan(secondCall.indexOf("live-a"));
    expect(live[0]!.promotedSeq).toBe(6);
    expect(live[1]!.promotedSeq).toBe(7);

    // Re-running the same session must NOT re-drain already-promoted inputs.
    const model2 = new GatedModel([{ content: "done again" }]);
    const eventStore2 = new FakeRunEventStore();
    const kernel2 = new AgentKernel({ model: model2, store: eventStore2, tools: [], maxSteps: 10, sessionStore: store });
    const handle2 = kernel2.run("again", testCtx, session.id);
    await handle2.completed;

    const seen = model2.seenUserTexts.flat();
    expect(seen).not.toContain("live-b");
    expect(seen).not.toContain("live-a");
  });

  it("promotion failures are best-effort: a later run re-delivers the input", async () => {
    const store = new TestSessionStore();
    const session = await store.createSession("PI Session 3");
    await store.addMessage(session.id, "user", "sticky", undefined, undefined, undefined, undefined, 1);

    // Simulate a broken updateMessage on the first run after the input was drained.
    const origUpdate = store.updateMessage.bind(store);
    store.updateMessage = async () => { throw new Error("db down"); };

    const model = new GatedModel([{ content: "final" }]);
    const eventStore = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store: eventStore, tools: [], maxSteps: 10, sessionStore: store });
    const handle = kernel.run("start", testCtx, session.id);
    await handle.completed;

    const pending = (await store.listMessages(session.id)).filter((m) => m.promotedSeq === undefined);
    expect(pending.map((m) => m.content)).toContain("sticky");

    // A later run (store healthy) re-drains and promotes exactly once.
    store.updateMessage = origUpdate;
    const model2 = new GatedModel([{ content: "final 2" }]);
    const eventStore2 = new FakeRunEventStore();
    const kernel2 = new AgentKernel({ model: model2, store: eventStore2, tools: [], maxSteps: 10, sessionStore: store });
    const handle2 = kernel2.run("again", testCtx, session.id);
    await handle2.completed;

    expect(model2.seenUserTexts[0]).toContain("sticky");
    expect((await store.listMessages(session.id)).find((m) => m.content === "sticky")?.promotedSeq).toBe(1);
  });
});