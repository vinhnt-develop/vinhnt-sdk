import { describe, expect, it, vi } from "vitest";
import type { RequestContext, RequestId, RunId, TraceId } from "@vinhnt-sdk/schema";
import type { ChatMessage, ModelProvider } from "../src/model.js";
import { runLoop } from "../src/kernel/run-loop.js";
import type { RunLoopDeps, RunLoopInput } from "../src/kernel/run-loop.js";
import { ModelCaller, DEFAULT_CONTEXT_WINDOW } from "@vinhnt-sdk/llm";
import { PermissionGate, StepExecutor, CircuitBreaker, RunStateMachine } from "@vinhnt-sdk/step-executor";
import { ToolSaga } from "@vinhnt-sdk/tools";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeApprovalStore } from "../src/fakes/fake-approval-store.js";
import { AgentKernel } from "../src/kernel/kernel.js";
import type { PluginManager } from "../src/plugin.js";

const testCtx: RequestContext = {
  requestId: "req_lc" as RequestId,
  traceId: "trace_lc" as TraceId,
  actorId: "test",
  tenantId: "default",
};

interface CapturedHook {
  name: string;
  data: Record<string, unknown>;
}

function makeHookManager(calls: CapturedHook[], order?: string[]): PluginManager {
  return {
    register: async () => {},
    activate: async () => {},
    deactivate: async () => {},
    list: () => [],
    get: () => undefined,
    getActivePlugins: () => [],
    fireHook: async (name: string, data: Record<string, unknown>) => {
      calls.push({ name, data });
      if (order !== undefined && name === "onPreCompact") order.push("onPreCompact");
      return null;
    },
  } as unknown as PluginManager;
}

describe("G5.2 kernel.endSession → onSessionEnd", () => {
  it("fires onSessionEnd exactly once with the sessionId", async () => {
    const calls: CapturedHook[] = [];
    const kernel = new AgentKernel({
      model: new FakeModelProvider([]),
      store: new FakeRunEventStore(),
      tools: [],
      maxSteps: 5,
      pluginManager: makeHookManager(calls),
    });
    await kernel.endSession("ses_lifecycle_1");
    const sessionEnds = calls.filter((c) => c.name === "onSessionEnd");
    expect(sessionEnds).toHaveLength(1);
    expect(sessionEnds[0]?.data).toEqual({ sessionId: "ses_lifecycle_1" });
  });

  it("is a no-op without a pluginManager", async () => {
    const kernel = new AgentKernel({
      model: new FakeModelProvider([]),
      store: new FakeRunEventStore(),
      tools: [],
      maxSteps: 5,
    });
    await expect(kernel.endSession("ses_lifecycle_2")).resolves.toBeUndefined();
  });
});

/** Same wiring as context-window-default.test.ts so the compaction path is real. */
interface CompactorMock {
  compact: ReturnType<typeof vi.fn>;
}

function makeDeps(
  model: ModelProvider,
  compactor?: CompactorMock,
  pluginManager?: PluginManager,
): RunLoopDeps {
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
    ...(pluginManager ? { pluginManager } : {}),
  } as RunLoopDeps;
}

function makeInput(model: ModelProvider, prompt = "create the file"): RunLoopInput {
  return {
    prompt,
    runId: "run_lc_1" as RunId,
    ctx: testCtx,
    runAbort: new AbortController(),
    sessionId: "ses_precompact",
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

function withCountTokens(model: FakeModelProvider, tokens: number): FakeModelProvider {
  Object.defineProperty(model, "countTokens", { value: () => tokens, configurable: true, writable: true });
  return model;
}

describe("G5.2 run-loop → onPreCompact", () => {
  it("fires before compaction with trigger/messageCount/sessionId when over the threshold", async () => {
    const calls: CapturedHook[] = [];
    const order: string[] = [];
    const pluginManager = makeHookManager(calls, order);

    const model = withCountTokens(new FakeModelProvider([{ content: "Done.", provider: "fake", finishReason: "stop" }]), DEFAULT_CONTEXT_WINDOW + 1);
    const compactor = makeCompactor();
    compactor.compact.mockImplementation(async (msgs: ChatMessage[]) => {
      order.push("compact");
      return {
        messages: msgs,
        didCompact: false,
        summary: { originalMessageCount: msgs.length, compressedMessageCount: msgs.length },
      };
    });

    await runLoop(makeDeps(model, compactor, pluginManager), makeInput(model));

    const pre = calls.filter((c) => c.name === "onPreCompact");
    expect(pre).toHaveLength(1);
    expect(pre[0]?.data).toMatchObject({ trigger: "auto", sessionId: "ses_precompact" });
    expect(pre[0]?.data.messageCount).toBeGreaterThan(0);
    expect(compactor.compact).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["onPreCompact", "compact"]);
  });

  it("does not fire onPreCompact when no compaction triggers", async () => {
    const calls: CapturedHook[] = [];
    const model = withCountTokens(
      new FakeModelProvider([{ content: "Done.", provider: "fake", finishReason: "stop" }]),
      Math.floor(DEFAULT_CONTEXT_WINDOW * 0.75),
    );
    const compactor = makeCompactor();
    await runLoop(makeDeps(model, compactor, makeHookManager(calls)), makeInput(model));
    expect(calls.some((c) => c.name === "onPreCompact")).toBe(false);
    expect(compactor.compact).not.toHaveBeenCalled();
  });

  it("does not fire onPreCompact at all without a compactor", async () => {
    const calls: CapturedHook[] = [];
    const model = new FakeModelProvider([{ content: "Done.", provider: "fake", finishReason: "stop" }]);
    await runLoop(makeDeps(model, undefined, makeHookManager(calls)), makeInput(model));
    expect(calls.some((c) => c.name === "onPreCompact")).toBe(false);
  });
});
