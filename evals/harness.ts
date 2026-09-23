/**
 * Shared offline harness for golden evals (P1-10).
 * Zero network — FakeModelProvider / FakeTool only.
 */
import type { RequestContext, RequestId, RunId, TraceId } from "@vinhnt-sdk/schema";
import type { ChatMessage, ModelProvider, ModelRequest, ModelResponse } from "../packages/core/src/model.js";
import { runLoop } from "../packages/core/src/kernel/run-loop.js";
import type { RunLoopDeps, RunLoopInput } from "../packages/core/src/kernel/run-loop.js";
import { ModelCaller } from "../packages/llm/src/model-caller.js";
import { PermissionGate, StepExecutor, CircuitBreaker, RunStateMachine } from "../packages/step-executor/src/index.js";
import { ToolSaga } from "../packages/tools/src/index.js";
import { FakeRunEventStore } from "../packages/core/src/fakes/fake-store.js";
import { FakeModelProvider } from "../packages/core/src/fakes/fake-model.js";
import { FakeTool } from "../packages/core/src/fakes/fake-tool.js";
import { FakeApprovalStore } from "../packages/core/src/fakes/fake-approval-store.js";

export const evalCtx: RequestContext = {
  requestId: "req_eval" as RequestId,
  traceId: "trace_eval" as TraceId,
  actorId: "eval",
  tenantId: "default",
};

export class CapturingModel extends FakeModelProvider {
  readonly seen: ChatMessage[][] = [];
  readonly requests: ModelRequest[] = [];
  constructor(responses: ConstructorParameters<typeof FakeModelProvider>[0]) {
    super(responses);
  }
  override async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    this.seen.push([...request.messages]);
    this.requests.push(request);
    return super.generate(request, signal);
  }
}

export function makeDeps(model: ModelProvider, tools: FakeTool[] = []): RunLoopDeps {
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
    findTool: (name) => tools.find((t) => t.id === name),
    hasTool: (name) => tools.some((t) => t.id === name),
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
  } as RunLoopDeps;
}

export function makeInput(overrides: Partial<RunLoopInput> = {}): RunLoopInput {
  return {
    prompt: "eval prompt",
    runId: "run_eval_1" as RunId,
    ctx: evalCtx,
    runAbort: new AbortController(),
    runModel: new FakeModelProvider([{ content: "Done." }]),
    addSessionMessage: async () => {},
    emitEvent: async () => {},
    setState: () => {},
    emitCompleted: async () => {},
    emitFail: async () => {},
    ...overrides,
  };
}

export { runLoop, FakeModelProvider, FakeTool, FakeRunEventStore, FakeApprovalStore };
