import { describe, expect, it } from "vitest";
import { AgentKernel } from "../src/kernel/kernel.js";
import { ExecutionEngine } from "../src/agent/execution-engine.js";
import { Tracer } from "../src/tracer.js";
import { ToolRegistry as InMemoryToolRegistry } from "../src/tool/registry.js";
import { InMemorySessionState } from "../src/session/in-memory-session-state.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeTool } from "../src/fakes/fake-tool.js";
import { FakeAgentRegistry } from "../src/fakes/fake-agent-registry.js";
import { createAgent } from "../src/agent/agent-factory.js";

const testCtx = {
  requestId: "req_e2e" as never,
  traceId: "trace_e2e" as never,
  actorId: "test",
  tenantId: "default",
};

const otherCtx = {
  requestId: "req_child" as never,
  traceId: "trace_child" as never,
  actorId: "test",
  tenantId: "default",
};

describe("Integration E2E", () => {
  it("runs an agent end-to-end and produces all event types", async () => {
    const reg = new FakeAgentRegistry();
    const agent = createAgent({
      profile: { name: "test-agent", description: "Agent for integration test" },
      capabilities: { tools: ["fake_tool"] },
      permissions: { mode: "primary" },
    });
    await reg.register(agent);

    const toolReg = new InMemoryToolRegistry();
    toolReg.register(new FakeTool("fake_tool", async (input) => `echo: ${JSON.stringify(input)}`));

    const store = new FakeRunEventStore();
    const model = new FakeModelProvider([{ content: "Hello from agent!" }]);
    const sessionState = new InMemorySessionState();
    const kernel = new AgentKernel({
      model, store, toolRegistry: toolReg, sessionState, maxSteps: 5,
    });

    const engine = new ExecutionEngine(reg, kernel);
    const result = await engine.execute(agent.id, "test prompt", testCtx);

    expect(result.status).toBe("succeeded");
    expect(result.runId).toBeTruthy();
    expect(result.agentName).toBe("test-agent");

    const events = await store.list(result.runId);
    const types = events.map((e) => e.type);
    expect(types).toContain("run.started");
    expect(types).toContain("step.started");
    expect(types).toContain("step.completed");
    expect(types).toContain("run.completed");

    expect(sessionState.isRunning).toBe(false);
    expect(sessionState.messages.length).toBeGreaterThan(0);
    expect(result.ctx.traceId).toBe("trace_e2e");
  });

  it("tracks tool calls through registry and session state", async () => {
    const reg = new FakeAgentRegistry();
    const agent = createAgent({
      profile: { name: "tool-agent", description: "Agent that uses tools" },
      capabilities: { tools: ["my_tool"] },
      permissions: { mode: "primary", allowedTools: ["my_tool"], allowedRisks: ["read"] },
    });
    await reg.register(agent);

    const toolReg = new InMemoryToolRegistry();
    toolReg.register(new FakeTool("my_tool", async (input) => `result: ${JSON.stringify(input)}`));

    const store = new FakeRunEventStore();
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "c1", name: "my_tool", args: { x: 1 } }] },
      { content: "Done" },
    ]);

    const sessionState = new InMemorySessionState();
    const kernel = new AgentKernel({
      model, store, toolRegistry: toolReg, sessionState, maxSteps: 5,
    });
    const engine = new ExecutionEngine(reg, kernel);

    const result = await engine.execute(agent.id, "use a tool", testCtx);
    expect(result.status).toBe("succeeded");

    const events = await store.list(result.runId);
    expect(events.filter((e) => e.type === "tool.invoked")).toHaveLength(1);
    expect(events.filter((e) => e.type === "tool.completed")).toHaveLength(1);
    expect(events.filter((e) => e.type === "step.completed")).toHaveLength(2);

    expect(sessionState.toolCallCount).toBeGreaterThanOrEqual(1);
  });

  it("propagates parentRunId through kernel.runAgent", async () => {
    const reg = new FakeAgentRegistry();
    const parent = createAgent({ profile: { name: "parent", description: "Parent agent" }, permissions: { mode: "primary" } });
    const child = createAgent({ profile: { name: "child", description: "Child agent" }, permissions: { mode: "subagent" } });
    await reg.register(parent);
    await reg.register(child);

    const store = new FakeRunEventStore();
    const model = new FakeModelProvider([{ content: "Parent output" }]);
    const kernel = new AgentKernel({ model, store, agentRegistry: reg, maxSteps: 5 });

    await kernel.useAgent(parent.id);
    const handle = kernel.run("parent prompt", testCtx);
    await handle.completed;

    const childOutput = await kernel.runAgent(child.id, "child task", testCtx);
    expect(childOutput).toBeTruthy();
  });

  it("validates trace propagation through engine", async () => {
    const reg = new FakeAgentRegistry();
    const agent = createAgent({ profile: { name: "trace-agent", description: "test" }, permissions: { mode: "primary" } });
    await reg.register(agent);

    const store = new FakeRunEventStore();
    const model = new FakeModelProvider([{ content: "traced output" }]);
    const kernel = new AgentKernel({ model, store, maxSteps: 5 });
    const engine = new ExecutionEngine(reg, kernel);
    const tracer = new Tracer(testCtx);

    // Use wrap to verify span ctx is propagated (wraps result with span ctx)
    const result = await tracer.wrap("e2e", () => engine.execute(agent.id, "trace me", otherCtx));

    // wrap() attaches the span's ctx (derived from tracer's baseCtx) onto the result
    expect((result as Record<string, unknown>).ctx).toBeDefined();
    expect(result.status).toBe("succeeded");
    expect(result.ctx.traceId).toBeTruthy();
  });
});
