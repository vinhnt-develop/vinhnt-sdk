import { describe, expect, it, vi } from "vitest";
import type { RequestContext, RequestId, RunId, TraceId } from "@vinhnt-sdk/schema";
import type { ModelProvider, ModelRequest, ModelResponse } from "../src/model.js";
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
import type { Span } from "@vinhnt-sdk/trace";
import type { TracingConfig } from "../src/kernel/run-tracing.js";
import {
  createRunTrace,
  recordChatSpan,
  startToolSpans,
  endToolSpans,
  finishRunTrace,
  VNT_RUN_ID,
  VNT_STEP,
} from "../src/kernel/run-tracing.js";

const testCtx: RequestContext = {
  requestId: "req_g3" as RequestId,
  traceId: "trace_g3" as TraceId,
  actorId: "test",
  tenantId: "default",
};

/** Collect finished span batches (one per run) through the onSpans seam. */
function traceCapture(overrides: Partial<TracingConfig> = {}) {
  const batches: (readonly Span[])[] = [];
  const config: TracingConfig = {
    ...overrides,
    onSpans: (spans) => {
      batches.push(spans);
    },
  };
  return {
    config,
    batches,
    spans(): readonly Span[] {
      if (batches.length === 0) throw new Error("onSpans was not invoked");
      return batches[0]!;
    },
  };
}

interface DepsOptions {
  tracing?: TracingConfig;
  stepTimeout?: number;
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
    stepTimeout: opts.stepTimeout ?? 60_000,
    ...(opts.tracing ? { tracing: opts.tracing } : {}),
  } as RunLoopDeps;
}

function makeInput(model: ModelProvider, runId = "run_g3_1", sessionId?: string): RunLoopInput {
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
    ...(sessionId ? { sessionId } : {}),
  };
}

const DONE_TURN: ModelResponse = {
  content: "Done.",
  finishReason: "stop",
  provider: "fake",
};

const TOOL_CALL_TURN: ModelResponse = {
  content: "",
  finishReason: "tool-calls",
  provider: "fake",
  toolCalls: [{ id: "c1", name: "read_file", args: { path: "a.txt" } }],
};

/** Provider that never resolves — rejects only when the signal aborts. */
class HangingModel extends FakeModelProvider {
  constructor() {
    super([]);
  }
  override async generate(_request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    return new Promise<ModelResponse>((_resolve, reject) => {
      const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
      if (signal?.aborted) {
        onAbort();
        return;
      }
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
}

interface OtlpAttrValue {
  stringValue?: string;
  intValue?: string;
}
interface OtlpAttr {
  key: string;
  value: OtlpAttrValue;
}
interface OtlpWireSpan {
  name: string;
  status: { code: number; message?: string };
  attributes: OtlpAttr[];
}
interface OtlpWireBody {
  resourceSpans: Array<{
    scopeSpans: Array<{ spans: OtlpWireSpan[] }>;
  }>;
}

describe("G3.1 — run-loop GenAI span tree (runLoop + TracingConfig)", () => {
  it("TC01: happy path records invoke_agent root + chat span with semconv attrs (no content by default)", async () => {
    const capture = traceCapture();
    const model = new FakeModelProvider([DONE_TURN]);
    const deps = makeDeps(model, [], { tracing: capture.config });

    const result = await runLoop(deps, makeInput(model, "run_g3_1"));
    expect(result.status).toBe("succeeded");

    expect(capture.batches).toHaveLength(1);
    const spans = capture.spans();
    expect(spans.map((s) => s.name)).toEqual(["invoke_agent", "chat"]);
    const root = spans[0]!;
    const chat = spans[1]!;

    expect(root.status).toBe("ok");
    expect(root.parentId).toBeUndefined();
    expect(root.attributes["gen_ai.operation.name"]).toBe("invoke_agent");
    expect(root.attributes[VNT_RUN_ID]).toBe("run_g3_1");
    expect(root.attributes["vnt.request.trace_id"]).toBe("trace_g3");
    expect(root.attributes["gen_ai.conversation.id"]).toBeUndefined();

    expect(chat.status).toBe("ok");
    expect(chat.parentId).toBe(root.id);
    expect(chat.traceId).toBe(root.traceId);
    expect(chat.attributes).toMatchObject({
      "gen_ai.operation.name": "chat",
      "gen_ai.provider.name": "fake",
      "gen_ai.request.model": "fake-model",
      "gen_ai.response.finish_reasons": ["stop"],
      [VNT_RUN_ID]: "run_g3_1",
      [VNT_STEP]: 0,
    });
    // ModelCaller's stream path attaches locally-estimated usage (the fake
    // provider streams no usage events) — presence is what semconv requires.
    expect(typeof chat.attributes["gen_ai.usage.input_tokens"]).toBe("number");
    expect(typeof chat.attributes["gen_ai.usage.output_tokens"]).toBe("number");
    // Default tier = no_content: metadata only, no message payloads.
    expect(chat.attributes["gen_ai.input.messages"]).toBeUndefined();
    expect(chat.attributes["gen_ai.output.messages"]).toBeUndefined();
    expect(chat.endTimeMs).toBeGreaterThan(0);
  });

  it("TC02: tool runs add execute_tool spans and sessionId flows into conversation.id", async () => {
    const capture = traceCapture();
    const model = new FakeModelProvider([TOOL_CALL_TURN, { content: "Done.", finishReason: "stop", provider: "fake" }]);
    const deps = makeDeps(model, [new FakeTool("read_file")], { tracing: capture.config });

    const result = await runLoop(deps, makeInput(model, "run_g3_2", "sess_g3"));
    expect(result.status).toBe("succeeded");

    const spans = capture.spans();
    expect(spans.map((s) => s.name)).toEqual(["invoke_agent", "chat", "execute_tool", "chat"]);
    const [root, chat0, tool0, chat1] = spans as [
      Span, Span, Span, Span,
    ];

    expect(root.attributes["gen_ai.conversation.id"]).toBe("sess_g3");
    expect(chat0.attributes["gen_ai.conversation.id"]).toBe("sess_g3");
    expect(chat1.attributes["gen_ai.conversation.id"]).toBe("sess_g3");

    expect(chat0.status).toBe("ok");
    expect(chat1.status).toBe("ok");
    expect(chat1.attributes[VNT_STEP]).toBe(1);

    expect(tool0.status).toBe("ok");
    expect(tool0.parentId).toBe(root.id);
    expect(tool0.attributes).toMatchObject({
      "gen_ai.operation.name": "execute_tool",
      "gen_ai.tool.name": "read_file",
      "gen_ai.tool.call.id": "c1",
      "gen_ai.conversation.id": "sess_g3",
      [VNT_RUN_ID]: "run_g3_2",
      [VNT_STEP]: 0,
    });
    expect(tool0.endTimeMs).toBeGreaterThan(0);
  });

  it("TC03: tracing.enabled=false records nothing (onSpans never fires)", async () => {
    const capture = traceCapture({ enabled: false });
    const model = new FakeModelProvider([DONE_TURN]);
    const deps = makeDeps(model, [], { tracing: capture.config });

    const result = await runLoop(deps, makeInput(model));
    expect(result.status).toBe("succeeded");
    expect(capture.batches).toHaveLength(0);
  });

  it("TC04: contentMode='full' opts into input/output message attributes", async () => {
    const capture = traceCapture({ contentMode: "full" });
    const model = new FakeModelProvider([DONE_TURN]);
    const deps = makeDeps(model, [], { tracing: capture.config });

    const result = await runLoop(deps, makeInput(model));
    expect(result.status).toBe("succeeded");

    const chat = capture.spans().find((s) => s.name === "chat")!;
    expect(chat.attributes["gen_ai.input.messages"]).toContain("do work");
    expect(chat.attributes["gen_ai.output.messages"]).toContain("Done.");
  });

  it("TC05: OTLP export fires once when an endpoint is configured (fake fetch)", async () => {
    const fetchSpy = vi.fn(
      async (_input: string, _init?: RequestInit): Promise<Response> =>
        new Response("{}", { status: 200 }),
    );
    const capture = traceCapture({
      otlp: {
        endpoint: "http://otlp.test/v1/traces",
        fetch: fetchSpy,
        env: {},
      },
    });
    const model = new FakeModelProvider([DONE_TURN]);
    const deps = makeDeps(model, [], { tracing: capture.config });

    const result = await runLoop(deps, makeInput(model));
    expect(result.status).toBe("succeeded");
    expect(capture.batches).toHaveLength(1);

    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string) as OtlpWireBody;
    const wireSpans = body.resourceSpans[0]!.scopeSpans[0]!.spans;
    const wireNames = wireSpans.map((s) => s.name);
    expect(wireNames).toContain("invoke_agent");
    expect(wireNames).toContain("chat");

    const wireRoot = wireSpans.find((s) => s.name === "invoke_agent")!;
    expect(wireRoot.status.code).toBe(1); // OTLP STATUS_OK
    const wireChat = wireSpans.find((s) => s.name === "chat")!;
    const requestModel = wireChat.attributes.find((a) => a.key === "gen_ai.request.model");
    expect(requestModel?.value.stringValue).toBe("fake-model");
  });

  it("TC06: no endpoint configured → no OTLP export attempt", async () => {
    const fetchSpy = vi.fn(
      async (_input: string, _init?: RequestInit): Promise<Response> =>
        new Response("{}", { status: 200 }),
    );
    const capture = traceCapture({ otlp: { fetch: fetchSpy, env: {} } });
    const model = new FakeModelProvider([DONE_TURN]);
    const deps = makeDeps(model, [], { tracing: capture.config });

    const result = await runLoop(deps, makeInput(model));
    expect(result.status).toBe("succeeded");
    expect(capture.batches).toHaveLength(1);

    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("TC07: failed run (maxSteps=0) ends the root span with status=error and no chat spans", async () => {
    const capture = traceCapture();
    const model = new FakeModelProvider([DONE_TURN]);
    const deps = makeDeps(model, [], { tracing: capture.config });
    (deps as { maxSteps: number }).maxSteps = 0;

    const result = await runLoop(deps, makeInput(model, "run_g3_fail"));
    expect(result.status).toBe("failed");

    const spans = capture.spans();
    expect(spans.map((s) => s.name)).toEqual(["invoke_agent"]);
    expect(spans[0]!.status).toBe("error");
  });

  it("TC08: a throwing tool yields an execute_tool span with status=error", async () => {
    const capture = traceCapture();
    const throwingModel = new FakeModelProvider([
      {
        content: "",
        finishReason: "tool-calls",
        provider: "fake",
        toolCalls: [{ id: "c1", name: "bad_tool", args: {} }],
      },
      { content: "Done.", finishReason: "stop", provider: "fake" },
    ]);
    const deps = makeDeps(
      throwingModel,
      [new FakeTool("bad_tool", async () => { throw new Error("boom"); })],
      { tracing: capture.config },
    );

    const result = await runLoop(deps, makeInput(throwingModel, "run_g3_toolfail"));
    expect(result.status).toBe("succeeded");

    const toolSpan = capture.spans().find((s) => s.name === "execute_tool")!;
    expect(toolSpan.attributes["gen_ai.tool.name"]).toBe("bad_tool");
    expect(toolSpan.status).toBe("error");
    expect(toolSpan.endTimeMs).toBeGreaterThan(0);
  });

  it("TC09: step timeout still records its chat span with status=timeout; run root ends error", async () => {
    const capture = traceCapture();
    const model = new HangingModel();
    const deps = makeDeps(model, [], { tracing: capture.config, stepTimeout: 80 });
    (deps as { maxSteps: number }).maxSteps = 2;

    const result = await runLoop(deps, makeInput(model, "run_g3_timeout"));
    expect(result.status).toBe("failed");

    const spans = capture.spans();
    const root = spans.find((s) => s.name === "invoke_agent")!;
    expect(root.status).toBe("error");
    const chats = spans.filter((s) => s.name === "chat");
    expect(chats).toHaveLength(2);
    for (const chat of chats) {
      expect(chat.status).toBe("timeout");
      expect(chat.endTimeMs).toBeGreaterThan(0);
      expect(chat.attributes["gen_ai.usage.input_tokens"]).toBeUndefined();
    }
  });
});

describe("G3.1 — kernel wiring (AgentKernelConfig.tracing)", () => {
  it("TC10: AgentKernel passes tracing config through to the run loop", async () => {
    const capture = traceCapture();
    const model = new FakeModelProvider([DONE_TURN]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({
      model,
      store,
      tools: [],
      maxSteps: 5,
      tracing: capture.config,
    });

    const handle = kernel.run("do work", testCtx);
    await handle.completed;

    expect(capture.batches).toHaveLength(1);
    const spans = capture.spans();
    expect(spans.map((s) => s.name)).toContain("invoke_agent");
    expect(spans.map((s) => s.name)).toContain("chat");
    expect(spans[0]!.status).toBe("ok");
  });

  it("TC11: kernel default (no tracing config) keeps the run working — recording is passive", async () => {
    const model = new FakeModelProvider([DONE_TURN]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 5 });

    // No onSpans seam, no endpoint → nothing observable, but the always-on
    // in-memory recorder must not affect the run in any way.
    const handle = kernel.run("do work", testCtx);
    await handle.completed;
  });
});

describe("G3.1 — run-tracing unit behavior", () => {
  it("TC12: endToolSpans maps outcomes — ok/error/missing-outcome", async () => {
    const trace = createRunTrace(
      { onSpans: () => {} },
      { runId: "run_unit" as RunId, requestTraceId: "trace_unit" as TraceId },
    )!;
    const spans = startToolSpans(
      trace,
      0,
      [
        { id: "c1", name: "shell" },
        { id: "c2", name: "write_file" },
        { id: "c3", name: "read_file" },
        { id: "c4", name: "bad_tool" },
      ],
      Date.now(),
    );
    expect(spans).toHaveLength(4);

    endToolSpans(trace, spans, [
      { toolName: "shell", exitCode: 0 },
      { toolName: "write_file", exitCode: 1 },
      { toolName: "read_file" },
      // bad_tool: no outcome (denied/failed) → error
    ]);

    expect(spans[0]!.status).toBe("ok");
    expect(spans[1]!.status).toBe("error");
    expect(spans[2]!.status).toBe("ok");
    expect(spans[3]!.status).toBe("error");
    expect(spans[3]!.endTimeMs).toBeGreaterThan(0);
  });

  it("TC13: finishRunTrace invokes onSpans and never throws when onSpans throws", async () => {
    const bad = createRunTrace(
      { onSpans: () => { throw new Error("callback boom"); } },
      { runId: "run_bad" as RunId, requestTraceId: "trace_bad" as TraceId },
    )!;
    await expect(finishRunTrace(bad, "error")).resolves.toBeUndefined();
    expect(bad.rootSpan.status).toBe("error");

    const good = createRunTrace(
      { onSpans: () => {} },
      { runId: "run_good" as RunId, requestTraceId: "trace_good" as TraceId },
    )!;
    await finishRunTrace(good, "cancelled");
    expect(good.rootSpan.status).toBe("cancelled");

    // Disabled trace (createRunTrace returns undefined) is a no-op.
    await expect(finishRunTrace(undefined, "ok")).resolves.toBeUndefined();
  });

  it("TC14: recordChatSpan back-dates the start and honors a timeout status", async () => {
    const trace = createRunTrace(
      {},
      { runId: "run_chat" as RunId, requestTraceId: "trace_chat" as TraceId },
    )!;
    const start = Date.now() - 500;
    const span = recordChatSpan(trace, {
      step: 3,
      startMs: start,
      status: "timeout",
      request: { provider: "openai", model: "gpt-x" },
    });
    expect(span.startTimeMs).toBe(start);
    expect(span.status).toBe("timeout");
    expect(span.attributes["gen_ai.request.model"]).toBe("gpt-x");
    expect(span.attributes[VNT_STEP]).toBe(3);
    expect(span.attributes["gen_ai.output.messages"]).toBeUndefined();
  });

  it("TC15: recordChatSpan maps served response attrs; response provider wins; full content opt-in", () => {
    const trace = createRunTrace(
      { contentMode: "full" },
      { runId: "run_resp" as RunId, requestTraceId: "trace_resp" as TraceId },
    )!;
    const span = recordChatSpan(trace, {
      step: 0,
      startMs: Date.now(),
      request: { provider: "openai", model: "req-model" },
      response: {
        provider: "azure",
        model: "served-model",
        usage: { promptTokens: 11, completionTokens: 7, reasoningTokens: 2 },
        finishReason: "stop",
        content: "Hello.",
        inputMessages: [{ role: "user", content: "hi" }],
      },
    });
    expect(span.attributes).toMatchObject({
      "gen_ai.provider.name": "azure",
      "gen_ai.request.model": "req-model",
      "gen_ai.response.model": "served-model",
      "gen_ai.usage.input_tokens": 11,
      "gen_ai.usage.output_tokens": 7,
      "gen_ai.usage.reasoning_tokens": 2,
      "gen_ai.response.finish_reasons": ["stop"],
    });
    expect(span.attributes["gen_ai.input.messages"]).toContain("hi");
    expect(span.attributes["gen_ai.output.messages"]).toContain("Hello.");
  });
});
