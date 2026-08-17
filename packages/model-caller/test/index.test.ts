import { describe, it, expect, vi } from "vitest";
import { ModelCaller, type ModelCallerDeps, type ModelCallerPluginHooks } from "../src/index.js";
import type { ChatMessage, ModelProvider, ModelStreamEvent } from "@vinhnt-sdk/schema";

const ctx = { traceId: "trace-1" } as { traceId: string };
const runId = "run-1";

function makeProvider(overrides: Partial<ModelProvider> = {}): ModelProvider {
  return {
    model: "test-model",
    generate: vi.fn(async () => ({ content: "hello" })),
    ...overrides,
  };
}

function makeDeps(overrides: Partial<ModelCallerDeps> = {}): ModelCallerDeps {
  const events: unknown[] = [];
  return {
    defaultModel: makeProvider(),
    modelRegistry: undefined,
    maxTokens: 1000,
    thinkingBudget: 0,
    thinkingPrompt: "",
    pluginManager: undefined,
    logger: undefined,
    emitEvent: vi.fn(async (event: unknown) => {
      events.push(event);
    }),
    modelForRun: () => undefined,
    setModelForRun: () => {},
    getAvailableTools: () => [],
    ...overrides,
  };
}

describe("ModelCaller", () => {
  it("calculateCost converts per-1M pricing", () => {
    const caller = new ModelCaller(makeDeps());
    const model = makeProvider({ pricing: { input: 3, output: 15 } });
    expect(caller.calculateCost(1_000_000, 1_000_000, model)).toBe(18);
    expect(caller.calculateCost(0, 0, model)).toBe(0);
    expect(caller.calculateCost(10, 10, makeProvider())).toBeUndefined();
  });

  it("resolveAgentModel prefers registry model over default", () => {
    const registry = {
      get: vi.fn((id: string) => (id === "fast" ? makeProvider({ model: "fast-model" }) : undefined)),
    };
    const setModelForRun = vi.fn();
    const caller = new ModelCaller(makeDeps({ modelRegistry: registry as never, setModelForRun }));

    expect(caller.resolveAgentModel({ profile: { model: "fast" } }, runId).model).toBe("fast-model");
    expect(setModelForRun).toHaveBeenCalledWith(runId, expect.objectContaining({ model: "fast-model" }));

    expect(caller.resolveAgentModel({ profile: { model: "missing" } }, runId).model).toBe("test-model");
  });

  it("setDefaultModel and setRuntimeOptions hot-reload", () => {
    const caller = new ModelCaller(makeDeps());
    const next = makeProvider({ model: "next-model" });
    caller.setDefaultModel(next);
    expect(caller.getDefaultModel()).toBe(next);
    caller.setRuntimeOptions({ maxTokens: 500, thinkingPrompt: "think hard" });
    expect((caller as unknown as { deps: { maxTokens: number; thinkingPrompt: string } }).deps.maxTokens).toBe(500);
    expect((caller as unknown as { deps: { thinkingPrompt: string } }).deps.thinkingPrompt).toBe("think hard");
  });

  it("callModelStream non-streaming: calls generate, returns content", async () => {
    const generate = vi.fn(async () => ({ content: "hello world" }));
    const caller = new ModelCaller(makeDeps({ defaultModel: makeProvider({ generate }) }));
    const res = await caller.callModelStream(
      [{ role: "user", content: "hi" }] as ChatMessage[],
      1,
      runId,
      ctx,
      new AbortController().signal,
    );
    expect(res.content).toBe("hello world");
    expect(generate).toHaveBeenCalledOnce();
  });

  it("callModelStream non-streaming: emits token.counted and model.cost events", async () => {
    const emitEvent = vi.fn(async () => {});
    const caller = new ModelCaller(
      makeDeps({
        defaultModel: makeProvider({
          pricing: { input: 3, output: 15 },
          countTokens: (text: unknown) => String(text).length,
          generate: vi.fn(async () => ({ content: "abc", usage: { inputTokens: 10, outputTokens: 5 } })),
        }),
        emitEvent,
      }),
    );
    await caller.callModelStream([{ role: "user", content: "hi" }] as ChatMessage[], 1, runId, ctx, new AbortController().signal);

    const types = emitEvent.mock.calls.map((c) => (c[0] as { type: string }).type);
    expect(types).toContain("token.counted");
    expect(types).toContain("model.cost");
    const cost = emitEvent.mock.calls.find((c) => (c[0] as { type: string }).type === "model.cost");
    expect((cost?.[0] as { data: { cost: number; model: string } }).data.cost).toBe(0.000105);
    expect((cost?.[0] as { data: { model: string } }).data.model).toBe("test-model");
  });

  it("callModelStream streaming: accumulates text and tool calls", async () => {
    const events: ModelStreamEvent[] = [
      { type: "text", content: "hel" },
      { type: "tool_call", id: "t1", name: "read_file", args: { filePath: "/a.txt" } },
      { type: "text", content: "lo" },
      { type: "usage", inputTokens: 3, outputTokens: 7 },
      { type: "done" },
    ];
    const caller = new ModelCaller(
      makeDeps({
        defaultModel: makeProvider({
          stream: vi.fn(async function* () {
            for (const e of events) yield e;
          }),
        }),
      }),
    );
    const res = await caller.callModelStream([{ role: "user", content: "hi" }] as ChatMessage[], 1, runId, ctx, new AbortController().signal);
    expect(res.content).toBe("hello");
    expect(res.toolCalls).toEqual([{ id: "t1", name: "read_file", args: { filePath: "/a.txt" } }]);
  });

  it("fires onBeforeModelCall hook and honours modified request", async () => {
    const generate = vi.fn(async (req: { maxTokens: number }) => ({ content: String(req.maxTokens) }));
    const fireHook = vi.fn(async (name: string, data: { request: Record<string, unknown> }) => ({
      modified: name === "onBeforeModelCall" ? { request: { maxTokens: 42 } } : null,
    }));
    const caller = new ModelCaller(
      makeDeps({
        defaultModel: makeProvider({ generate }),
        pluginManager: { fireHook } as ModelCallerPluginHooks,
      }),
    );
    await caller.callModelStream([{ role: "user", content: "hi" }] as ChatMessage[], 1, runId, ctx, new AbortController().signal);
    expect(fireHook).toHaveBeenCalledWith("onChatParams", expect.objectContaining({ request: expect.any(Object) }));
    expect(fireHook).toHaveBeenCalledWith("onBeforeModelCall", expect.objectContaining({ request: expect.any(Object) }));
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: 42 }), expect.any(AbortSignal));
  });

  it("honours agentMaxTokens and disableTools", async () => {
    const getAvailableTools = vi.fn(() => [{ name: "read_file" }] as never);
    const generate = vi.fn(async (req: { maxTokens?: number; tools: unknown[] }) => ({ content: "ok" }));
    const caller = new ModelCaller(
      makeDeps({
        defaultModel: makeProvider({ generate }),
        getAvailableTools,
      }),
    );
    await caller.callModelStream([{ role: "user", content: "hi" }] as ChatMessage[], 1, runId, ctx, new AbortController().signal, 777, true);
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ maxTokens: 777, tools: [] }),
      expect.any(AbortSignal),
    );
    expect(getAvailableTools).not.toHaveBeenCalled();
  });

  it("doThinkingStep appends raw thinking back into messages", async () => {
    const emitEvent = vi.fn(async () => {});
    const caller = new ModelCaller(
      makeDeps({
        defaultModel: makeProvider({
          generate: vi.fn(async () => ({ content: "deep analysis" })),
        }),
        thinkingPrompt: "think",
        thinkingBudget: 128,
        emitEvent,
      }),
    );
    const messages: ChatMessage[] = [{ role: "user", content: "q" }];
    await caller.doThinkingStep(messages, 1, runId, ctx, new AbortController().signal);
    expect(messages.at(-1)).toEqual({ role: "system", content: "[Thinking from previous pass]\ndeep analysis" });
    const types = emitEvent.mock.calls.map((c) => (c[0] as { type: string }).type);
    expect(types).toContain("thinking.started");
    expect(types).toContain("thinking.content");
    expect(types).toContain("thinking.completed");
  });
});