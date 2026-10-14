import { describe, expect, it } from "vitest";
import type { RequestContext, RequestId, RunId, TraceId } from "@vinhnt-sdk/schema";
import type { ChatMessage, ModelProvider, ModelRequest, ModelResponse } from "../src/model.js";
import { runLoop } from "../src/kernel/run-loop.js";
import type { RunLoopDeps, RunLoopInput } from "../src/kernel/run-loop.js";
import { ModelCaller } from "@vinhnt-sdk/llm";
import { PermissionGate, StepExecutor, CircuitBreaker, RunStateMachine } from "@vinhnt-sdk/step-executor";
import { ToolSaga } from "@vinhnt-sdk/tools";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeApprovalStore } from "../src/fakes/fake-approval-store.js";
import { InMemorySessionState } from "@vinhnt-sdk/session";

const testCtx: RequestContext = {
  requestId: "req_handoff" as RequestId,
  traceId: "trace_handoff" as TraceId,
  actorId: "test",
  tenantId: "default",
};

class CapturingModel extends FakeModelProvider {
  readonly seen: ChatMessage[][] = [];
  override async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    this.seen.push([...request.messages]);
    return super.generate(request, signal);
  }
}

const HANDOFF_RESULT = {
  targetAgentId: "code-reviewer",
  reason: "delegate the review",
  summary: "Please review the changes",
};

function makeDeps(model: ModelProvider): RunLoopDeps {
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
  } as RunLoopDeps;
}

function makeInput(overrides: Partial<RunLoopInput> = {}): RunLoopInput {
  return {
    prompt: "review this please",
    runId: "run_handoff_1" as RunId,
    ctx: testCtx,
    runAbort: new AbortController(),
    runModel: new FakeModelProvider([{ provider: "fake", content: "Done." }]),
    addSessionMessage: async () => {},
    emitEvent: async () => {},
    setState: () => {},
    emitCompleted: async () => {},
    emitFail: async () => {},
    ...overrides,
  };
}

/** runLoop deps whose step executor immediately reports a handoff. */
function handoffDeps(model: ModelProvider): { deps: RunLoopDeps; stateMachine: RunStateMachine } {
  const deps = makeDeps(model);
  (deps as { stepExecutor: unknown }).stepExecutor = {
    executeToolCalls: async () => ({
      toolCallCount: 1,
      recentCalls: [],
      selfCorrectTokens: { input: 0, output: 0 },
      toolResults: [],
      handoff: HANDOFF_RESULT,
    }),
  };
  return { deps, stateMachine: deps.stateMachine };
}

describe("P2.1 handoff return path (S1+S2)", () => {
  it("TC01_returns_handoff_to_kernel_instead_of_dropping_it", async () => {
    const model = new CapturingModel([
      { provider: "fake", content: "", finishReason: "tool-calls", toolCalls: [{ id: "h1", name: "transfer_to_agent", args: { target: "code-reviewer" } }] },
    ]);
    const { deps } = handoffDeps(model);
    const sessionState = new InMemorySessionState();
    // The kernel marks the session running before entering the loop.
    sessionState.isRunning = true;

    const result = await runLoop(deps, makeInput({ runModel: model, runSessionState: sessionState }));

    expect(result.handoff).toBeDefined();
    expect(result.handoff?.targetAgentId).toBe("code-reviewer");
    expect(result.handoff?.reason).toBe("delegate the review");
    // The continued run must see the pre-handoff turns (assistant toolCalls etc).
    expect(sessionState.messages.length).toBeGreaterThan(0);
    expect(sessionState.messages.some((m) => m.role === "assistant")).toBe(true);
    // isRunning stays true: the kernel swap re-enters the loop for this run.
    expect(sessionState.isRunning).toBe(true);
  });

  it("TC02_suppresses_terminal_run_completed_while_handoff_pending", async () => {
    const model = new CapturingModel([
      { provider: "fake", content: "", finishReason: "tool-calls", toolCalls: [{ id: "h1", name: "transfer_to_agent", args: {} }] },
    ]);
    const { deps } = handoffDeps(model);
    const completedCalls: unknown[] = [];
    const states: string[] = [];

    await runLoop(deps, makeInput({
      runModel: model,
      emitCompleted: async (event) => { completedCalls.push(event); },
      setState: (_rid, state) => { states.push(String(state)); },
    }));

    // S2: no terminal emission / completion state until the swapped agent finishes.
    expect(completedCalls).toHaveLength(0);
    expect(states).not.toContain("completed");
    // The handoff itself is still announced exactly once.
    expect(states).toContain("running");
  });

  it("TC03_leaves_the_handoff_announcement_to_the_kernel", async () => {
    const model = new CapturingModel([
      { provider: "fake", content: "", finishReason: "tool-calls", toolCalls: [{ id: "h1", name: "transfer_to_agent", args: {} }] },
    ]);
    const { deps } = handoffDeps(model);
    const events: Array<{ type: string }> = [];

    await runLoop(deps, makeInput({
      runModel: model,
      emitEvent: async (event) => { events.push(event as unknown as { type: string }); },
    }));

    // Contract: the run-loop only DETECTS the handoff and returns it. The
    // kernel validates the swap (target exists, no cycle) and emits
    // agent.handoff only when the swap actually happens — a rejected handoff
    // must never produce the event.
    expect(events.filter((e) => e.type === "agent.handoff")).toHaveLength(0);
  });
});
