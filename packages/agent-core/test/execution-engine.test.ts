import { describe, expect, it } from "vitest";
import { ExecutionEngine } from "../src/agent/execution-engine.js";
import { AgentKernel } from "../src/kernel/kernel.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeAgentRegistry } from "../src/fakes/fake-agent-registry.js";
import type { AgentId, AgentConfig, RequestContext } from "@vinhnt-sdk/agent-core";

const testCtx: RequestContext = {
  requestId: "req-1" as never,
  traceId: "trace-1" as never,
  actorId: "test",
  tenantId: "default",
};

describe("ExecutionEngine", () => {
  it("executes a simple prompt and returns result", async () => {
    const model = new FakeModelProvider([{ content: "Hello world" }]);
    const store = new FakeRunEventStore();
    const registry = new FakeAgentRegistry();
    const agent: AgentConfig = {
      id: "engine-test" as AgentId,
      profile: { name: "Engine Agent", description: "Test" },
      capabilities: {},
    };
    await registry.register(agent);

    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, agentRegistry: registry });
    const engine = new ExecutionEngine(registry, kernel);
    const result = await engine.execute("engine-test" as AgentId, "Say hello", testCtx);

    expect(result.agentName).toBe("Engine Agent");
    expect(result.status).toBe("succeeded");
    expect(result.runId).toBeTruthy();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("throws for unknown agent", async () => {
    const model = new FakeModelProvider([{ content: "hi" }]);
    const store = new FakeRunEventStore();
    const registry = new FakeAgentRegistry();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, agentRegistry: registry });
    const engine = new ExecutionEngine(registry, kernel);

    await expect(engine.execute("nonexistent" as AgentId, "hello", testCtx)).rejects.toThrow("not found");
  });

  it("executeWithValidation returns error result instead of throwing", async () => {
    const model = new FakeModelProvider([{ content: "hi" }]);
    const store = new FakeRunEventStore();
    const registry = new FakeAgentRegistry();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, agentRegistry: registry });
    const engine = new ExecutionEngine(registry, kernel);

    const result = await engine.executeWithValidation("nonexistent" as AgentId, "hello");
    expect(result.status).toBe("failed");
    expect(result.error).toBeTruthy();
    expect(result.durationMs).toBe(0);
  });

  it("executeBatch runs multiple agents in parallel", async () => {
    const model = new FakeModelProvider([{ content: "A" }, { content: "B" }]);
    const store = new FakeRunEventStore();
    const registry = new FakeAgentRegistry();
    const agentA: AgentConfig = {
      id: "batch-a" as AgentId,
      profile: { name: "Alpha", description: "" },
      capabilities: {},
    };
    const agentB: AgentConfig = {
      id: "batch-b" as AgentId,
      profile: { name: "Beta", description: "" },
      capabilities: {},
    };
    await registry.register(agentA);
    await registry.register(agentB);

    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, agentRegistry: registry });
    const engine = new ExecutionEngine(registry, kernel);

    const results = await engine.executeBatch([
      { agentId: "batch-a" as AgentId, prompt: "do A" },
      { agentId: "batch-b" as AgentId, prompt: "do B" },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]!.agentName).toBe("Alpha");
    expect(results[1]!.agentName).toBe("Beta");
  });

  it("executeBatch gives each task a distinct requestId (no shared ctx mutation)", async () => {
    const model = new FakeModelProvider([{ content: "A" }, { content: "B" }]);
    const store = new FakeRunEventStore();
    const registry = new FakeAgentRegistry();
    const agentA: AgentConfig = {
      id: "batch-a" as AgentId,
      profile: { name: "Alpha", description: "" },
      capabilities: {},
    };
    const agentB: AgentConfig = {
      id: "batch-b" as AgentId,
      profile: { name: "Beta", description: "" },
      capabilities: {},
    };
    await registry.register(agentA);
    await registry.register(agentB);

    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, agentRegistry: registry });
    const engine = new ExecutionEngine(registry, kernel);
    const results = await engine.executeBatch([
      { agentId: "batch-a" as AgentId, prompt: "do A" },
      { agentId: "batch-b" as AgentId, prompt: "do B" },
    ]);

    expect(results[0]!.ctx.requestId).not.toBe(results[1]!.ctx.requestId);
  });

  it("validates RequestContext with Zod", async () => {
    const model = new FakeModelProvider([{ content: "hi" }]);
    const store = new FakeRunEventStore();
    const registry = new FakeAgentRegistry();
    const agent: AgentConfig = {
      id: "ctx-test" as AgentId,
      profile: { name: "Ctx", description: "" },
      capabilities: {},
    };
    await registry.register(agent);
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, agentRegistry: registry });
    const engine = new ExecutionEngine(registry, kernel);

    // @ts-expect-error — invalid ctx
    await expect(engine.execute("ctx-test" as AgentId, "hi", {})).rejects.toThrow();
  });
});
