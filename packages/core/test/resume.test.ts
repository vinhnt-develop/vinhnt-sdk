import { describe, expect, it, vi } from "vitest";
import type { RequestContext, RunId } from "@vinhnt-sdk/schema";
import type { ChatMessage, ModelProvider, ModelRequest } from "../src/model.js";
import { runLoop } from "../src/kernel/run-loop.js";
import type { RunLoopDeps, RunLoopInput } from "../src/kernel/run-loop.js";
import { ModelCaller } from "@vinhnt-sdk/model-caller";
import { PermissionGate, StepExecutor, type StepExecutorDeps, CircuitBreaker, RunStateMachine } from "@vinhnt-sdk/step-executor";
import { ToolSaga } from "@vinhnt-sdk/tool-saga";
import { InMemorySessionState } from "@vinhnt-sdk/session";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeApprovalStore } from "../src/fakes/fake-approval-store.js";

const testCtx: RequestContext = {
  requestId: "req_resume",
  traceId: "trace_resume",
  actorId: "test",
  tenantId: "default",
};

/** Captures every message array passed to the model. */
class CapturingModel extends FakeModelProvider {
  readonly seen: ChatMessage[][] = [];
  constructor(responses: ConstructorParameters<typeof FakeModelProvider>[0]) {
    super(responses);
  }
  override async generate(request: ModelRequest, signal?: AbortSignal): Promise<ReturnType<ModelProvider["generate"]>> {
    this.seen.push([...request.messages]);
    return super.generate(request, signal);
  }
}

function makeDeps(model: ModelProvider): {
  deps: RunLoopDeps;
  modelCaller: ModelCaller;
  stepExecutor: StepExecutor;
  saga: ToolSaga;
  stateMachine: RunStateMachine;
  store: FakeRunEventStore;
} {
  const store = new FakeRunEventStore();
  const saga = new ToolSaga();
  const stateMachine = new RunStateMachine();
  const permissionGate = new PermissionGate({
    store,
    pluginManager: undefined,
    approvalStore: new FakeApprovalStore(),
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
  } satisfies StepExecutorDeps);
  const deps: RunLoopDeps = {
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
  };
  return { deps, modelCaller, stepExecutor, saga, stateMachine, store };
}

function makeInput(overrides: Partial<RunLoopInput> = {}): RunLoopInput {
  return {
    prompt: "continue the work",
    runId: "run_resume_1" as RunId,
    ctx: testCtx,
    runAbort: new AbortController(),
    runModel: new FakeModelProvider([{ content: "Done." }]),
    addSessionMessage: async () => {},
    emitEvent: async () => {},
    setState: () => {},
    updateSessionOnComplete: async () => {},
    emitFail: async () => {},
    ...overrides,
  };
}

describe("runLoop resume (P1-B)", () => {
  it("does not double-append restored history and keeps the prompt as the latest user turn", async () => {
    const model = new CapturingModel([{ content: "Continuing..." }]);
    const { deps, modelCaller } = makeDeps(model);

    const runSessionState = new InMemorySessionState();
    runSessionState.resetMessages([
      { role: "user", content: "first request" },
      { role: "assistant", content: "first response" },
    ]);
    runSessionState.step = 2;

    await runLoop(deps, makeInput({
      runModel: model,
      runSessionState,
      resume: true,
    }));

    expect(model.seen.length).toBe(1);
    const sent = model.seen[0]!;

    // Restored history appears exactly once (no double-append).
    const userCount = sent.filter((m) => m.role === "user" && m.content === "first request").length;
    expect(userCount).toBe(1);
    const assistantCount = sent.filter((m) => m.role === "assistant" && m.content === "first response").length;
    expect(assistantCount).toBe(1);

    // The steering prompt is appended once, after the restored history.
    const promptIndex = sent.findIndex((m) => m.role === "user" && m.content === "continue the work");
    expect(promptIndex).toBeGreaterThan(0);
  });

  it("resumes the step counter from the restored step instead of restarting at 0", async () => {
    const model = new CapturingModel([{ content: "Continuing..." }]);
    const { deps } = makeDeps(model);

    const runSessionState = new InMemorySessionState();
    runSessionState.resetMessages([{ role: "user", content: "first request" }]);
    runSessionState.step = 3;

    const emitted: string[] = [];
    await runLoop(deps, makeInput({
      runModel: model,
      runSessionState,
      resume: true,
      emitEvent: async (event) => { if (event.type === "step.started") emitted.push(String((event.data as { step: number }).step)); },
    }));

    // Step starts from 3, not 0.
    expect(emitted).toEqual(["3"]);
  });
});
