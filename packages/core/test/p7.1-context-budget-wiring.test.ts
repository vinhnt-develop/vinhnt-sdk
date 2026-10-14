import { describe, expect, it, vi } from "vitest";
import type { RequestContext, RequestId, RunId, TraceId } from "@vinhnt-sdk/schema";
import type { ChatMessage, ModelProvider } from "../src/model.js";
import { runLoop } from "../src/kernel/run-loop.js";
import type { RunLoopDeps, RunLoopInput } from "../src/kernel/run-loop.js";
import { AgentKernel } from "../src/kernel/kernel.js";
import { ModelCaller } from "@vinhnt-sdk/llm";
import { PermissionGate, StepExecutor, CircuitBreaker, RunStateMachine } from "@vinhnt-sdk/step-executor";
import { ToolSaga } from "@vinhnt-sdk/tools";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeApprovalStore } from "../src/fakes/fake-approval-store.js";
import { DEFAULT_CONTEXT_BUDGET, deriveContextBudget } from "../src/context/context-budget.js";

const testCtx: RequestContext = {
  requestId: "req_p71" as RequestId,
  traceId: "trace_p71" as TraceId,
  actorId: "test",
  tenantId: "default",
};

interface CompactorMock {
  compact: ReturnType<typeof vi.fn>;
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

function withCountTokens(model: FakeModelProvider, fn: ((text: string) => number) | undefined): FakeModelProvider {
  Object.defineProperty(model, "countTokens", { value: fn, configurable: true, writable: true });
  return model;
}

function makeDeps(model: ModelProvider, compactor: CompactorMock, extra?: Partial<RunLoopDeps>): RunLoopDeps {
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
    compactor: compactor as never,
    ...extra,
  } as RunLoopDeps;
}

function makeInput(model: ModelProvider, prompt = "hello"): RunLoopInput {
  return {
    prompt,
    runId: "run_p71_1" as RunId,
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

function makeModel(tokens: number | undefined): FakeModelProvider {
  return withCountTokens(
    new FakeModelProvider([{ content: "Done.", provider: "fake", finishReason: "stop" }]),
    tokens === undefined ? undefined : () => tokens,
  );
}

describe("P7.1: ContextBudget end-to-end wiring", () => {
  describe("run-loop: budget.compactionThreshold precedence", () => {
    it("budget.compactionThreshold wins over legacy compactionThreshold dep", async () => {
      const model = makeModel(70_000);
      const compactor = makeCompactor();
      // budget 0.4 → threshold floor(128_000 * 0.4) = 51_200 → 70_000 > 51_200 → compact
      // legacy 0.75 → 96_000 would NOT compact — budget must win
      await runLoop(
        makeDeps(model, compactor, {
          contextBudget: deriveContextBudget({ compactionThreshold: 0.4 }),
          compactionThreshold: 0.75,
        }),
        makeInput(model),
      );
      expect(compactor.compact).toHaveBeenCalledTimes(1);
    });

    it("legacy compactionThreshold dep used when no contextBudget", async () => {
      const model = makeModel(40_001);
      const compactor = makeCompactor();
      // threshold = floor(128_000 * 0.3) = 38_400 → 40_001 > 38_400 → compact
      await runLoop(makeDeps(model, compactor, { compactionThreshold: 0.3 }), makeInput(model));
      expect(compactor.compact).toHaveBeenCalledTimes(1);
    });

    it("DEFAULT_COMPACTION_THRESHOLD used when neither is set", async () => {
      const model = makeModel(96_001);
      const compactor = makeCompactor();
      await runLoop(makeDeps(model, compactor), makeInput(model));
      // est(96_001) > floor(128_000 * 0.75 = 96_000) → compact
      expect(compactor.compact).toHaveBeenCalledTimes(1);
    });
  });

  describe("kernel.getContextBudget()", () => {
    it("returns DEFAULT_CONTEXT_BUDGET when none configured", () => {
      const store = new FakeRunEventStore();
      const model = new FakeModelProvider([{ content: "ok", provider: "fake", finishReason: "stop" }]);
      const kernel = new AgentKernel({ model, store, tools: [] });
      expect(kernel.getContextBudget()).toEqual(DEFAULT_CONTEXT_BUDGET);
    });

    it("returns normalized budget when contextBudget passed", () => {
      const store = new FakeRunEventStore();
      const model = new FakeModelProvider([{ content: "ok", provider: "fake", finishReason: "stop" }]);
      const kernel = new AgentKernel({
        model,
        store,
        tools: [],
        contextBudget: { maxContextTokens: 200_000 },
      });
      const budget = kernel.getContextBudget();
      expect(budget.maxContextTokens).toBe(200_000);
      expect(budget.compactionThreshold).toBe(DEFAULT_CONTEXT_BUDGET.compactionThreshold);
      expect(budget.sanitizeLimitChars).toBe(DEFAULT_CONTEXT_BUDGET.sanitizeLimitChars);
    });

    it("legacy compactionThreshold seeds budget.compactionThreshold when partial budget omits it", () => {
      const store = new FakeRunEventStore();
      const model = new FakeModelProvider([{ content: "ok", provider: "fake", finishReason: "stop" }]);
      const kernel = new AgentKernel({
        model,
        store,
        tools: [],
        compactionThreshold: 0.5,
        contextBudget: { maxContextTokens: 100_000 },
      });
      expect(kernel.getContextBudget().compactionThreshold).toBe(0.5);
    });

    it("explicit budget.compactionThreshold wins over legacy field", () => {
      const store = new FakeRunEventStore();
      const model = new FakeModelProvider([{ content: "ok", provider: "fake", finishReason: "stop" }]);
      const kernel = new AgentKernel({
        model,
        store,
        tools: [],
        compactionThreshold: 0.9,
        contextBudget: { maxContextTokens: 100_000, compactionThreshold: 0.3 },
      });
      expect(kernel.getContextBudget().compactionThreshold).toBe(0.3);
    });
  });
});
