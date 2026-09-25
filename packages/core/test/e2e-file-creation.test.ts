import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RequestContext, RequestId, RunId, TraceId } from "@vinhnt-sdk/schema";
import type { ChatMessage, ModelProvider, ModelRequest, ModelResponse } from "../src/model.js";
import { runLoop } from "../src/kernel/run-loop.js";
import type { RunLoopDeps, RunLoopInput } from "../src/kernel/run-loop.js";
import { ModelCaller } from "@vinhnt-sdk/llm";
import { CircuitBreaker, PermissionGate, RunStateMachine, StepExecutor } from "@vinhnt-sdk/step-executor";
import { ToolSaga, createWriteFileTool } from "@vinhnt-sdk/tools";
import type { ToolDefinition } from "@vinhnt-sdk/tools";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeApprovalStore } from "../src/fakes/fake-approval-store.js";

/**
 * E2E: message → real write_file tool call → file lands on disk.
 *
 * Definition of Done (single source of truth):
 *   send a message → file exists on disk → tool events are emitted
 *   (tool.invoked + tool.completed), which is what the agent gateway turns
 *   into `tool_executions` rows and `tool_calls_count > 0`.
 *
 * Cases:
 *   A. Happy path      — model calls write_file with valid args.
 *   B. Claim repair    — model only claims in prose → repair → dispatches.
 *   C. Self-correction — bad args → tool fails → corrected call dispatches
 *                        WITH tool events (self-correction used to run the
 *                        corrected tool silently — no tool.invoked /
 *                        tool.completed; fixed in self-correction.ts).
 */

const testCtx: RequestContext = {
  requestId: "req_e2e_fc" as RequestId,
  traceId: "trace_e2e_fc" as TraceId,
  actorId: "test",
  tenantId: "default",
};

interface CapturedEvent {
  readonly type: string;
  readonly data: Record<string, unknown>;
}

class CapturingModel extends FakeModelProvider {
  readonly seen: ChatMessage[][] = [];
  constructor(responses: ConstructorParameters<typeof FakeModelProvider>[0]) {
    super(responses);
  }
  override async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    this.seen.push([...request.messages]);
    return super.generate(request, signal);
  }
}

function countType(events: readonly CapturedEvent[], type: string): number {
  return events.filter((e) => e.type === type).length;
}

function hasToolEvent(events: readonly CapturedEvent[], type: string, toolName: string): boolean {
  return events.some((e) => e.type === type && String(e.data.toolName) === toolName);
}

function makeDeps(
  model: ModelProvider,
  tools: ToolDefinition[],
  stepEvents: CapturedEvent[],
  opts: { selfCorrectOnFailure?: boolean } = {},
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
    store: {
      emitEvent: async (e) => {
        stepEvents.push({ type: e.type, data: e.data as unknown as Record<string, unknown> });
      },
    },
    addSessionMessage: async () => {},
    pluginManager: undefined,
    permissionGate,
    modelCaller,
    maxToolCallsPerStep: 20,
    maxSelfCorrectAttempts: 2,
    selfCorrectOnFailure: opts.selfCorrectOnFailure ?? false,
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
    maxSteps: 6,
    maxTokens: 4096,
    thinkingBudget: 0,
    stepTimeout: 60_000,
  } as RunLoopDeps;
}

function makeInput(
  model: ModelProvider,
  runEvents: CapturedEvent[],
  overrides: Partial<RunLoopInput> = {},
): RunLoopInput {
  return {
    prompt: "Tạo file index.html chứa chữ hello",
    runId: "run_e2e_fc_1" as RunId,
    ctx: testCtx,
    runAbort: new AbortController(),
    runModel: model,
    addSessionMessage: async () => {},
    emitEvent: async (event) => {
      runEvents.push({ type: event.type, data: event.data });
    },
    setState: () => {},
    // run.completed is persisted through the dedicated atomic channel (emitCompleted),
    // not the regular emitEvent stream — capture it here for assertions.
    emitCompleted: async (event) => {
      runEvents.push({ type: event.type, data: event.data });
    },
    emitFail: async () => {},
    ...overrides,
  };
}

const HTML_CONTENT = "<!DOCTYPE html>\n<html><body>hello</body></html>\n";

const PROSE_HTML_CLAIM =
  "I have created a new file called `index.html` with the following content:\n\n" +
  "```html\n" +
  "<!DOCTYPE html>\n<html><body>hello</body></html>\n".repeat(10) +
  "```\n\n" +
  "The file is ready to use.";

describe("E2E message → file creation (Definition of Done)", () => {
  let workspace: string;
  let stepEvents: CapturedEvent[];
  let runEvents: CapturedEvent[];

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "vinhnt-e2e-fc-"));
    stepEvents = [];
    runEvents = [];
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("A. happy path: model calls write_file → file on disk + tool events + toolCallCount", async () => {
    const model = new CapturingModel([
      {
        content: "",
        finishReason: "tool-calls",
        toolCalls: [{ id: "c1", name: "write_file", args: { filePath: "index.html", content: HTML_CONTENT } }],
      },
      { content: "File created.", finishReason: "stop" },
    ]);
    const writeTool = createWriteFileTool(() => workspace);
    const deps = makeDeps(model, [writeTool], stepEvents);

    const result = await runLoop(deps, makeInput(model, runEvents));

    const file = join(workspace, "index.html");
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf-8")).toBe(HTML_CONTENT);

    expect(hasToolEvent(stepEvents, "tool.invoked", "write_file")).toBe(true);
    expect(hasToolEvent(stepEvents, "tool.completed", "write_file")).toBe(true);
    expect(countType(stepEvents, "tool.failed")).toBe(0);

    const stepCompleted = runEvents.filter((e) => e.type === "step.completed");
    expect(stepCompleted.some((e) => Number(e.data.toolCallCount) >= 1)).toBe(true);
    expect(runEvents.some((e) => e.type === "run.completed" && String(e.data.status) === "succeeded")).toBe(true);

    expect(result.status).toBe("succeeded");
  });

  it("B. claim repair: prose-only claim → repair prompt → write_file dispatches", async () => {
    const model = new CapturingModel([
      { content: PROSE_HTML_CLAIM, finishReason: "stop" },
      {
        content: "",
        finishReason: "tool-calls",
        toolCalls: [{ id: "c1", name: "write_file", args: { filePath: "index.html", content: HTML_CONTENT } }],
      },
      { content: "Done.", finishReason: "stop" },
    ]);
    const writeTool = createWriteFileTool(() => workspace);
    const deps = makeDeps(model, [writeTool], stepEvents);

    const result = await runLoop(deps, makeInput(model, runEvents));

    expect(model.seen.length).toBeGreaterThanOrEqual(2);
    const repairTurn = model.seen[1]!;
    const repairText = repairTurn.map((m) => (typeof m.content === "string" ? m.content : "")).join("\n");
    expect(repairText).toMatch(/write_file|did not call/i);

    const file = join(workspace, "index.html");
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf-8")).toBe(HTML_CONTENT);

    expect(hasToolEvent(stepEvents, "tool.invoked", "write_file")).toBe(true);
    expect(hasToolEvent(stepEvents, "tool.completed", "write_file")).toBe(true);

    expect(result.status).toBe("succeeded");
  });

  it("C. self-correction: bad args → corrected call dispatches WITH tool events", async () => {
    const model = new CapturingModel([
      {
        content: "",
        finishReason: "tool-calls",
        // Mimics the real runtime failure: filePath is an object, not a string.
        toolCalls: [{ id: "c1", name: "write_file", args: { filePath: { path: "index.html" }, content: HTML_CONTENT } }],
      },
      {
        content: "",
        finishReason: "tool-calls",
        toolCalls: [{ id: "c2", name: "write_file", args: { filePath: "index.html", content: HTML_CONTENT } }],
      },
      { content: "Fixed and written.", finishReason: "stop" },
    ]);
    const writeTool = createWriteFileTool(() => workspace);
    const deps = makeDeps(model, [writeTool], stepEvents, { selfCorrectOnFailure: true });

    const result = await runLoop(deps, makeInput(model, runEvents));

    const file = join(workspace, "index.html");
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf-8")).toBe(HTML_CONTENT);

    // The failed first attempt and the corrected attempt must both be visible.
    expect(countType(stepEvents, "tool.self_correcting")).toBeGreaterThanOrEqual(1);
    expect(countType(stepEvents, "tool.invoked")).toBeGreaterThanOrEqual(2);
    expect(hasToolEvent(stepEvents, "tool.completed", "write_file")).toBe(true);

    expect(result.status).toBe("succeeded");
  });
});
