import { describe, expect, it } from "vitest";
import type { RequestContext, RequestId, RunId, TraceId } from "@vinhnt-sdk/schema";
import type { ModelProvider, ModelRequest, ModelResponse } from "../src/model.js";
import { runLoop } from "../src/kernel/run-loop.js";
import type { RunLoopDeps, RunLoopInput } from "../src/kernel/run-loop.js";
import { ModelCaller } from "@vinhnt-sdk/llm";
import { PermissionGate, StepExecutor, CircuitBreaker, RunStateMachine } from "@vinhnt-sdk/step-executor";
import { ToolSaga } from "@vinhnt-sdk/tools";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeTool } from "../src/fakes/fake-tool.js";
import { FakeApprovalStore } from "../src/fakes/fake-approval-store.js";

const testCtx: RequestContext = {
  requestId: "req_e1" as RequestId,
  traceId: "trace_e1" as TraceId,
  actorId: "test",
  tenantId: "default",
};

interface CapturedMessage {
  role: string;
  content: string;
}

class CapturingModel extends FakeModelProvider {
  readonly seen: ChatMessageSnapshot[][] = [];
  constructor(responses: ConstructorParameters<typeof FakeModelProvider>[0]) {
    super(responses);
  }
  override async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    this.seen.push([...request.messages]);
    return super.generate(request, signal);
  }
}

type ChatMessageSnapshot = ModelRequest["messages"][number];

function makeDeps(
  model: ModelProvider,
  captured: CapturedMessage[],
  tools: FakeTool[] = [],
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
    addSessionMessage: async (_sid, role, content) => {
      captured.push({ role, content });
    },
    maxSteps: 5,
    maxTokens: 4096,
    thinkingBudget: 0,
    stepTimeout: 60_000,
  } as RunLoopDeps;
}

function makeInput(overrides: Partial<RunLoopInput> = {}): RunLoopInput {
  return {
    prompt: "write the file",
    runId: "run_e1_1" as RunId,
    ctx: testCtx,
    runAbort: new AbortController(),
    runModel: new FakeModelProvider([{ content: "Done.", provider: "fake" }]),
    addSessionMessage: async () => {},
    emitEvent: async () => {},
    setState: () => {},
    emitCompleted: async () => {},
    emitFail: async () => {},
    ...overrides,
  };
}

describe("E1 empty assistant row suppression", () => {
  it("TC01_skips_assistant_persist_for_tool_only_turn_but_keeps_text_turn", async () => {
    const captured: CapturedMessage[] = [];
    const model = new CapturingModel([
      {
        content: "",
        provider: "fake",
        finishReason: "tool-calls",
        toolCalls: [{ id: "c1", name: "write_file", args: { path: "a.ts", content: "x" } }],
      },
      { content: "File written.", provider: "fake", finishReason: "stop" },
    ]);
    const deps = makeDeps(model, captured, [new FakeTool("write_file", undefined, undefined, "write")]);

    const result = await runLoop(deps, makeInput({ runModel: model }));

    expect(result.status).toBe("succeeded");
    const assistantRows = captured.filter((c) => c.role === "assistant");
    expect(assistantRows).toHaveLength(1);
    expect(assistantRows[0]!.content).toBe("File written.");
    expect(assistantRows.some((c) => c.content.trim() === "")).toBe(false);
  });

  it("TC02_never_persists_empty_assistant_row_when_model_returns_nothing", async () => {
    const captured: CapturedMessage[] = [];
    const model = new CapturingModel([{ content: "", provider: "fake", finishReason: "stop" }]);
    const deps = makeDeps(model, captured, []);

    const result = await runLoop(deps, makeInput({ runModel: model }));

    expect(result.status).toBe("succeeded");
    expect(captured.filter((c) => c.role === "assistant")).toHaveLength(0);
  });

  it("TC03_keeps_partial_text_when_tool_calls_suppressed_by_finish_reason", async () => {
    const captured: CapturedMessage[] = [];
    const model = new CapturingModel([
      {
        content: "partial answer",
        provider: "fake",
        finishReason: "length",
        toolCalls: [{ id: "c1", name: "write_file", args: { path: "a.ts", content: "x" } }],
      },
      { content: "recovered", provider: "fake", finishReason: "stop" },
    ]);
    const deps = makeDeps(model, captured, [new FakeTool("write_file", undefined, undefined, "write")]);

    const result = await runLoop(deps, makeInput({ runModel: model }));

    expect(result.status).toBe("succeeded");
    const assistantRows = captured.filter((c) => c.role === "assistant");
    expect(assistantRows.map((c) => c.content)).toContain("partial answer");
    expect(assistantRows.map((c) => c.content)).toContain("recovered");
    expect(assistantRows.some((c) => c.content.trim() === "")).toBe(false);
  });

  it("TC04_user_prompt_still_persisted_via_input_addSessionMessage", async () => {
    const captured: CapturedMessage[] = [];
    const model = new CapturingModel([{ content: "hi", provider: "fake", finishReason: "stop" }]);
    const deps = makeDeps(model, captured, []);
    const inputCaptured: CapturedMessage[] = [];

    await runLoop(deps, makeInput({
      runModel: model,
      addSessionMessage: async (_sid, role, content) => {
        inputCaptured.push({ role, content });
      },
    }));

    expect(inputCaptured.some((c) => c.role === "user" && c.content === "write the file")).toBe(true);
    expect(captured.filter((c) => c.role === "assistant").map((c) => c.content)).toEqual(["hi"]);
  });

  it("TC05_skips_assistant_persist_for_whitespace_only_content", async () => {
    const captured: CapturedMessage[] = [];
    const model = new CapturingModel([{ content: "   \n\t  ", provider: "fake", finishReason: "stop" }]);
    const deps = makeDeps(model, captured, []);

    const result = await runLoop(deps, makeInput({ runModel: model }));

    expect(result.status).toBe("succeeded");
    expect(captured.filter((c) => c.role === "assistant")).toHaveLength(0);
  });
});
