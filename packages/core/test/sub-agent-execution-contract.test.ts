import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { AgentConfig, AgentId, RequestContext, RequestId, RunId, TraceId } from "@vinhnt-sdk/schema";
import { AgentKernel } from "../src/kernel/kernel.js";
import { defineTool } from "../src/index.js";
import { FakeAgentRegistry } from "../src/fakes/fake-agent-registry.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import type { ModelRequest, ModelResponse } from "../src/model.js";
import {
  buildSubAgentExecution,
  runAgent,
  runAgentsParallel,
  type SubAgentRunnerDeps,
} from "../src/kernel/sub-agent-runner.js";

const ctx: RequestContext = {
  requestId: "req-contract" as RequestId,
  traceId: "trace-contract" as TraceId,
  actorId: "tester",
  tenantId: "default",
};

const parent: AgentConfig = {
  id: "parent" as AgentId,
  profile: { name: "Parent", description: "Parent agent" },
  capabilities: {},
  systemPrompt: "parent",
};

function childAgent(id: string, allowlist: string[]): AgentConfig {
  return {
    id: id as AgentId,
    profile: { name: id, description: id },
    capabilities: {},
    permissions: {
      allowedTools: allowlist,
      deniedTools: ["bash"],
      maxSteps: 4,
      maxTokens: 2000,
    },
    systemPrompt: id,
  } as AgentConfig;
}

function makeDeps(
  registry: FakeAgentRegistry,
  runFn: SubAgentRunnerDeps["runFn"],
): SubAgentRunnerDeps {
  return {
    agentRegistry: registry,
    sessionState: undefined,
    stateMachine: { runIdStack: [], isActiveRun: () => false },
    store: {
      getSnapshot: async (runId: string) => ({ state: { finalOutput: `output:${runId}` } }),
      list: async () => [],
    },
    modelCaller: {},
    maxSubAgentDepth: 3,
    currentAgentRef: { value: parent },
    currentDepthRef: { value: 0 },
    agentChainRef: { value: new Set() },
    runFn,
  } as unknown as SubAgentRunnerDeps;
}

function completedHandle(runId: string) {
  return {
    runId: runId as RunId,
    completed: Promise.resolve(),
    abort: () => undefined,
  };
}

function makeTool(id: string) {
  return defineTool({
    name: id,
    description: id,
    risk: "read",
    input: z.object({}),
    async execute() {
      return id;
    },
  }).toDefinition();
}

class ToolCaptureModel extends FakeModelProvider {
  readonly requests: ModelRequest[] = [];

  override async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    this.requests.push(request);
    return super.generate(request, signal);
  }
}

describe("P1.1 sub-agent execution contract", () => {
  it("builds tool contracts with allowlist, budget and isolated transcript", () => {
    const contract = buildSubAgentExecution(
      childAgent("reviewer", ["read_file", "grep"]),
      parent,
      3,
      { mode: "tool", toolName: "delegate" },
    );

    expect(contract).toEqual({
      mode: "tool",
      parentAgentId: "parent",
      toolName: "delegate",
      allowlist: ["read_file", "grep"],
      deniedTools: ["bash"],
      budget: { maxSteps: 4, maxTokens: 2000, maxDepth: 3 },
      transcript: "isolated",
    });
  });

  it("builds handoff contracts with a shared transcript", () => {
    const contract = buildSubAgentExecution(
      childAgent("billing", ["read_file"]),
      parent,
      5,
      { mode: "handoff", transcript: "shared" },
    );

    expect(contract.mode).toBe("handoff");
    expect(contract.transcript).toBe("shared");
    expect(contract.budget?.maxDepth).toBe(5);
  });

  it("passes the contract into the child run context", async () => {
    const registry = new FakeAgentRegistry();
    await registry.register(childAgent("reviewer", ["read_file"]));
    let observed: RequestContext | undefined;

    const deps = makeDeps(registry, (_prompt, childCtx) => {
      observed = childCtx;
      return completedHandle("child-run");
    });

    await runAgent(
      deps,
      "reviewer" as AgentId,
      "review the diff",
      ctx,
      "session-1",
      "parent-run" as RunId,
      undefined,
      { mode: "tool", toolName: "delegate" },
    );

    expect(observed?.parentRunId).toBe("parent-run");
    expect(observed?.subAgent).toMatchObject({
      mode: "tool",
      parentAgentId: "parent",
      toolName: "delegate",
      allowlist: ["read_file"],
      deniedTools: ["bash"],
      transcript: "isolated",
    });
  });

  it("builds a per-agent contract for parallel children", async () => {
    const registry = new FakeAgentRegistry();
    await registry.register(childAgent("one", ["read_file"]));
    await registry.register(childAgent("two", ["grep", "glob"]));
    const observed: RequestContext[] = [];

    const deps = makeDeps(registry, (_prompt, childCtx) => {
      observed.push(childCtx);
      return completedHandle(`child-${observed.length}`);
    });

    await runAgentsParallel(
      deps,
      [
        { agentId: "one" as AgentId, prompt: "first" },
        { agentId: "two" as AgentId, prompt: "second" },
      ],
      ctx,
      "session-1",
      "parent-run" as RunId,
      undefined,
      { mode: "tool", toolName: "delegate_batch" },
    );

    const allowlists = observed.map((c) => c.subAgent?.allowlist).sort();
    expect(allowlists).toEqual([["grep", "glob"], ["read_file"]]);
    expect(observed.every((c) => c.subAgent?.transcript === "isolated")).toBe(true);
    expect(observed.every((c) => c.subAgent?.toolName === "delegate_batch")).toBe(true);
  });

  it("enforces the child allowlist in the model tool snapshot", async () => {
    const model = new ToolCaptureModel([{ content: "child done" }]);
    const registry = new FakeAgentRegistry();
    await registry.register(childAgent("reviewer", ["read_file"]));
    const kernel = new AgentKernel({
      model,
      store: new FakeRunEventStore(),
      agentRegistry: registry,
      tools: [makeTool("read_file"), makeTool("bash")],
      maxSteps: 5,
      permissions: { autoApprovalEnabled: true },
    });

    await kernel.runAgent(
      "reviewer" as AgentId,
      "inspect",
      ctx,
      "session-1",
      undefined,
      undefined,
      { mode: "tool", toolName: "delegate" },
    );

    const request = model.requests[0];
    if (!request) throw new Error("child model request not captured");
    expect(request.tools.map((t) => t.id)).toContain("read_file");
    expect(request.tools.map((t) => t.id)).not.toContain("bash");
  });

  it("enforces the child maxSteps budget", async () => {
    const model = new ToolCaptureModel([
      {
        content: "",
        toolCalls: [{ id: "call-1", name: "read_file", args: {} }],
      },
      { content: "should not run" },
    ]);
    const registry = new FakeAgentRegistry();
    const budgeted = childAgent("budgeted", ["read_file"]);
    budgeted.permissions = { ...budgeted.permissions, maxSteps: 1 };
    await registry.register(budgeted);
    const kernel = new AgentKernel({
      model,
      store: new FakeRunEventStore(),
      agentRegistry: registry,
      tools: [makeTool("read_file")],
      maxSteps: 5,
      permissions: { autoApprovalEnabled: true },
    });

    await kernel.runAgent(
      "budgeted" as AgentId,
      "loop",
      ctx,
      "session-1",
      undefined,
      undefined,
      { mode: "tool", toolName: "delegate" },
    );

    expect(model.generated).toBe(1);
    expect(model.requests).toHaveLength(1);
  });
});
