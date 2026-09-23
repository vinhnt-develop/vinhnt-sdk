/**
 * P1-10 golden eval: permission deny (kernel emits tool.failed with decision=deny).
 * Offline — FakeModelProvider + FakeAgentRegistry pattern.
 */
import { describe, expect, it } from "vitest";
import { AgentKernel } from "../packages/core/src/kernel/kernel.js";
import { FakeModelProvider } from "../packages/core/src/fakes/fake-model.js";
import { FakeRunEventStore } from "../packages/core/src/fakes/fake-store.js";
import { FakeAgentRegistry } from "../packages/core/src/fakes/fake-agent-registry.js";
import type { AgentConfig, AgentId, ToolDefinition } from "@vinhnt-sdk/core";
import type { KnownRunEvent, RunEvent, RequestId, TraceId } from "@vinhnt-sdk/schema";

const evalCtx = {
  requestId: "eval-perm-req" as RequestId,
  traceId: "eval-perm-trace" as TraceId,
  actorId: "eval",
  tenantId: "default",
};

function findEvent<T extends KnownRunEvent["type"]>(
  events: readonly RunEvent[],
  type: T,
): Extract<KnownRunEvent, { type: T }> | undefined {
  return events.find((e) => e.type === type) as Extract<KnownRunEvent, { type: T }> | undefined;
}

describe("golden: permission deny", () => {
  it("deniedTools → tool.failed with decision=deny, tool never executed", async () => {
    let executed = false;
    const dangerTool: ToolDefinition = {
      id: "danger_tool",
      description: "Dangerous",
      risk: "destructive",
      async execute() {
        executed = true;
        return "boom";
      },
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
    const kernel = new AgentKernel({
      model,
      store,
      tools: [dangerTool],
      maxSteps: 10,
      agentRegistry,
    });
    await kernel.useAgent("safe" as AgentId);

    const handle = kernel.run("Run dangerous tool", evalCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const failed = findEvent(events, "tool.failed");
    expect(failed?.data).toMatchObject({
      toolName: "danger_tool",
      domain: "core",
      decision: "deny",
    });
    expect(executed).toBe(false);
  });

  it("ruleset deny blocks matching tool", async () => {
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "c1", name: "write_file", args: { path: "x" } }] },
      { content: "Done" },
    ]);
    const store = new FakeRunEventStore();
    const agentRegistry = new FakeAgentRegistry();
    const agent: AgentConfig = {
      id: "strict" as AgentId,
      profile: { name: "Strict", description: "deny write" },
      capabilities: {},
      permissions: {
        ruleset: { rules: [{ effect: "deny", target: "tool.write_*" }] },
      },
    };
    await agentRegistry.register(agent);
    const writeTool: ToolDefinition = {
      id: "write_file",
      description: "write",
      risk: "write",
      async execute() {
        return "should not run";
      },
    };
    const kernel = new AgentKernel({
      model,
      store,
      tools: [writeTool],
      maxSteps: 10,
      agentRegistry,
    });
    await kernel.useAgent("strict" as AgentId);

    const handle = kernel.run("write", evalCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const failed = findEvent(events, "tool.failed");
    expect(failed).toBeTruthy();
    expect(failed?.data.toolName).toBe("write_file");
  });
});
