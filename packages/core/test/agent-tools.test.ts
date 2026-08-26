import { describe, it, expect, vi } from "vitest";
import { createSpawnAgentTool } from "../src/agent/spawn-agent-tool.js";
import { createDelegateTool } from "../src/agent/delegate-tool.js";
import { createDelegateBatchTool } from "../src/agent/delegate-batch-tool.js";
import { createListAgentsTool } from "../src/agent/list-agents-tool.js";
import { createCreateAgentTool } from "../src/agent/create-agent-tool.js";
import { FakeAgentRegistry } from "../src/fakes/fake-agent-registry.js";
import type { AgentKernel } from "../src/kernel/kernel.js";
import type { AgentId, RequestContext, RequestId, TraceId } from "@vinhnt-sdk/schema";
import type { ToolContext } from "@vinhnt-sdk/tools";

function mockKernel(opts?: { registry?: FakeAgentRegistry }) {
  const registry = opts?.registry ?? new FakeAgentRegistry();
  return {
    getAgentRegistry: vi.fn(() => registry),
    runAgent: vi.fn(async (_agentId: AgentId, _prompt: string, _ctx: RequestContext) => "task result"),
    runAgentsParallel: vi.fn(async () => "parallel result"),
    spawnAgent: vi.fn(async (params: { profile: { name: string; description: string } }) => ({
      id: "spawned-1" as AgentId,
      profile: { name: params.profile.name, description: params.profile.description },
      capabilities: {},
    })),
    setCurrentAgent: vi.fn(),
  };
}

function makeToolCtx(partial?: Partial<ToolContext>): ToolContext {
  return {
    sessionId: "",
    runId: "",
    agentId: "",
    agentName: "",
    signal: new AbortController().signal,
    env: {},
    ask: async () => "reject",
    metadata: () => {},
    setCompensation: () => {},
    ...partial,
  };
}

describe("createCreateAgentTool", () => {
  it("creates a top-level agent", async () => {
    const registry = new FakeAgentRegistry();
    const kernel = mockKernel({ registry });
    const tool = createCreateAgentTool(kernel as unknown as AgentKernel);
    const result = await tool.execute({ name: "My Agent", description: "Does stuff" }, makeToolCtx());
    expect(result).toContain('Agent "My Agent" created');
    const agents = await registry.list();
    expect(agents).toHaveLength(1);
    expect(agents[0]!.profile.name).toBe("My Agent");
  });

  it("creates a sub-agent with parentAgentId", async () => {
    const registry = new FakeAgentRegistry();
    await registry.register({
      id: "parent-1" as AgentId,
      profile: { name: "Parent", description: "" },
      capabilities: {},
    });
    const kernel = mockKernel({ registry });
    const tool = createCreateAgentTool(kernel as unknown as AgentKernel);
    const result = await tool.execute(
      { name: "Child", description: "Sub task", parentAgentId: "parent-1" },
      makeToolCtx(),
    );
    expect(result).toContain("Sub-agent");
    const children = await registry.getChildren("parent-1" as AgentId);
    expect(children).toHaveLength(1);
    expect(children[0]!.profile.name).toBe("Child");
  });

  it("throws for non-existent parent", async () => {
    const kernel = mockKernel();
    const tool = createCreateAgentTool(kernel as unknown as AgentKernel);
    await expect(
      tool.execute({ name: "Orphan", description: "No parent", parentAgentId: "ghost" }, makeToolCtx()),
    ).rejects.toThrow("Parent agent not found");
  });

  it("passes permissions to created agent", async () => {
    const registry = new FakeAgentRegistry();
    const kernel = mockKernel({ registry });
    const tool = createCreateAgentTool(kernel as unknown as AgentKernel);
    await tool.execute({ name: "Restricted", description: "Limited", allowedTools: ["read"], maxSteps: 5 }, makeToolCtx());
    const agents = await registry.list();
    expect(agents[0]!.permissions?.allowedTools).toEqual(["read"]);
    expect(agents[0]!.permissions?.maxSteps).toBe(5);
  });

  it("throws when no registry is available", async () => {
    const kernel = { getAgentRegistry: vi.fn(() => null) };
    const tool = createCreateAgentTool(kernel as unknown as AgentKernel);
    await expect(tool.execute({ name: "X", description: "Y" }, makeToolCtx())).rejects.toThrow("No agent registry");
  });
});

describe("createSpawnAgentTool", () => {
  it("spawns sub-agent with name and description", async () => {
    const kernel = mockKernel();
    const tool = createSpawnAgentTool(kernel as unknown as AgentKernel);
    const result = await tool.execute({ name: "Helper", description: "Helps with tasks" }, makeToolCtx());
    expect(result).toContain("Sub-agent");
    expect(result).toContain("Helper");
  });

  it("uses mode as fallback for name", async () => {
    const kernel = mockKernel();
    const tool = createSpawnAgentTool(kernel as unknown as AgentKernel);
    const result = await tool.execute(
      { mode: "code-reviewer", capabilities: ["code review", "linting"] },
      makeToolCtx(),
    );
    expect(result).toContain("code-reviewer");
  });

  it("uses capabilities as fallback for description", async () => {
    const kernel = mockKernel();
    const tool = createSpawnAgentTool(kernel as unknown as AgentKernel);
    const result = await tool.execute({ name: "Reviewer", capabilities: ["code review", "linting"] }, makeToolCtx());
    expect(result).toContain("Reviewer");
    const call = kernel.spawnAgent.mock.calls[0]?.[0] as { profile: { description: string } };
    expect(call.profile.description).toContain("code review");
  });

  it("throws when name is missing without fallback", async () => {
    const kernel = mockKernel();
    const tool = createSpawnAgentTool(kernel as unknown as AgentKernel);
    await expect(tool.execute({ description: "desc" }, makeToolCtx())).rejects.toThrow("name is required");
  });

  it("throws when description is missing without fallback", async () => {
    const kernel = mockKernel();
    const tool = createSpawnAgentTool(kernel as unknown as AgentKernel);
    await expect(tool.execute({ name: "X" }, makeToolCtx())).rejects.toThrow("description is required");
  });

  it("passes optional fields to spawnAgent", async () => {
    const kernel = mockKernel();
    const tool = createSpawnAgentTool(kernel as unknown as AgentKernel);
    await tool.execute({ name: "Opt", description: "Has options", temperature: 0.3, maxSteps: 10 }, makeToolCtx());
    const call = kernel.spawnAgent.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.temperature).toBe(0.3);
    expect((call.permissions as Record<string, unknown>).maxSteps).toBe(10);
  });
});

describe("createDelegateTool", () => {
  const parentCtx: RequestContext = {
    requestId: "req-parent" as RequestId,
    traceId: "trace-parent" as TraceId,
    actorId: "actor-parent",
    tenantId: "tenant-1",
  };

  it("delegates to agent and returns result", async () => {
    const kernel = mockKernel();
    const tool = createDelegateTool(kernel as unknown as AgentKernel);
    const result = await tool.execute({ agentId: "helper", prompt: "do task" }, makeToolCtx({ sessionId: "s1" }));
    expect(result).toBe("task result");
    expect(kernel.runAgent).toHaveBeenCalledWith("helper", "do task", expect.any(Object), "s1", "", expect.any(AbortSignal));
  });

  it("propagates parent context (traceId/actorId) to the child run", async () => {
    const kernel = mockKernel();
    const tool = createDelegateTool(kernel as unknown as AgentKernel);
    await tool.execute(
      { agentId: "helper", prompt: "do task" },
      makeToolCtx({ sessionId: "s1", parentContext: parentCtx }),
    );
    expect(kernel.runAgent).toHaveBeenCalledWith("helper", "do task", parentCtx, "s1", "", expect.any(AbortSignal));
  });

  it("falls back to a synthetic context when no parent context is available", async () => {
    const kernel = mockKernel();
    const tool = createDelegateTool(kernel as unknown as AgentKernel);
    await tool.execute({ agentId: "helper", prompt: "do task" }, makeToolCtx({ sessionId: "s1" }));
    const ctx = (kernel.runAgent as ReturnType<typeof vi.fn>).mock.calls[0]?.[2] as RequestContext;
    expect(ctx.traceId).toBeDefined();
    expect(ctx.actorId).toBe("sub-agent");
  });

  it("accepts snake_case agent_id alias", async () => {
    const kernel = mockKernel();
    const tool = createDelegateTool(kernel as unknown as AgentKernel);
    await tool.execute({ agent_id: "snake", prompt: "work" } as never, makeToolCtx());
    expect(kernel.runAgent).toHaveBeenCalledWith("snake", "work", expect.any(Object), undefined, "", expect.any(AbortSignal));
  });

  it("accepts task alias for prompt", async () => {
    const kernel = mockKernel();
    const tool = createDelegateTool(kernel as unknown as AgentKernel);
    await tool.execute({ agentId: "a", task: "do it" } as never, makeToolCtx());
    expect(kernel.runAgent).toHaveBeenCalledWith("a", "do it", expect.any(Object), undefined, "", expect.any(AbortSignal));
  });

  it("throws when agent id is missing", async () => {
    const kernel = mockKernel();
    const tool = createDelegateTool(kernel as unknown as AgentKernel);
    await expect(tool.execute({ prompt: "hi" } as never, makeToolCtx())).rejects.toThrow("Agent ID is required");
  });

  it("throws when prompt is missing", async () => {
    const kernel = mockKernel();
    const tool = createDelegateTool(kernel as unknown as AgentKernel);
    await expect(tool.execute({ agentId: "a" } as never, makeToolCtx())).rejects.toThrow("Prompt is required");
  });
});

describe("createDelegateBatchTool", () => {
  it("delegates multiple tasks in parallel", async () => {
    const kernel = mockKernel();
    const tool = createDelegateBatchTool(kernel as unknown as AgentKernel);
    const result = await tool.execute(
      {
        tasks: [
          { agentId: "a", prompt: "task1" },
          { agentId: "b", prompt: "task2" },
        ],
      },
      makeToolCtx(),
    );
    expect(result).toBe("parallel result");
    expect(kernel.runAgentsParallel).toHaveBeenCalledWith(
      [
        { agentId: "a", prompt: "task1" },
        { agentId: "b", prompt: "task2" },
      ],
      expect.any(Object),
      undefined,
      "",
      expect.any(AbortSignal),
    );
  });

  it("propagates parent context to parallel children", async () => {
    const kernel = mockKernel();
    const tool = createDelegateBatchTool(kernel as unknown as AgentKernel);
    const parentCtx: RequestContext = {
      requestId: "req-p" as RequestId,
      traceId: "trace-p" as TraceId,
      actorId: "actor-p",
      tenantId: "tenant-1",
    };
    await tool.execute(
      { tasks: [{ agentId: "a", prompt: "task1" }] },
      makeToolCtx({ sessionId: "s1", parentContext: parentCtx }),
    );
    expect(kernel.runAgentsParallel).toHaveBeenCalledWith(
      [{ agentId: "a", prompt: "task1" }],
      parentCtx,
      "s1",
      "",
      expect.any(AbortSignal),
    );
  });
});

describe("createListAgentsTool", () => {
  it("lists all registered agents with details", async () => {
    const registry = new FakeAgentRegistry();
    await registry.register({
      id: "tool-a" as AgentId,
      profile: { name: "ToolA", description: "First tool" },
      capabilities: {},
      permissions: { mode: "primary", allowedTools: ["read"] },
    });
    await registry.register({
      id: "tool-b" as AgentId,
      profile: { name: "ToolB", description: "Second tool" },
      capabilities: {},
      permissions: { mode: "subagent", ruleset: { rules: [{ effect: "allow", target: "edit" }] } },
    });
    const kernel = { getAgentRegistry: vi.fn(() => registry) };
    const tool = createListAgentsTool(kernel as unknown as AgentKernel);
    const result = await tool.execute({}, makeToolCtx());
    expect(result).toContain("tool-a");
    expect(result).toContain("ToolA");
    expect(result).toContain("First tool");
    expect(result).toContain("[primary]");
    expect(result).toContain("allowed: read");
    expect(result).toContain("tool-b");
    expect(result).toContain("ToolB");
    expect(result).toContain("rules: allow:edit");
  });

  it("returns message when no registry", async () => {
    const kernel = { getAgentRegistry: vi.fn(() => null) };
    const tool = createListAgentsTool(kernel as unknown as AgentKernel);
    const result = await tool.execute({}, makeToolCtx());
    expect(result).toBe("No agent registry configured");
  });

  it("returns message when no agents", async () => {
    const registry = new FakeAgentRegistry();
    const kernel = { getAgentRegistry: vi.fn(() => registry) };
    const tool = createListAgentsTool(kernel as unknown as AgentKernel);
    const result = await tool.execute({}, makeToolCtx());
    expect(result).toBe("No agents registered");
  });

  it("includes parent id in output", async () => {
    const registry = new FakeAgentRegistry();
    await registry.register({
      id: "tool-p" as AgentId,
      profile: { name: "Parent", description: "P" },
      capabilities: {},
    });
    await registry.register(
      {
        id: "tool-c" as AgentId,
        profile: { name: "Child", description: "C" },
        capabilities: {},
      },
      "tool-p" as AgentId,
    );
    const kernel = { getAgentRegistry: vi.fn(() => registry) };
    const tool = createListAgentsTool(kernel as unknown as AgentKernel);
    const result = await tool.execute({}, makeToolCtx());
    expect(result).toContain("(parent: tool-p)");
  });
});