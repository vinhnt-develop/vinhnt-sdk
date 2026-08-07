import { describe, expect, it } from "vitest";
import { AgentKernel } from "../../src/kernel/kernel.js";
import { toolDomain } from "../../src/kernel/kernel-utils.js";
import { FakeModelProvider } from "../../src/fakes/fake-model.js";
import { FakeRunEventStore } from "../../src/fakes/fake-store.js";
import { FakeTool } from "../../src/fakes/fake-tool.js";
import { FakeAgentRegistry } from "../../src/fakes/fake-agent-registry.js";
import type { AgentConfig, AgentId, KnownRunEvent, RunEvent, ToolDefinition } from "@vinhnt-sdk/agent-core";

const testCtx = {
  requestId: "obs-req-1",
  traceId: "obs-trace-1",
  actorId: "test-actor-1",
  tenantId: "test-tenant-1",
} as const;

function findEvent<T extends KnownRunEvent["type"]>(events: readonly RunEvent[], type: T): Extract<KnownRunEvent, { type: T }> | undefined {
  return events.find((e) => e.type === type) as Extract<KnownRunEvent, { type: T }> | undefined;
}

describe("toolDomain", () => {
  it("derives mcp:<server> for MCP namespaced tools", () => {
    expect(toolDomain("mcp__github__list_prs")).toBe("mcp:github");
  });

  it("derives the dot-domain for in-process tools", () => {
    expect(toolDomain("coding.read_file")).toBe("coding");
  });

  it("falls back to core for bare ids", () => {
    expect(toolDomain("read_file")).toBe("core");
  });
});

describe("tool decision observability", () => {
  it("tool.invoked carries domain + allow decision", async () => {
    const tool = new FakeTool("read_file", async () => "content");
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "c1", name: "read_file", args: {} }] },
      { content: "Done" },
    ]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [tool], maxSteps: 10 });

    const handle = kernel.run("Read", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const invoked = findEvent(events, "tool.invoked");
    expect(invoked?.data).toMatchObject({ toolName: "read_file", domain: "core", decision: "allow" });
  });

  it("namespaced MCP tools get their server domain", async () => {
    const tool = new FakeTool("mcp__github__list_prs", async () => "prs");
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "c1", name: "mcp__github__list_prs", args: {} }] },
      { content: "Done" },
    ]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [tool], maxSteps: 10 });

    const handle = kernel.run("List PRs", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const invoked = findEvent(events, "tool.invoked");
    expect(invoked?.data).toMatchObject({ domain: "mcp:github", decision: "allow" });
  });

  it("permission-denied tools emit tool.failed with domain + deny decision", async () => {
    const dangerTool: ToolDefinition = {
      id: "danger_tool", description: "Dangerous", risk: "destructive",
      async execute() { return "boom"; },
    };
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "c1", name: "danger_tool", args: {} }] },
      { content: "Done" },
    ]);
    const store = new FakeRunEventStore();
    const agentRegistry = new FakeAgentRegistry();
    const agent: AgentConfig = {
      id: "safe" as AgentId,
      profile: { name: "Safe", description: "No dangerous tools" },
      capabilities: {},
      permissions: { deniedTools: ["danger_tool"] },
    };
    await agentRegistry.register(agent);
    const kernel = new AgentKernel({ model, store, tools: [dangerTool], maxSteps: 10, agentRegistry });
    await kernel.useAgent("safe" as AgentId);

    const handle = kernel.run("Run test", testCtx);
    await handle.completed;

const events = await store.list(handle.runId);
    const failed = findEvent(events, "tool.failed");
    expect(failed?.data).toMatchObject({ toolName: "danger_tool", domain: "core", decision: "deny" });
  });
});

