import { describe, expect, it } from "vitest";
import type { KnownRunEvent, RequestContext, RequestId, RunId, TraceId } from "@vinhnt-sdk/schema";
import type { ModelProvider } from "../src/model.js";
import { GUARDRAIL_OUTPUT_PLACEHOLDER, runLoop } from "../src/kernel/run-loop.js";
import type { RunLoopDeps, RunLoopInput } from "../src/kernel/run-loop.js";
import { ModelCaller } from "@vinhnt-sdk/llm";
import { PermissionGate, StepExecutor, CircuitBreaker, RunStateMachine } from "@vinhnt-sdk/step-executor";
import { ToolSaga } from "@vinhnt-sdk/tools";
import type { Guardrail } from "@vinhnt-sdk/guardrails";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeTool } from "../src/fakes/fake-tool.js";
import { FakeApprovalStore } from "../src/fakes/fake-approval-store.js";

const testCtx: RequestContext = {
  requestId: "req_gr" as RequestId,
  traceId: "trace_gr" as TraceId,
  actorId: "test",
  tenantId: "default",
};

interface CapturedMessage {
  role: string;
  content: string;
  toolCalls?: readonly { id: string; name: string; args: Record<string, unknown> }[];
}

interface CapturedEvent {
  type: string;
  data: Record<string, unknown>;
  persist?: boolean;
}

function denyGuardrail(modifiedContent?: unknown): Guardrail {
  return {
    name: "deny-output",
    scope: "output",
    priority: 1,
    check: async () => ({
      passed: false,
      decision: "deny",
      reason: "blocked by test",
      ...(modifiedContent !== undefined ? { modifiedContent } : {}),
    }),
  };
}

function makeDeps(
  model: ModelProvider,
  captured: CapturedMessage[],
  events: CapturedEvent[],
  options: { guardrails?: readonly Guardrail[]; thinkingBudget?: number; tools?: FakeTool[] } = {},
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
  const emitEvent = async (event: Omit<KnownRunEvent, "sequence">, persist?: boolean) => {
    events.push({
      type: event.type,
      data: event.data as unknown as Record<string, unknown>,
      ...(persist !== undefined ? { persist } : {}),
    });
  };
  const modelCaller = new ModelCaller({
    defaultModel: model,
    modelRegistry: undefined,
    maxTokens: 4096,
    thinkingBudget: options.thinkingBudget ?? 0,
    thinkingPrompt: "Think first.",
    pluginManager: undefined,
    logger: undefined,
    emitEvent,
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
    findTool: (name) => options.tools?.find((t) => t.id === name),
    hasTool: (name) => options.tools?.some((t) => t.id === name) ?? false,
  });
  return {
    modelCaller,
    permissionGate,
    stepExecutor,
    saga,
    store,
    circuitBreaker: new CircuitBreaker(),
    stateMachine,
    addSessionMessage: async (_sid, role, content, extra?: Record<string, unknown>) => {
      captured.push({
        role,
        content,
        ...(extra?.toolCalls
          ? { toolCalls: extra.toolCalls as { id: string; name: string; args: Record<string, unknown> }[] }
          : {}),
      });
    },
    maxSteps: 3,
    maxTokens: 4096,
    thinkingBudget: options.thinkingBudget ?? 0,
    stepTimeout: 60_000,
    ...(options.guardrails ? { outputGuardrails: options.guardrails } : {}),
  } as RunLoopDeps;
}

function makeInput(events: CapturedEvent[], overrides: Partial<RunLoopInput> = {}): RunLoopInput {
  return {
    prompt: "write the file",
    runId: "run_gr_1" as RunId,
    ctx: testCtx,
    runAbort: new AbortController(),
    runModel: new FakeModelProvider([{ content: "Done.", provider: "fake" }]),
    addSessionMessage: async () => {},
    emitEvent: async (event) => {
      events.push({ type: event.type, data: event.data });
    },
    setState: () => {},
    emitCompleted: async () => {},
    emitFail: async () => {},
    ...overrides,
  };
}

function persistedEvents(events: CapturedEvent[]): CapturedEvent[] {
  return events.filter((event) => event.persist !== false);
}

describe("P1.3 output guardrail rejection persistence", () => {
  it("TC01_discards_denied_text_and_persists_data_free_placeholder", async () => {
    const captured: CapturedMessage[] = [];
    const events: CapturedEvent[] = [];
    const model = new FakeModelProvider([
      { content: "SENSITIVE TEXT CANDIDATE", provider: "fake", finishReason: "stop" },
    ]);
    const deps = makeDeps(model, captured, events, { guardrails: [denyGuardrail()] });

    const result = await runLoop(deps, makeInput(events, { runModel: model }));

    expect(result.status).toBe("failed");
    expect(result.error).toContain("Output guardrail denied: blocked by test");
    expect(captured).toContainEqual({ role: "system", content: GUARDRAIL_OUTPUT_PLACEHOLDER });
    expect(captured.some((m) => m.content.includes("SENSITIVE TEXT CANDIDATE"))).toBe(false);
    expect(persistedEvents(events).some((e) => e.type === "llm.response")).toBe(false);
    expect(JSON.stringify(persistedEvents(events))).not.toContain("SENSITIVE TEXT CANDIDATE");
  });

  it("TC02_discards_denied_tool_call_candidate_without_executing_tools", async () => {
    const captured: CapturedMessage[] = [];
    const events: CapturedEvent[] = [];
    let executions = 0;
    const tool = new FakeTool("write_file", async () => {
      executions++;
      return "written";
    }, undefined, "write");
    const model = new FakeModelProvider([
      {
        content: "SENSITIVE TOOL PLAN",
        provider: "fake",
        finishReason: "tool-calls",
        toolCalls: [{ id: "c1", name: "write_file", args: { path: "a.ts", content: "x" } }],
      },
    ]);
    const deps = makeDeps(model, captured, events, { guardrails: [denyGuardrail()], tools: [tool] });

    const result = await runLoop(deps, makeInput(events, { runModel: model }));

    expect(result.status).toBe("failed");
    expect(executions).toBe(0);
    expect(captured.filter((m) => m.role === "assistant")).toHaveLength(0);
    expect(captured.some((m) => m.toolCalls?.length)).toBe(false);
    expect(captured).toContainEqual({ role: "system", content: GUARDRAIL_OUTPUT_PLACEHOLDER });
    expect(persistedEvents(events).some((e) => e.type === "llm.response")).toBe(false);
    expect(JSON.stringify(persistedEvents(events))).not.toContain("SENSITIVE TOOL PLAN");
  });

  it("TC03_persists_only_the_sanitized_suffix_when_guardrail_provides_one", async () => {
    const captured: CapturedMessage[] = [];
    const events: CapturedEvent[] = [];
    const model = new FakeModelProvider([
      { content: "SAFE PREFIX SENSITIVE SUFFIX", provider: "fake", finishReason: "stop" },
    ]);
    const deps = makeDeps(model, captured, events, { guardrails: [denyGuardrail("SAFE PREFIX")] });

    const result = await runLoop(deps, makeInput(events, { runModel: model }));

    expect(result.status).toBe("failed");
    expect(captured).toContainEqual({ role: "assistant", content: "SAFE PREFIX" });
    expect(captured).not.toContainEqual({ role: "system", content: GUARDRAIL_OUTPUT_PLACEHOLDER });
    expect(JSON.stringify(captured)).not.toContain("SENSITIVE SUFFIX");
    expect(JSON.stringify(persistedEvents(events))).not.toContain("SENSITIVE SUFFIX");
  });

  it("TC05_persists_the_safe_response_event_after_a_guardrail_pass", async () => {
    const captured: CapturedMessage[] = [];
    const events: CapturedEvent[] = [];
    const sanitizing: Guardrail = {
      name: "redact-output",
      scope: "output",
      priority: 1,
      check: async () => ({
        passed: true,
        decision: "allow",
        modifiedContent: "SAFE REDACTED OUTPUT",
      }),
    };
    const model = new FakeModelProvider([
      { content: "RAW SECRET OUTPUT", provider: "fake", finishReason: "stop" },
    ]);
    const deps = makeDeps(model, captured, events, { guardrails: [sanitizing] });

    const result = await runLoop(deps, makeInput(events, { runModel: model }));

    expect(result.status).toBe("succeeded");
    expect(captured).toContainEqual({ role: "assistant", content: "SAFE REDACTED OUTPUT" });
    const responseEvent = persistedEvents(events).find((event) => event.type === "llm.response");
    expect(responseEvent?.data.content).toBe("SAFE REDACTED OUTPUT");
    expect(JSON.stringify(persistedEvents(events))).not.toContain("RAW SECRET OUTPUT");
  });

  it("TC04_keeps_reasoning_events_but_discards_the_denied_candidate", async () => {
    const captured: CapturedMessage[] = [];
    const events: CapturedEvent[] = [];
    const model = new FakeModelProvider([
      { content: "PRIVATE REASONING", provider: "fake", finishReason: "stop" },
      { content: "PRIVATE CANDIDATE", provider: "fake", finishReason: "stop" },
    ]);
    const deps = makeDeps(model, captured, events, {
      guardrails: [denyGuardrail()],
      thinkingBudget: 16,
    });

    const result = await runLoop(deps, makeInput(events, { runModel: model }));

    expect(result.status).toBe("failed");
    const thinking = persistedEvents(events).find((e) => e.type === "thinking.completed");
    expect(thinking?.data.content).toBe("PRIVATE REASONING");
    expect(captured.some((m) => m.content.includes("PRIVATE CANDIDATE"))).toBe(false);
    expect(persistedEvents(events).some((e) => e.type === "llm.response")).toBe(false);
    expect(JSON.stringify(persistedEvents(events))).not.toContain("PRIVATE CANDIDATE");
  });
});
