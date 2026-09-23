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
import { FakeTool } from "../src/fakes/fake-tool.js";
import { FakeApprovalStore } from "../src/fakes/fake-approval-store.js";

const testCtx: RequestContext = {
  requestId: "req_claim" as RequestId,
  traceId: "trace_claim" as TraceId,
  actorId: "test",
  tenantId: "default",
};

class CapturingModel extends FakeModelProvider {
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

function makeDeps(model: ModelProvider, tools: FakeTool[] = []): RunLoopDeps {
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

function makeInput(overrides: Partial<RunLoopInput> = {}): RunLoopInput {
  return {
    prompt: "create the file",
    runId: "run_claim_1" as RunId,
    ctx: testCtx,
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

const PROSE_FILE_CLAIM =
  "I have created a new file called `app.ts` with the following content:\n\n" +
  "```typescript\n" +
  "export function main(): void {\n" +
  "  console.log('hello');\n" +
  "}\n".repeat(20) +
  "```\n\n" +
  "The file is ready to use.";

describe("P0'-1 claim-vs-action repair", () => {
  it("repairs when finish_reason=stop claims file write with zero tool calls", async () => {
    const model = new CapturingModel([
      { content: PROSE_FILE_CLAIM, finishReason: "stop" },
      { content: "", finishReason: "tool-calls", toolCalls: [{ id: "c1", name: "write_file", args: { path: "app.ts", content: "x" } }] },
    ]);
    const writeTool = new FakeTool("write_file", undefined, undefined, "write");
    const deps = makeDeps(model, [writeTool]);

    await runLoop(deps, makeInput({ runModel: model }));

    // Second model call must include a repair prompt
    expect(model.seen.length).toBeGreaterThanOrEqual(2);
    const repairTurn = model.seen[1]!;
    const repairText = repairTurn.map((m) => (typeof m.content === "string" ? m.content : "")).join("\n");
    expect(repairText).toMatch(/write_file|did not call/i);
  });

  it("does NOT repair when finish_reason=tool_calls (handled by toolCallRepair path)", async () => {
    const model = new CapturingModel([
      { content: PROSE_FILE_CLAIM, finishReason: "tool-calls" },
      { content: "recovered" },
    ]);
    const deps = makeDeps(model, [new FakeTool("write_file", undefined, undefined, "write")]);

    await runLoop(deps, makeInput({ runModel: model }));

    const repairText = model.seen
      .flat()
      .map((m) => (typeof m.content === "string" ? m.content : ""))
      .join("\n");
    expect(repairText).toMatch(/finish_reason=tool_calls but no tool calls/);
  });

  it("completes without repair when content is a plain short answer", async () => {
    const model = new CapturingModel([
      { content: "42 is the answer.", finishReason: "stop" },
    ]);
    const deps = makeDeps(model, [new FakeTool("write_file", undefined, undefined, "write")]);

    await runLoop(deps, makeInput({ runModel: model }));

    // Only one model call — no claim repair injected
    expect(model.seen).toHaveLength(1);
    const allText = model.seen.flat().map((m) => (typeof m.content === "string" ? m.content : "")).join("\n");
    expect(allText).not.toMatch(/did not call write_file/i);
  });

  it("completes without repair when model already called tools", async () => {
    const model = new CapturingModel([
      {
        content: "",
        finishReason: "tool-calls",
        toolCalls: [{ id: "c1", name: "write_file", args: { path: "a.ts", content: "x" } }],
      },
      { content: "File written.", finishReason: "stop" },
    ]);
    const deps = makeDeps(model, [new FakeTool("write_file", undefined, undefined, "write")]);

    const result = await runLoop(deps, makeInput({ runModel: model }));
    expect(result.status).toBe("succeeded");
  });
});

describe("P0'-7 safety finish_reason suppress", () => {
  it("drops tool calls when finish_reason=length", async () => {
    const model = new CapturingModel([
      {
        content: "partial",
        finishReason: "length",
        toolCalls: [{ id: "c1", name: "write_file", args: { path: "a.ts", content: "x" } }],
      },
      { content: "ok", finishReason: "stop" },
    ]);
    const deps = makeDeps(model, [new FakeTool("write_file", undefined, undefined, "write")]);

    await runLoop(deps, makeInput({ runModel: model }));

    const allText = model.seen.flat().map((m) => (typeof m.content === "string" ? m.content : "")).join("\n");
    expect(allText).toMatch(/finish_reason=length/);
    // tools never executed — no write happened via FakeTool
  });

  it("drops tool calls when finish_reason=content_filter", async () => {
    const model = new CapturingModel([
      {
        content: "blocked",
        finishReason: "content_filter",
        toolCalls: [{ id: "c1", name: "write_file", args: { path: "a.ts", content: "x" } }],
      },
      { content: "ok", finishReason: "stop" },
    ]);
    const deps = makeDeps(model, [new FakeTool("write_file", undefined, undefined, "write")]);

    await runLoop(deps, makeInput({ runModel: model }));

    const allText = model.seen.flat().map((m) => (typeof m.content === "string" ? m.content : "")).join("\n");
    expect(allText).toMatch(/content_filter|content-filter/);
  });

  it("executes tools normally on finish_reason=stop with toolCalls", async () => {
    const model = new CapturingModel([
      {
        content: "",
        finishReason: "stop",
        toolCalls: [{ id: "c1", name: "write_file", args: { path: "a.ts", content: "x" } }],
      },
      { content: "done", finishReason: "stop" },
    ]);
    const tool = new FakeTool("write_file", undefined, undefined, "write");
    const deps = makeDeps(model, [tool]);

    await runLoop(deps, makeInput({ runModel: model }));

    const allText = model.seen.flat().map((m) => (typeof m.content === "string" ? m.content : "")).join("\n");
    expect(allText).not.toMatch(/Tool calls were dropped/);
  });
});
