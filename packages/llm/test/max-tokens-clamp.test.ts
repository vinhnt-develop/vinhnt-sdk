import { describe, it, expect, vi } from "vitest";
import { ModelCaller, DEFAULT_CONTEXT_WINDOW, type ModelCallerDeps } from "../src/model-caller.js";
import type {
  ModelProvider,
  ModelRequest,
  RequestContext,
  RequestId,
  RunId,
  TraceId,
} from "@vinhnt-sdk/schema";

const testCtx: RequestContext = {
  requestId: "req_e5b" as RequestId,
  traceId: "trace_e5b" as TraceId,
  actorId: "test",
  tenantId: "default",
};

function makeProvider(contextLimit: number | undefined): { model: ModelProvider; generate: ReturnType<typeof vi.fn> } {
  const generate = vi.fn().mockResolvedValue({
    content: "ok",
    provider: "test",
    finishReason: "stop",
  });
  const model = {
    provider: "test",
    model: "test-model",
    contextLimit,
    capabilities: { streaming: false, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false },
    pricing: undefined,
    generate,
  } as unknown as ModelProvider;
  return { model, generate };
}

function makeCaller(model: ModelProvider, maxTokens: number): ModelCaller {
  const deps: ModelCallerDeps = {
    defaultModel: model,
    modelRegistry: undefined,
    maxTokens,
    thinkingBudget: 0,
    thinkingPrompt: "",
    pluginManager: undefined,
    logger: undefined,
    emitEvent: async () => {},
    modelForRun: () => undefined,
    setModelForRun: () => {},
    getAvailableTools: () => [],
  };
  return new ModelCaller(deps);
}

describe("E5b maxTokens context clamp", () => {
  it("TC01_clamps_requested_maxTokens_when_prompt_large", async () => {
    const { model, generate } = makeProvider(8_000);
    const caller = makeCaller(model, 16_384);
    await caller.callModelStream(
      [{ role: "user", content: "x".repeat(4_000) }],
      1, "run_e5b" as RunId, testCtx, new AbortController().signal,
    );
    const sent = generate.mock.calls[0]![0] as ModelRequest;
    // est = ceil(4000/4) = 1000 → 8000 - 1000 - 2048 = 4952
    expect(sent.maxTokens).toBe(4_952);
    expect(sent.maxTokens!).toBeLessThan(16_384);
  });

  it("TC02_no_clamp_when_headroom_available", async () => {
    const { model, generate } = makeProvider(200_000);
    const caller = makeCaller(model, 4_096);
    await caller.callModelStream(
      [{ role: "user", content: "x".repeat(40) }],
      1, "run_e5b" as RunId, testCtx, new AbortController().signal,
    );
    const sent = generate.mock.calls[0]![0] as ModelRequest;
    expect(sent.maxTokens).toBe(4_096);
  });

  it("TC03_floors_at_256_when_prompt_exceeds_context", async () => {
    const { model, generate } = makeProvider(3_000);
    const caller = makeCaller(model, 4_096);
    await caller.callModelStream(
      [{ role: "user", content: "x".repeat(40_000) }],
      1, "run_e5b" as RunId, testCtx, new AbortController().signal,
    );
    const sent = generate.mock.calls[0]![0] as ModelRequest;
    expect(sent.maxTokens).toBe(256);
  });

  it("TC04_falls_back_to_DEFAULT_CONTEXT_WINDOW_when_no_contextLimit", async () => {
    const { model, generate } = makeProvider(undefined);
    const caller = makeCaller(model, 200_000);
    await caller.callModelStream(
      [{ role: "user", content: "x".repeat(400) }],
      1, "run_e5b" as RunId, testCtx, new AbortController().signal,
    );
    const sent = generate.mock.calls[0]![0] as ModelRequest;
    expect(DEFAULT_CONTEXT_WINDOW).toBe(128_000);
    // est = 100 → 128_000 - 100 - 2048 = 125_852 (well below the 200_000 request)
    expect(sent.maxTokens).toBe(125_852);
  });

  it("TC05_agentMaxTokens_takes_precedence_over_deps_maxTokens_then_clamps", async () => {
    const { model, generate } = makeProvider(8_000);
    const caller = makeCaller(model, 4_096);
    await caller.callModelStream(
      [{ role: "user", content: "x".repeat(4_000) }],
      1, "run_e5b" as RunId, testCtx, new AbortController().signal,
      8_192, // agent override — still clamped to available budget
    );
    const sent = generate.mock.calls[0]![0] as ModelRequest;
    expect(sent.maxTokens).toBe(4_952);
  });
});
