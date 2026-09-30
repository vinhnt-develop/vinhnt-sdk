import { describe, expect, it, vi } from "vitest";
import type { RequestContext, RequestId, RunId, TraceId } from "@vinhnt-sdk/schema";
import type { ChatMessage, ModelProvider, ModelRequest, ModelResponse } from "../src/model.js";
import { runLoop } from "../src/kernel/run-loop.js";
import type { RunLoopDeps, RunLoopInput } from "../src/kernel/run-loop.js";
import { ModelCaller, DEFAULT_CONTEXT_WINDOW } from "@vinhnt-sdk/llm";
import { PermissionGate, StepExecutor, CircuitBreaker, RunStateMachine } from "@vinhnt-sdk/step-executor";
import { ToolSaga } from "@vinhnt-sdk/tools";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeApprovalStore } from "../src/fakes/fake-approval-store.js";

const testCtx: RequestContext = {
  requestId: "req_e5" as RequestId,
  traceId: "trace_e5" as TraceId,
  actorId: "test",
  tenantId: "default",
};

interface CompactorMock {
  compact: ReturnType<typeof vi.fn>;
}

function makeDeps(model: ModelProvider, compactor?: CompactorMock): RunLoopDeps {
  const store = new FakeRunEventStore();
  const saga = new ToolSaga();
  const stateMachine = new RunStateMachine();
  const approvalStore = new FakeApprovalStore();
  approvalStore.autoReply = "once";
  const permissionGate = new PermissionGate({
    store,
    pluginManager: undefined,
    approvalStore,
    autoApprovalEnabled: true,
  });
  const modelCaller = new ModelCaller({
    defaultModel: model,
    modelRegistry: undefined,
    maxTokens: 4096,
    thinkingBudget: 0,
    thinkingPrompt: "",
    pluginManager: undefined,
    logger: undefined,
    emitEvent: async () => {},
    modelForRun: (runId) => stateMachine.getModelForRun(runId),
    setModelForRun: (runId, m) => stateMachine.setModelForRun(runId, m),
    getAvailableTools: () => [],
  });
  const stepExecutor = new StepExecutor({
    store: { emitEvent: async () => {} },
    addSessionMessage: async () => {},
    pluginManager: undefined,
    permissionGate,
    modelCaller,
    maxToolCallsPerStep: 20,
    maxSelfCorrectAttempts: 2,
    selfCorrectOnFailure: false,
    currentAgent: undefined,
    saga,
    doomLoopThreshold: 5,
    findTool: () => undefined,
    hasTool: () => false,
  });
  return {
    modelCaller,
    permissionGate,
    stepExecutor,
    saga,
    store,
    circuitBreaker: new CircuitBreaker(),
    stateMachine,
    addSessionMessage: async () => {},
    maxSteps: 5,
    maxTokens: 4096,
    thinkingBudget: 0,
    stepTimeout: 60_000,
    ...(compactor ? { compactor: compactor as never } : {}),
  } as RunLoopDeps;
}

function makeInput(model: ModelProvider, prompt = "create the file"): RunLoopInput {
  return {
    prompt,
    runId: "run_e5a_1" as RunId,
    ctx: testCtx,
    runAbort: new AbortController(),
    runModel: model,
    addSessionMessage: async () => {},
    emitEvent: async () => {},
    setState: () => {},
    emitCompleted: async () => {},
    emitFail: async () => {},
  };
}

function makeCompactor(): CompactorMock {
  return {
    compact: vi.fn().mockImplementation(async (msgs: ChatMessage[]) => ({
      messages: msgs,
      didCompact: false,
      summary: { originalMessageCount: msgs.length, compressedMessageCount: msgs.length },
    })),
  };
}

/** countTokens override (prototype methods are writable per instance). */
function withCountTokens(model: FakeModelProvider, fn: ((text: string) => number) | undefined): FakeModelProvider {
  Object.defineProperty(model, "countTokens", { value: fn, configurable: true, writable: true });
  return model;
}

describe("E5a context window fallback (DEFAULT_CONTEXT_WINDOW)", () => {
  it("TC01_no_compaction_at_exact_default_threshold_96000", async () => {
    const model = withCountTokens(new FakeModelProvider([{ content: "Done.", provider: "fake", finishReason: "stop" }]), () => 96_000);
    const compactor = makeCompactor();
    await runLoop(makeDeps(model, compactor), makeInput(model));
    // est(96000) > floor(128_000 * 0.75 = 96_000) is false → no compaction
    expect(compactor.compact).not.toHaveBeenCalled();
  });

  it("TC02_compaction_one_token_over_default_threshold", async () => {
    const model = withCountTokens(new FakeModelProvider([{ content: "Done.", provider: "fake", finishReason: "stop" }]), () => 96_001);
    const compactor = makeCompactor();
    await runLoop(makeDeps(model, compactor), makeInput(model));
    expect(compactor.compact).toHaveBeenCalledTimes(1);
  });

  it("TC03_declared_contextLimit_overrides_default", async () => {
    const model = new FakeModelProvider([{ content: "Done.", provider: "fake", finishReason: "stop" }]);
    Object.defineProperty(model, "contextLimit", { value: 40_000, configurable: true });
    withCountTokens(model, () => 30_001);
    const compactor = makeCompactor();
    await runLoop(makeDeps(model, compactor), makeInput(model));
    // threshold = floor(40_000 * 0.75) = 30_000 → 30_001 > 30_000 → compact
    // (under the default 96_000 threshold this would NOT compact)
    expect(compactor.compact).toHaveBeenCalledTimes(1);
  });

  it("TC04_chars_path_without_countTokens_uses_default_window", async () => {
    const model = withCountTokens(
      new FakeModelProvider([{ content: "Done.", provider: "fake", finishReason: "stop" }]),
      undefined,
    );
    const compactor = makeCompactor();
    // chars/4 = 400_000/4 = 100_000 > 96_000 → compact via the no-tokenizer path
    await runLoop(makeDeps(model, compactor), makeInput(model, "a".repeat(400_000)));
    expect(compactor.compact).toHaveBeenCalledTimes(1);
  });

  it("TC05_DEFAULT_CONTEXT_WINDOW_is_exported_from_core", async () => {
    const core = await import("../src/index.js");
    expect(core.DEFAULT_CONTEXT_WINDOW).toBe(DEFAULT_CONTEXT_WINDOW);
    expect(DEFAULT_CONTEXT_WINDOW).toBe(128_000);
  });
});
