import { describe, it, expect, vi } from "vitest";
import { createSpawnAgentTool } from "../src/agent/spawn-agent-tool.js";
import { createDelegateTool } from "../src/agent/delegate-tool.js";
import { createDelegateBatchTool } from "../src/agent/delegate-batch-tool.js";
import { createListAgentsTool } from "../src/agent/list-agents-tool.js";
import { createCreateAgentTool } from "../src/agent/create-agent-tool.js";
import { FakeAgentRegistry } from "../src/fakes/fake-agent-registry.js";
import type { AgentId, AgentConfig, RequestContext } from "@vinhnt-sdk/agent-core";

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

describe("createCreateAgentTool", () => {
  it("creates a top-level agent", async () => {
    const registry = new FakeAgentRegistry();
    const kernel = mockKernel({ registry }) as never;
    const tool = createCreateAgentTool(kernel);
    const result = await tool.execute({ name: "My Agent", description: "Does stuff" });
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
    const kernel = mockKernel({ registry }) as never;
    const tool = createCreateAgentTool(kernel);
    const result = await tool.execute({ name: "Child", description: "Sub task", parentAgentId: "parent-1" });
    expect(result).toContain("Sub-agent");
    const children = await registry.getChildren("parent-1" as AgentId);
    expect(children).toHaveLength(1);
    expect(children[0]!.profile.name).toBe("Child");
  });

  it("throws for non-existent parent", async () => {
    const kernel = mockKernel() as never;
    const tool = createCreateAgentTool(kernel);
    await expect(tool.execute({ name: "Orphan", description: "No parent", parentAgentId: "ghost" })).rejects.toThrow(
      "Parent agent not found",
    );
  });

  it("passes permissions to created agent", async () => {
    const registry = new FakeAgentRegistry();
    const kernel = mockKernel({ registry }) as never;
    const tool = createCreateAgentTool(kernel);
    await tool.execute({ name: "Restricted", description: "Limited", allowedTools: ["read"], maxSteps: 5 });
    const agents = await registry.list();
    expect(agents[0]!.permissions?.allowedTools).toEqual(["read"]);
    expect(agents[0]!.permissions?.maxSteps).toBe(5);
  });

  it("throws when no registry is available", async () => {
    const kernel = { getAgentRegistry: vi.fn(() => null) } as never;
    const tool = createCreateAgentTool(kernel);
    await expect(tool.execute({ name: "X", description: "Y" })).rejects.toThrow("No agent registry");
  });
});

describe("createSpawnAgentTool", () => {
  it("spawns sub-agent with name and description", async () => {
    const kernel = mockKernel() as never;
    const tool = createSpawnAgentTool(kernel);
    const result = await tool.execute({ name: "Helper", description: "Helps with tasks" });
    expect(result).toContain("Sub-agent");
    expect(result).toContain("Helper");
  });

  it("uses mode as fallback for name", async () => {
    const kernel = mockKernel() as never;
    const tool = createSpawnAgentTool(kernel);
    const result = await tool.execute({ mode: "code-reviewer", capabilities: ["code review", "linting"] });
    expect(result).toContain("code-reviewer");
  });

  it("uses capabilities as fallback for description", async () => {
    const kernel = mockKernel() as never;
    const tool = createSpawnAgentTool(kernel);
    const result = await tool.execute({ name: "Reviewer", capabilities: ["code review", "linting"] });
    expect(result).toContain("Reviewer");
    const call = kernel.spawnAgent.mock.calls[0]?.[0] as { profile: { description: string } };
    expect(call.profile.description).toContain("code review");
  });

  it("throws when name is missing without fallback", async () => {
    const kernel = mockKernel() as never;
    const tool = createSpawnAgentTool(kernel);
    await expect(tool.execute({ description: "desc" })).rejects.toThrow("name is required");
  });

  it("throws when description is missing without fallback", async () => {
    const kernel = mockKernel() as never;
    const tool = createSpawnAgentTool(kernel);
    await expect(tool.execute({ name: "X" })).rejects.toThrow("description is required");
  });

  it("passes optional fields to spawnAgent", async () => {
    const kernel = mockKernel() as never;
    const tool = createSpawnAgentTool(kernel);
    await tool.execute({ name: "Opt", description: "Has options", temperature: 0.3, maxSteps: 10 });
    const call = kernel.spawnAgent.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.temperature).toBe(0.3);
    expect((call.permissions as Record<string, unknown>).maxSteps).toBe(10);
  });
});

describe("createDelegateTool", () => {
  const parentCtx = {
    requestId: "req-parent",
    traceId: "trace-parent",
    actorId: "actor-parent",
    tenantId: "tenant-1",
  } as const;

  it("delegates to agent and returns result", async () => {
    const kernel = mockKernel() as never;
    const tool = createDelegateTool(kernel);
    const result = await tool.execute({ agentId: "helper", prompt: "do task" }, { sessionId: "s1" });
    expect(result).toBe("task result");
    expect(kernel.runAgent).toHaveBeenCalledWith("helper", "do task", expect.any(Object), "s1");
  });

  it("propagates parent context (traceId/actorId) to the child run", async () => {
    const kernel = mockKernel() as never;
    const tool = createDelegateTool(kernel);
    await tool.execute(
      { agentId: "helper", prompt: "do task" },
      { sessionId: "s1", parentContext: parentCtx },
    );
    expect(kernel.runAgent).toHaveBeenCalledWith("helper", "do task", parentCtx, "s1");
  });

  it("falls back to a synthetic context when no parent context is available", async () => {
    const kernel = mockKernel() as never;
    const tool = createDelegateTool(kernel);
    await tool.execute({ agentId: "helper", prompt: "do task" }, { sessionId: "s1" });
    const ctx = (kernel.runAgent as ReturnType<typeof vi.fn>).mock.calls[0]?.[2] as RequestContext;
    expect(ctx.traceId).toBeDefined();
    expect(ctx.actorId).toBe("sub-agent");
  });

  it("accepts snake_case agent_id alias", async () => {
    const kernel = mockKernel() as never;
    const tool = createDelegateTool(kernel);
    await tool.execute({ agent_id: "snake", prompt: "work" }, {});
    expect(kernel.runAgent).toHaveBeenCalledWith("snake", "work", expect.any(Object), undefined);
  });

  it("accepts task alias for prompt", async () => {
    const kernel = mockKernel() as never;
    const tool = createDelegateTool(kernel);
    await tool.execute({ agentId: "a", task: "do it" }, {});
    expect(kernel.runAgent).toHaveBeenCalledWith("a", "do it", expect.any(Object), undefined);
  });

  it("throws when agent id is missing", async () => {
    const kernel = mockKernel() as never;
    const tool = createDelegateTool(kernel);
    await expect(tool.execute({ prompt: "hi" }, {})).rejects.toThrow("Agent ID is required");
  });

  it("throws when prompt is missing", async () => {
    const kernel = mockKernel() as never;
    const tool = createDelegateTool(kernel);
    await expect(tool.execute({ agentId: "a" }, {})).rejects.toThrow("Prompt is required");
  });
});

describe("createDelegateBatchTool", () => {
  it("delegates multiple tasks in parallel", async () => {
    const kernel = mockKernel() as never;
    const tool = createDelegateBatchTool(kernel);
    const result = await tool.execute({
      tasks: [
        { agentId: "a", prompt: "task1" },
        { agentId: "b", prompt: "task2" },
      ],
    });
    expect(result).toBe("parallel result");
    expect(kernel.runAgentsParallel).toHaveBeenCalledWith(
      [
        { agentId: "a", prompt: "task1" },
        { agentId: "b", prompt: "task2" },
      ],
      expect.any(Object),
      undefined,
    );
  });

  it("propagates parent context to parallel children", async () => {
    const kernel = mockKernel() as never;
    const tool = createDelegateBatchTool(kernel);
    const parentCtx = {
      requestId: "req-p",
      traceId: "trace-p",
      actorId: "actor-p",
      tenantId: "tenant-1",
    } as const;
    await tool.execute(
      { tasks: [{ agentId: "a", prompt: "task1" }] },
      { sessionId: "s1", parentContext: parentCtx },
    );
    expect(kernel.runAgentsParallel).toHaveBeenCalledWith(
      [{ agentId: "a", prompt: "task1" }],
      parentCtx,
      "s1",
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
    const kernel = { getAgentRegistry: vi.fn(() => registry) } as never;
    const tool = createListAgentsTool(kernel);
    const result = await tool.execute();
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
    const kernel = { getAgentRegistry: vi.fn(() => null) } as never;
    const tool = createListAgentsTool(kernel);
    const result = await tool.execute();
    expect(result).toBe("No agent registry configured");
  });

  it("returns message when no agents", async () => {
    const registry = new FakeAgentRegistry();
    const kernel = { getAgentRegistry: vi.fn(() => registry) } as never;
    const tool = createListAgentsTool(kernel);
    const result = await tool.execute();
    expect(result).toBe("No agents registered");
  });

  it("includes parent id in output", async () => {
    const registry = new FakeAgentRegistry();
    await registry.register({
      id: "tool-p" as AgentId,
      profile: { name: "Parent", description: "P" },
      capabilities: {},
    });
    await registry.register({
      id: "tool-c" as AgentId,
      profile: { name: "Child", description: "C" },
      capabilities: {},
    }, "tool-p" as AgentId);
    const kernel = { getAgentRegistry: vi.fn(() => registry) } as never;
    const tool = createListAgentsTool(kernel);
    const result = await tool.execute();
    expect(result).toContain("(parent: tool-p)");
  });
});
