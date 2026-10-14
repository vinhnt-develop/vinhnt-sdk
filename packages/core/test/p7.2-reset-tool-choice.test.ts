import { describe, expect, it } from "vitest";
import type { RequestContext, RequestId, RunId, TraceId } from "@vinhnt-sdk/schema";
import type { ChatMessage, ModelProvider, ModelRequest, ModelResponse } from "../src/model.js";
import { runLoop } from "../src/kernel/run-loop.js";
import type { RunLoopDeps, RunLoopInput } from "../src/kernel/run-loop.js";
import { AgentKernel } from "../src/kernel/kernel.js";
import { ModelCaller } from "@vinhnt-sdk/llm";
import { PermissionGate, StepExecutor, CircuitBreaker, RunStateMachine } from "@vinhnt-sdk/step-executor";
import { ToolSaga } from "@vinhnt-sdk/tools";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeTool } from "../src/fakes/fake-tool.js";
import { FakeApprovalStore } from "../src/fakes/fake-approval-store.js";
import type { ToolChoice } from "@vinhnt-sdk/schema";

const testCtx: RequestContext = {
  requestId: "req_p72" as RequestId,
  traceId: "trace_p72" as TraceId,
  actorId: "test",
  tenantId: "default",
};

class CapturingModel extends FakeModelProvider {
  readonly requests: ModelRequest[] = [];
  readonly seen: ChatMessage[][] = [];
  constructor(responses: ConstructorParameters<typeof FakeModelProvider>[0]) {
    super(responses);
  }
  override async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    this.requests.push(request);
    this.seen.push([...request.messages]);
    return super.generate(request, signal);
  }
}

interface DepsOptions {
  toolChoice?: ToolChoice;
  resetToolChoice?: boolean;
}

function makeDeps(model: ModelProvider, tools: FakeTool[], opts: DepsOptions = {}): RunLoopDeps {
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
    ...(opts.toolChoice !== undefined ? { toolChoice: opts.toolChoice } : {}),
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
    ...(opts.toolChoice !== undefined ? { toolChoice: opts.toolChoice } : {}),
    ...(opts.resetToolChoice !== undefined ? { resetToolChoice: opts.resetToolChoice } : {}),
  } as RunLoopDeps;
}

function makeInput(model: ModelProvider, runId = "run_p72_1"): RunLoopInput {
  return {
    prompt: "do work",
    runId: runId as RunId,
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

const TOOL_CALL_TURN: ModelResponse = {
  content: "",
  finishReason: "tool-calls", provider: "fake",
  toolCalls: [{ id: "c1", name: "read_file", args: { path: "a.txt" } }],
};

const FILE_CLAIM_TURN: ModelResponse = {
  content: "Tôi đã tạo file index.html rồi.",
  finishReason: "stop", provider: "fake",
};

describe("Phase 7 group 2 — reset_tool_choice semantics", () => {
  it("TC01: downgrades tool_choice required→auto on the call after a tool ran (default on)", async () => {
    const model = new CapturingModel([TOOL_CALL_TURN, { content: "Done.", finishReason: "stop", provider: "fake" }]);
    const deps = makeDeps(model, [new FakeTool("read_file")], { toolChoice: "required" });

    const result = await runLoop(deps, makeInput(model));
    expect(result.status).toBe("succeeded");

    expect(model.requests).toHaveLength(2);
    // Before any tool ran: configured "required" is honored (forces first tool call).
    expect(model.requests[0]?.toolChoice).toBe("required");
    // After a tool executed: downgraded to "auto" so the model can finish.
    expect(model.requests[1]?.toolChoice).toBe("auto");
  });

  it("TC02: resetToolChoice=false keeps tool_choice=required after tools ran", async () => {
    const model = new CapturingModel([TOOL_CALL_TURN, { content: "Done.", finishReason: "stop", provider: "fake" }]);
    const deps = makeDeps(model, [new FakeTool("read_file")], {
      toolChoice: "required",
      resetToolChoice: false,
    });

    const result = await runLoop(deps, makeInput(model));
    expect(result.status).toBe("succeeded");

    expect(model.requests).toHaveLength(2);
    expect(model.requests[0]?.toolChoice).toBe("required");
    expect(model.requests[1]?.toolChoice).toBe("required");
  });

  it("TC03: no override injected when configured toolChoice is not 'required'", async () => {
    const model = new CapturingModel([TOOL_CALL_TURN, { content: "Done.", finishReason: "stop", provider: "fake" }]);
    const deps = makeDeps(model, [new FakeTool("read_file")]);

    const result = await runLoop(deps, makeInput(model));
    expect(result.status).toBe("succeeded");

    expect(model.requests).toHaveLength(2);
    // toolsHaveRun=true but toolChoice unset → override must stay undefined
    // (the model-caller falls back to its own configured default).
    expect(model.requests[0]?.toolChoice).toBeUndefined();
    expect(model.requests[1]?.toolChoice).toBeUndefined();
  });

  it("TC04: one-shot claim-repair forceToolChoice wins over the downgrade", async () => {
    const model = new CapturingModel([
      // Step 1: non-file tool runs → toolsHaveRun=true, fileActionSucceeded=false
      TOOL_CALL_TURN,
      // Step 2: prose file claim, finish_reason=stop, zero tool calls → claim repair
      FILE_CLAIM_TURN,
      // Step 3: repair turn — forceToolChoice must win → "required"
      {
        content: "",
        finishReason: "tool-calls", provider: "fake",
        toolCalls: [{ id: "c2", name: "write_file", args: { path: "index.html", content: "<html></html>" } }],
      },
      // Step 4: final answer
      { content: "Done.", finishReason: "stop", provider: "fake" },
    ]);
    const deps = makeDeps(model, [
      new FakeTool("read_file"),
      new FakeTool("write_file", undefined, undefined, "write"),
    ], { toolChoice: "required" });

    const result = await runLoop(deps, makeInput(model));
    expect(result.status).toBe("succeeded");

    expect(model.requests.length).toBeGreaterThanOrEqual(4);
    expect(model.requests[0]?.toolChoice).toBe("required"); // initial configured value
    expect(model.requests[1]?.toolChoice).toBe("auto"); // tool ran → downgrade
    expect(model.requests[2]?.toolChoice).toBe("required"); // claim repair forces
    expect(model.requests[3]?.toolChoice).toBe("auto"); // force consumed → downgrade resumes
  });

  it("TC05: last/no-tools step keeps tool_choice=none (disableTools invariant)", async () => {
    const model = new CapturingModel([TOOL_CALL_TURN, { content: "Done.", finishReason: "stop", provider: "fake" }]);
    // maxSteps=2 → step index 1 is the last step → disableTools=true
    const deps = makeDeps(model, [new FakeTool("read_file")], { toolChoice: "required" });
    (deps as { maxSteps: number }).maxSteps = 2;

    const result = await runLoop(deps, makeInput(model));
    expect(result.status).toBe("succeeded");

    expect(model.requests).toHaveLength(2);
    // toolsHaveRun=true would downgrade, but disableTools must win → "none".
    expect(model.requests[1]?.toolChoice).toBe("none");
    expect(model.requests[1]?.tools).toEqual([]);
  });
});

describe("Phase 7 group 2 — kernel wiring of modelSettings.toolChoice/resetToolChoice", () => {
  it("TC06: kernel passes modelSettings.toolChoice and downgrades after a tool run", async () => {
    const readTool = new FakeTool("read_file");
    const model = new CapturingModel([
      TOOL_CALL_TURN,
      { content: "Done.", finishReason: "stop", provider: "fake" },
    ]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({
      model,
      store,
      tools: [readTool],
      maxSteps: 5,
      modelSettings: { toolChoice: "required" },
    });

    const handle = kernel.run("read something", testCtx);
    await handle.completed;

    expect(model.requests.length).toBeGreaterThanOrEqual(2);
    expect(model.requests[0]?.toolChoice).toBe("required");
    expect(model.requests[1]?.toolChoice).toBe("auto");
  });

  it("TC07: kernel modelSettings.resetToolChoice=false disables the downgrade", async () => {
    const readTool = new FakeTool("read_file");
    const model = new CapturingModel([
      TOOL_CALL_TURN,
      { content: "Done.", finishReason: "stop", provider: "fake" },
    ]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({
      model,
      store,
      tools: [readTool],
      maxSteps: 5,
      modelSettings: { toolChoice: "required", resetToolChoice: false },
    });

    const handle = kernel.run("read something", testCtx);
    await handle.completed;

    expect(model.requests.length).toBeGreaterThanOrEqual(2);
    expect(model.requests[0]?.toolChoice).toBe("required");
    expect(model.requests[1]?.toolChoice).toBe("required");
  });
});
