import { describe, expect, it } from "vitest";
import type { RequestContext, RequestId, RunId, TraceId, AgentId } from "@vinhnt-sdk/schema";
import type { ChatMessage, ModelProvider, ModelRequest, ModelResponse } from "../src/model.js";
import { runLoop } from "../src/kernel/run-loop.js";
import type { RunLoopDeps, RunLoopInput } from "../src/kernel/run-loop.js";
import type { ContextRegistry, ContextSourceKey, ReconcileResult } from "../src/system-context/types.js";
import { ModelCaller } from "@vinhnt-sdk/llm";
import { PermissionGate, StepExecutor, CircuitBreaker, RunStateMachine } from "@vinhnt-sdk/step-executor";
import { ToolSaga } from "@vinhnt-sdk/tools";
import { InMemorySessionState } from "@vinhnt-sdk/session";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeTool } from "../src/fakes/fake-tool.js";
import { FakeApprovalStore } from "../src/fakes/fake-approval-store.js";
import { AgentKernel } from "../src/kernel/kernel.js";

const testCtx: RequestContext = {
  requestId: "req_sysprompt" as RequestId,
  traceId: "trace_sysprompt" as TraceId,
  actorId: "test",
  tenantId: "default",
};

/** Captures every message array passed to the model. */
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

function makeDeps(model: ModelProvider, tools: FakeTool[] = []): {
  deps: RunLoopDeps;
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
    findTool: (name) => tools.find((t) => t.id === name),
    hasTool: (name) => tools.some((t) => t.id === name),
  });
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
  return { deps, store };
}

function makeInput(overrides: Partial<RunLoopInput> = {}): RunLoopInput {
  return {
    prompt: "do the work",
    runId: "run_sysprompt_1" as RunId,
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

/** Registry that returns a fixed baseline on initialize and one `updated` reconcile. */
function makeRegistry(opts: { baseline?: string; update?: string }): ContextRegistry {
  let initialized = false;
  return {
    register() {},
    unregister() {},
    async initialize() {
      initialized = true;
      return { baseline: opts.baseline ?? "", snapshots: new Map() };
    },
    async reconcile(): Promise<ReconcileResult> {
      if (!initialized) {
        const baseline = opts.baseline ?? "";
        initialized = true;
        return { type: "replaced", systemContext: { baseline, snapshots: new Map() } };
      }
      if (opts.update) {
        return {
          type: "updated",
          update: opts.update,
          snapshot: { key: "" as ContextSourceKey, value: null, rendered: opts.update },
        };
      }
      return { type: "unchanged" };
    },
  };
}

describe("RV-40: real system head", () => {
  it("sends the agent system prompt as a real `system` message at the head", async () => {
    const model = new CapturingModel([{ content: "Done." }]);
    const { deps } = makeDeps(model);

    await runLoop(deps, makeInput({
      runModel: model,
      prompt: "Write a function",
      systemPrompt: "You are a coding expert.",
    }));

    const sent = model.seen[0]!;
    expect(sent[0]!.role).toBe("system");
    expect(sent[0]!.content).toContain("You are a coding expert.");

    const systemMsgs = sent.filter((m) => m.role === "system");
    expect(systemMsgs.length).toBeGreaterThan(0);
    // The user turn carries only the raw prompt — no flattened system text.
    const userMsg = sent.find((m) => m.role === "user");
    expect(userMsg?.content).toBe("Write a function");
    expect(String(userMsg?.content)).not.toContain("coding expert");
  });

  it("merges the context baseline into the head system message on initialize", async () => {
    const model = new CapturingModel([{ content: "Done." }]);
    const { deps } = makeDeps(model);
    (deps as { systemContext?: ContextRegistry }).systemContext = makeRegistry({ baseline: "AGENTS.md baseline" });

    await runLoop(deps, makeInput({
      runModel: model,
      prompt: "hi",
      systemPrompt: "You are an agent.",
    }));

    const sent = model.seen[0]!;
    const systemMsgs = sent.filter((m) => m.role === "system");
    expect(systemMsgs).toHaveLength(1);
    expect(systemMsgs[0]!.content).toContain("You are an agent.");
    expect(systemMsgs[0]!.content).toContain("AGENTS.md baseline");
    expect(sent[0]!.role).toBe("system");
  });

  it("merges reconciled context updates into the head system message (no mid-conversation system)", async () => {
    const model = new CapturingModel([
      { content: "", toolCalls: [{ id: "c1", name: "read_file", args: { path: "a.txt" } }] },
      { content: "Final answer." },
    ]);
    const { deps } = makeDeps(model, [new FakeTool("read_file", async () => "file content")]);
    (deps as { systemContext?: ContextRegistry }).systemContext = makeRegistry({
      baseline: "AGENTS.md baseline",
      update: "memory: goals updated",
    });

    await runLoop(deps, makeInput({
      runModel: model,
      prompt: "Do it",
      systemPrompt: "You are an agent.",
    }));

    expect(model.seen.length).toBe(2);
    for (const sent of model.seen) {
      expect(sent[0]!.role).toBe("system");
      const systemMsgs = sent.filter((m) => m.role === "system");
      expect(systemMsgs).toHaveLength(1);
      expect(systemMsgs[0]!.content).toContain("You are an agent.");
    }
    // The reconciled update was appended to the head system message, not pushed
    // as a mid-conversation `system` message.
    const step1 = model.seen[1]!;
    expect(step1[0]!.content).toContain("memory: goals updated");
    expect(step1.filter((m) => m.role === "system").length).toBe(1);
  });

  it("re-injects the system head when resuming from persisted history", async () => {
    const model = new CapturingModel([{ content: "Continuing..." }]);
    const { deps } = makeDeps(model);

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
      systemPrompt: "You are a coding expert.",
      prompt: "continue",
    }));

    const sent = model.seen[0]!;
    expect(sent[0]!.role).toBe("system");
    expect(sent[0]!.content).toContain("You are a coding expert.");
    // Restored history appears exactly once.
    expect(sent.filter((m) => m.role === "user" && m.content === "first request")).toHaveLength(1);
    // The steering prompt comes after the restored history.
    const steer = sent.findIndex((m) => m.role === "user" && m.content === "continue");
    const historyEnd = sent.findIndex((m) => m.role === "assistant" && m.content === "first response");
    expect(steer).toBeGreaterThan(historyEnd);
  });

  it("kernel wires the agent system prompt as a real system head (per-run)", async () => {
    const model = new CapturingModel([{ content: "OK" }]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 5 });
    kernel.setCurrentAgent({
      id: "default" as AgentId,
      profile: { name: "Helper", description: "Helps with tasks" },
      capabilities: { streaming: true },
      systemPrompt: "You are a coding expert.",
    });

    await kernel.run("Write a function", testCtx).completed;

    const sent = model.seen[0]!;
    expect(sent[0]!.role).toBe("system");
    const sys = String(sent[0]!.content);
    expect(sys).toContain("Helper");
    expect(sys).toContain("Helps with tasks");
    expect(sys).toContain("You are a coding expert.");
    const user = sent.find((m) => m.role === "user");
    expect(user?.content).toBe("Write a function");
  });

  it("run.started audit prompt still contains both system and user text", async () => {
    const model = new CapturingModel([{ content: "OK" }]);
    const { deps, store } = makeDeps(model);

    await runLoop(deps, makeInput({
      runModel: model,
      prompt: "Write a function",
      systemPrompt: "You are a coding expert.",
      emitEvent: async (event) => {
        await store.appendWithSequence({ ...event, sequence: 0 } as Parameters<FakeRunEventStore["append"]>[0]);
      },
    }));

    const events = await store.list("run_sysprompt_1" as RunId);
    const started = events.find((e) => e.type === "run.started");
    const p = String(((started?.data as { prompt?: unknown }) ?? {}).prompt ?? "");
    expect(p).toContain("You are a coding expert.");
    expect(p).toContain("Write a function");
  });
});