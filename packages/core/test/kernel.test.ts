import { describe, expect, it, vi } from "vitest";
import { AgentKernel } from "../src/kernel/kernel.js";
import { buildAgentIdentity } from "../src/kernel/kernel-session.js";
import { DefaultPluginManager } from "../src/plugin/manager.js";
import type { ConversationCompactor } from "../src/session/compaction.js";
import type { ChatMessage } from "../src/model.js";
import type { SessionStore } from "../src/session/store.js";
import type { Plugin, PluginHooks } from "../src/plugin.js";
import type { ToolDefinition } from "@vinhnt-sdk/tools";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeTool } from "../src/fakes/fake-tool.js";
import { FakeAgentRegistry } from "../src/fakes/fake-agent-registry.js";
import { FakeApprovalStore } from "../src/fakes/fake-approval-store.js";
import type { RunEvent, KnownRunEvent, TokenStreamedData, ThinkingCompletedData, ToolSelfCorrectingData, AgentId, AgentConfig, ModelProvider, ModelResponse, CircuitBreakerOptions, RunId, TraceId } from "@vinhnt-sdk/core";

const testCtx = {
  requestId: "test-req-1",
  traceId: "test-trace-1",
  actorId: "test-actor-1",
  tenantId: "test-tenant-1",
} as const;

function findEvent<T extends KnownRunEvent["type"]>(events: readonly RunEvent[], type: T): Extract<KnownRunEvent, { type: T }> | undefined {
  return events.find((e) => e.type === type) as Extract<KnownRunEvent, { type: T }> | undefined;
}

describe("AgentKernel", () => {
  it("TC01: complete run with text response — no tool call", async () => {
    const model = new FakeModelProvider([
      { content: "Hello! I am an AI assistant." },
    ]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10 });

    const handle = kernel.run("Hello!", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const types = events.map((e) => e.type);

    expect(types).toEqual([
      "run.started",
      "step.started",
      "token.counted",
      "token.counted",
      "model.cost",
      "step.completed",
      "run.completed",
    ]);

    const started = findEvent(events, "run.started");
    expect(started?.data.prompt).toBe("Hello!");

    const completed = findEvent(events, "run.completed");
    expect(completed?.data.status).toBe("succeeded");
    expect(completed?.data.output).toBe("Hello! I am an AI assistant.");
    expect(completed?.data.totalSteps).toBe(1);
  });

  it("TC02: tool call success — LLM calls 1 tool, gets result, responds", async () => {
    const readFile = new FakeTool("read_file", async (input) => {
      const { path } = input as { path: string };
      return `Content of ${path}: Hello World!`;
    });

    const model = new FakeModelProvider([
      {
        content: "Let me read the file for you.",
        toolCalls: [{ id: "call-1", name: "read_file", args: { path: "test.txt" } }],
      },
      {
        content: "File test.txt has content: Hello World!",
      },
    ]);

    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [readFile], maxSteps: 5 });

    const handle = kernel.run("Read test.txt", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const types = events.map((e) => e.type);

    expect(types).toContain("tool.invoked");
    expect(types).toContain("tool.completed");
    expect(types.filter((t) => t === "step.completed").length).toBe(2);

    const invoked = findEvent(events, "tool.invoked");
    expect(invoked?.data.toolName).toBe("read_file");
    expect(invoked?.data.input).toEqual({ path: "test.txt" });

    const toolDone = findEvent(events, "tool.completed");
    expect(toolDone?.data.output).toContain("Hello World!");

    const completed = findEvent(events, "run.completed");
    expect(completed?.data.status).toBe("succeeded");
    expect(completed?.data.totalSteps).toBe(2);
  });

  it("TC03: multiple tool calls in one step", async () => {
    const readA = new FakeTool("read_a", async () => "Result A");
    const readB = new FakeTool("read_b", async () => "Result B");

    const model = new FakeModelProvider([
      {
        content: "I will read both files.",
        toolCalls: [
          { id: "call-1", name: "read_a", args: {} },
          { id: "call-2", name: "read_b", args: {} },
        ],
      },
      { content: "Done reading: Result A and Result B" },
    ]);

    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [readA, readB], maxSteps: 5 });

    const handle = kernel.run("Read everything", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const invoked = events.filter((e) => e.type === "tool.invoked");
    const completed = events.filter((e) => e.type === "tool.completed");

    expect(invoked.length).toBe(2);
    expect(completed.length).toBe(2);
    expect(invoked[0].data).toMatchObject({ toolName: "read_a" });
    expect(invoked[1].data).toMatchObject({ toolName: "read_b" });
  });

  it("TC04: maxSteps exceeded — agent loop stops with status failed", async () => {
    const loopTool = new FakeTool("loop_tool", async () => "Keep calling me!");
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "call-1", name: "loop_tool", args: {} }] },
      { content: "", toolCalls: [{ id: "call-2", name: "loop_tool", args: {} }] },
      { content: "", toolCalls: [{ id: "call-3", name: "loop_tool", args: {} }] },
    ]);

    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [loopTool], maxSteps: 2 });

    const handle = kernel.run("Start loop", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const stepStarts = events.filter((e) => e.type === "step.started");
    expect(stepStarts.length).toBe(2);

    const completed = findEvent(events, "run.completed");
    expect(completed?.data.status).toBe("failed");
    expect(completed?.data.totalSteps).toBe(2);
  });

  it("TC04b: maxSteps graceful — model produces text summary on last step, status succeeded", async () => {
    const loopTool = new FakeTool("loop_tool", async () => "result");
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "call-1", name: "loop_tool", args: {} }] },
      { content: "Summary: I did X and Y.", toolCalls: [] },
    ]);

    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [loopTool], maxSteps: 2 });

    const handle = kernel.run("do stuff", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const completed = findEvent(events, "run.completed");
    expect(completed?.data.status).toBe("succeeded");
    expect(completed?.data.output).toBe("Summary: I did X and Y.");
    expect(completed?.data.totalSteps).toBe(2);
  });

  it("TC05: tool not found — records tool.failed event, run continues", async () => {
    const model = new FakeModelProvider([
      {
        content: "Call unknown tool",
        toolCalls: [{ id: "call-1", name: "nonexistent_tool", args: { data: 123 } }],
      },
      { content: "That tool doesn't exist, I'll try another way." },
    ]);

    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 5 });

    const handle = kernel.run("Try tool", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const failed = findEvent(events, "tool.failed");
    expect(failed).toBeDefined();
    expect(failed?.data.toolName).toBe("nonexistent_tool");

    const completed = findEvent(events, "run.completed");
    expect(completed?.data.status).toBe("succeeded");
  });

  it("TC06: tool execute throws error — records tool.failed, run continues", async () => {
    const crashTool = new FakeTool("crash_tool", async () => {
      throw new Error("Unknown error!");
    });

    const model = new FakeModelProvider([
      {
        content: "Run tool with error",
        toolCalls: [{ id: "call-1", name: "crash_tool", args: {} }],
      },
      { content: "Tool had an error, I've handled it." },
    ]);

    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [crashTool], maxSteps: 5 });

    const handle = kernel.run("Try running", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const failed = findEvent(events, "tool.failed");
    expect(failed).toBeDefined();
    expect(failed?.data.error).toBe("Unknown error!");

    const completedEvents = events.filter((e) => e.type === "tool.completed");
    expect(completedEvents.length).toBe(0);

    const runEnd = findEvent(events, "run.completed");
    expect(runEnd?.data.status).toBe("succeeded");
  });

  it("TC07: doom-loop — 3 identical tool calls detected and blocked", async () => {
    const echo = new FakeTool("echo", async (input) => input);
    const model = new FakeModelProvider([
      {
        content: "",
        toolCalls: [
          { id: "call-1", name: "echo", args: { msg: "hello" } },
          { id: "call-2", name: "echo", args: { msg: "hello" } },
          { id: "call-3", name: "echo", args: { msg: "hello" } },
          { id: "call-4", name: "echo", args: { msg: "hello" } },
        ],
      },
      { content: "Done" },
    ]);

    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [echo], maxSteps: 5 });

    const handle = kernel.run("Test doom loop", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    // Should have: 2 successful + 1 doom-loop failed (4th call blocked)
    const invoked = events.filter((e) => e.type === "tool.invoked");
    const failed = events.filter((e) => e.type === "tool.failed");
    expect(invoked.length).toBe(3);
    expect(failed.length).toBe(1);
    expect(failed[0].data).toMatchObject({ toolName: "echo" });
    expect((failed[0].data as Record<string, unknown>).error as string).toMatch(/doom|identical|infinite/i);
  });

  it("TC09: stream — kernel emits token.streamed events (live-only) when model supports streaming", async () => {
    const model = new FakeModelProvider([
      { content: "Hello! I am AI." },
    ]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10 });

    const handle = kernel.run("Hello!", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const tokenEvents = events.filter((e) => e.type === "token.streamed");

    // token.streamed events are live-only (persist: false), not in the store
    expect(tokenEvents.length).toBe(0);

    // But the output is still correct
    const completed = findEvent(events, "run.completed");
    expect(completed?.data.output).toBe("Hello! I am AI.");
  });

  it("TC10: stream with tool calls — tool calls still work, token.streamed is live-only", async () => {
    const readFile = new FakeTool("read_file", async (input) => {
      return `Nội dung: Hello World!`;
    });

    const model = new FakeModelProvider([
      {
        content: "Read file: ",
        toolCalls: [{ id: "call-1", name: "read_file", args: { path: "test.txt" } }],
      },
      { content: "Read done!" },
    ]);

    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [readFile], maxSteps: 5 });

    const handle = kernel.run("Read file", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const toolEvents = events.filter((e) => e.type === "tool.invoked");

    // token.streamed events are live-only, not persisted
    const tokenEvents = events.filter((e) => e.type === "token.streamed");
    expect(tokenEvents.length).toBe(0);

    expect(toolEvents.length).toBe(1);

    const completed = findEvent(events, "run.completed");
    expect(completed?.data.status).toBe("succeeded");
  });

  it("TC11: compactor called and emits context.compressed event", async () => {
    const echo = new FakeTool("echo", async (input) => input);
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "call-1", name: "echo", args: { msg: "first" } }] },
      { content: "Final answer" },
    ]);
    const store = new FakeRunEventStore();

    let compactCalled = false;
    const compactor: ConversationCompactor = {
      async compact(msgs: readonly ChatMessage[]) {
        compactCalled = true;
        return { messages: msgs, summary: { originalMessageCount: msgs.length, compressedMessageCount: msgs.length, summary: undefined } };
      },
    };

    // Use a small maxTokens and large prompt to ensure overflow detection triggers compaction
    const kernel = new AgentKernel({ model, store, tools: [echo], maxSteps: 5, maxTokens: 10, compactor });

    const handle = kernel.run("Hello! " + "x".repeat(2000), testCtx);
    await handle.completed;

    expect(compactCalled).toBe(true);
  });

  it("TC12: thinking step — emits thinking.* events (content live-only) and injects thinking into context", async () => {
    const model = new FakeModelProvider([
      { content: "Let me analyze this request. The user wants a greeting." },
      { content: "Hello! Welcome!" },
    ]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({
      model, store, tools: [], maxSteps: 5,
      thinkingBudget: 500,
    });

    const handle = kernel.run("Say hi", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const started = events.filter((e) => e.type === "thinking.started");
    // thinking.content is live-only (persist: false), not persisted
    const content = events.filter((e) => e.type === "thinking.content");
    const completed = events.filter((e) => e.type === "thinking.completed");

    expect(started.length).toBeGreaterThanOrEqual(1);
    expect(content.length).toBe(0);
    expect(completed.length).toBeGreaterThanOrEqual(1);

    const ce = completed[0]! as unknown as RunEvent<ThinkingCompletedData>;
    expect(ce.data.content).toContain("Let me analyze");
    expect(ce.data.step).toBe(0);
  });

  it("TC13: thinking disabled (default) — does not emit thinking.* events", async () => {
    const model = new FakeModelProvider([{ content: "Hello!" }]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 5 });

    const handle = kernel.run("Say hi", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    expect(events.filter((e) => e.type.startsWith("thinking."))).toHaveLength(0);
  });

  it("TC14: self-correct on tool failure — tool fails → model fixes → retry succeeds", async () => {
    let callCount = 0;
    const failingTool = new FakeTool("flaky", async () => {
      callCount++;
      if (callCount === 1) throw new Error("Network timeout");
      return "ok on retry";
    });
    // model: first call says "use flaky", second (self-correct) says "try flaky again"
    const model = new FakeModelProvider([
      { content: "Let me call flaky", toolCalls: [{ id: "call-1", name: "flaky", args: {} }] },
      { content: "Let me retry flaky", toolCalls: [{ id: "call-2", name: "flaky", args: {} }] },
    ]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [failingTool], maxSteps: 5, selfCorrectOnFailure: true });

    const handle = kernel.run("Do something", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const selfCorrecting = events.filter((e) => e.type === "tool.self_correcting");
    expect(selfCorrecting.length).toBe(1);
    const sc = selfCorrecting[0]! as unknown as RunEvent<ToolSelfCorrectingData>;
    expect(sc.data.toolName).toBe("flaky");
    expect(sc.data.error).toContain("Network timeout");

    // tool should have been called twice (once fail, once retry)
    expect(callCount).toBe(2);
  });

  it("TC15: self-correct disabled (default) — does not emit tool.self_correcting", async () => {
    const failingTool = new FakeTool("flaky", async () => { throw new Error("fail"); });
    const model = new FakeModelProvider([
      { content: "use flaky", toolCalls: [{ id: "call-1", name: "flaky", args: {} }] },
    ]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [failingTool], maxSteps: 5 });

    const handle = kernel.run("Do something", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    expect(events.filter((e) => e.type === "tool.self_correcting")).toHaveLength(0);
  });

  it("TC08: abort() — cancel running run", async () => {
    const slowTool = new FakeTool("slow", async () => {
      await new Promise((r) => setTimeout(r, 5000));
      return "done";
    });
    const model = new FakeModelProvider([
      {
        content: "",
        toolCalls: [{ id: "call-1", name: "slow", args: {} }],
      },
    ]);

    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [slowTool], maxSteps: 5 });

    const handle = kernel.run("Test abort", testCtx);
    handle.abort();
    await handle.completed;

    const events = await store.list(handle.runId);
    const completed = findEvent(events, "run.completed");
    expect(completed?.data.status).toBe("failed");
    expect(completed?.data.error).toContain("cancelled");
  });

  // ---------------------------------------------------------------------------
  // Session tracking
  // ---------------------------------------------------------------------------
  it("TC16: session store receives model and tokens on successful run", async () => {
    const model = new FakeModelProvider([
      { content: "Hello session!" },
    ]);
    const store = new FakeRunEventStore();
    let updatedSession: { id: string; updates: Record<string, unknown> } | undefined;
    const sessionStore = {
      async addMessage() {},
      async updateSession(id: string, updates: Record<string, unknown>) {
        updatedSession = { id, updates };
      },
    } as unknown as SessionStore;

    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, sessionStore });

    const handle = kernel.run("Test session", testCtx, "session-1");
    await handle.completed;

    expect(updatedSession).toBeDefined();
    expect(updatedSession!.id).toBe("session-1");
    expect(updatedSession!.updates).toHaveProperty("model", "fake-model");
    // tokens are accumulated from step 0: FakeModelProvider.countTokens uses Math.ceil(len/4)
    // prompt "Test session" = 12 chars → 3 tokens input
    // response "Hello session!" = 14 chars → 4 tokens output
    expect((updatedSession!.updates as Record<string, number>).inputTokens).toBeGreaterThan(0);
    expect((updatedSession!.updates as Record<string, number>).outputTokens).toBeGreaterThan(0);
  });

  it("TC17: session store not called when no sessionId provided", async () => {
    const model = new FakeModelProvider([
      { content: "Hello!" },
    ]);
    const store = new FakeRunEventStore();
    let called = false;
    const sessionStore = {
      async addMessage() {},
      async updateSession() { called = true; },
    } as unknown as SessionStore;

    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, sessionStore });

    const handle = kernel.run("Test", testCtx);
    await handle.completed;

    expect(called).toBe(false);
  });

  it("TC18: session store receives model and tokens on failed run (cancelled)", async () => {
    const model = new FakeModelProvider([
      { content: "Hello!" },
    ]);
    const store = new FakeRunEventStore();
    let updatedSession: { id: string; updates: Record<string, unknown> } | undefined;
    const sessionStore = {
      async addMessage() {},
      async updateSession(id: string, updates: Record<string, unknown>) {
        updatedSession = { id, updates };
      },
    } as unknown as SessionStore;

    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, sessionStore });
    const handle = kernel.run("Test", testCtx, "session-fail");
    handle.abort();
    await handle.completed;

    expect(updatedSession).toBeDefined();
    expect(updatedSession!.id).toBe("session-fail");
  });

  // ---------------------------------------------------------------------------
  // Agent integration
  // ---------------------------------------------------------------------------
  it("TC19: useAgent sets currentAgent and prepends systemPrompt to run", async () => {
    const model = new FakeModelProvider([
      { content: "I am a code assistant" },
    ]);
    const store = new FakeRunEventStore();
    const agentRegistry = new FakeAgentRegistry();
    const agentConfig: AgentConfig = {
      id: "code-agent" as AgentId,
      profile: { name: "Code Agent", description: "Writes code" },
      capabilities: { tools: ["read", "write"], streaming: true },
      systemPrompt: "You are a coding expert.",
    };
    await agentRegistry.register(agentConfig);

    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, agentRegistry });
    await kernel.useAgent("code-agent" as AgentId);

    const handle = kernel.run("Write a function", testCtx);
    await handle.completed;

    // The model should have received the system prompt prepended
    const events = await store.list(handle.runId);
    const started = findEvent(events, "run.started");
    expect(started?.data.prompt).toContain("You are a coding expert.");
    expect(started?.data.prompt).toContain("Write a function");
  });

  it("TC20: useAgent throws when no agent registry configured", async () => {
    const model = new FakeModelProvider([{ content: "Hi" }]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10 });

    await expect(kernel.useAgent("nonexistent" as AgentId))
      .rejects.toThrow(/no agent registry/i);
  });

  it("TC21: useAgent throws when agent not found", async () => {
    const model = new FakeModelProvider([{ content: "Hi" }]);
    const store = new FakeRunEventStore();
    const agentRegistry = new FakeAgentRegistry();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, agentRegistry });

    await expect(kernel.useAgent("unknown-agent" as AgentId))
      .rejects.toThrow(/not found/i);
  });

  it("TC22: kernel without agent registry runs fine (no agent)", async () => {
    const model = new FakeModelProvider([{ content: "Hello!" }]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10 });

    const handle = kernel.run("Hi", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const completed = findEvent(events, "run.completed");
    expect(completed?.data.status).toBe("succeeded");
  });

  it("TC23: session store failure does not crash the run", async () => {
    const model = new FakeModelProvider([{ content: "Hello!" }]);
    const store = new FakeRunEventStore();
    const sessionStore = {
      async addMessage() {},
      async updateSession() { throw new Error("DB unavailable"); },
    } as unknown as SessionStore;

    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, sessionStore });

    const handle = kernel.run("Test", testCtx, "session-crash");
    await handle.completed;

    const events = await store.list(handle.runId);
    const completed = findEvent(events, "run.completed");
    expect(completed?.data.status).toBe("succeeded");
  });

  it("TC24: spawnAgent creates a sub-agent registered in the registry", async () => {
    const model = new FakeModelProvider([{ content: "Hello!" }]);
    const store = new FakeRunEventStore();
    const agentRegistry = new FakeAgentRegistry();
    const parentAgent: AgentConfig = {
      id: "parent-agent" as AgentId,
      profile: { name: "Parent", description: "Parent agent" },
      capabilities: { streaming: true },
      permissions: { allowedTools: ["read"], maxSteps: 20 },
    };
    await agentRegistry.register(parentAgent);
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, agentRegistry });
    await kernel.useAgent("parent-agent" as AgentId);

    const child = await kernel.spawnAgent({
      profile: { name: "Child", description: "Child agent" },
      permissions: { maxSteps: 5 },
    });

    expect(child.profile.name).toBe("Child");
    expect(child.permissions?.maxSteps).toBe(5);
    expect(child.permissions?.allowedTools).toEqual(["read"]);

    const registered = await agentRegistry.get(child.id);
    expect(registered?.profile.name).toBe("Child");
  });

  it("TC25: spawnAgent throws without agent registry", async () => {
    const model = new FakeModelProvider([{ content: "x" }]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10 });
    await expect(kernel.spawnAgent({ profile: { name: "X", description: "Y" } }))
      .rejects.toThrow(/no agent registry/i);
  });

  it("TC26: tool permission check denies tools not in allowedTools", async () => {
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "tc1", name: "test_tool", args: {} }] },
      { content: "Done" },
    ]);
    const store = new FakeRunEventStore();
    const agentRegistry = new FakeAgentRegistry();
    const agent: AgentConfig = {
      id: "restricted" as AgentId,
      profile: { name: "Restricted", description: "Has limited tools" },
      capabilities: {},
      permissions: { allowedTools: ["allowed_tool"] },
    };
    await agentRegistry.register(agent);
    const testTool: ToolDefinition = {
      id: "test_tool", description: "Not in allowed list", risk: "read",
      async execute() { return "result"; },
    };
    const kernel = new AgentKernel({ model, store, tools: [testTool], maxSteps: 10, agentRegistry });
    await kernel.useAgent("restricted" as AgentId);

    const handle = kernel.run("Run test", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const toolFailed = findEvent(events, "tool.failed");
    expect(toolFailed).toBeTruthy();
    expect(toolFailed?.data.toolName).toBe("test_tool");
  });

  it("TC27: tool permission check denies tools in deniedTools", async () => {
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "tc1", name: "danger_tool", args: {} }] },
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
    const dangerTool: ToolDefinition = {
      id: "danger_tool", description: "Dangerous", risk: "destructive",
      async execute() { return "boom"; },
    };
    const kernel = new AgentKernel({ model, store, tools: [dangerTool], maxSteps: 10, agentRegistry });
    await kernel.useAgent("safe" as AgentId);

    const handle = kernel.run("Run test", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const toolFailed = findEvent(events, "tool.failed");
    expect(toolFailed).toBeTruthy();
    expect(toolFailed?.data.toolName).toBe("danger_tool");
  });

  it("TC28: agent without permissions allows low-risk tools", async () => {
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "tc1", name: "any_tool", args: {} }] },
      { content: "Done" },
    ]);
    const store = new FakeRunEventStore();
    const agentRegistry = new FakeAgentRegistry();
    const agent: AgentConfig = {
      id: "open" as AgentId,
      profile: { name: "Open", description: "No permissions" },
      capabilities: {},
    };
    await agentRegistry.register(agent);
    const anyTool: ToolDefinition = {
      id: "any_tool", description: "Any tool", risk: "read",
      async execute() { return "ok"; },
    };
    const kernel = new AgentKernel({ model, store, tools: [anyTool], maxSteps: 10, agentRegistry });
    await kernel.useAgent("open" as AgentId);

    const handle = kernel.run("Run test", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const toolCompleted = findEvent(events, "tool.completed");
    expect(toolCompleted).toBeTruthy();
  });

  it("TC29: maxSteps permission stops run early", async () => {
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "tc1", name: "loop_tool", args: {} }] },
      { content: "", toolCalls: [{ id: "tc2", name: "loop_tool", args: {} }] },
    ]);
    const store = new FakeRunEventStore();
    const agentRegistry = new FakeAgentRegistry();
    const agent: AgentConfig = {
      id: "limited" as AgentId,
      profile: { name: "Limited", description: "Few steps" },
      capabilities: {},
      permissions: { maxSteps: 1 },
    };
    await agentRegistry.register(agent);
    const loopTool: ToolDefinition = {
      id: "loop_tool", description: "Loops", risk: "read",
      async execute() { return "looped"; },
    };
    const kernel = new AgentKernel({ model, store, tools: [loopTool], maxSteps: 10, agentRegistry });
    await kernel.useAgent("limited" as AgentId);

    const handle = kernel.run("Run test", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const completed = findEvent(events, "run.completed");
    expect(completed?.data.status).toBe("failed");
    expect(completed?.data.error).toContain("max steps");
  });

  it("TC30: runAgent delegates to a sub-agent and returns output", async () => {
    const model = new FakeModelProvider([{ content: "Sub result" }]);
    const store = new FakeRunEventStore();
    const agentRegistry = new FakeAgentRegistry();
    const parent: AgentConfig = {
      id: "parent" as AgentId, profile: { name: "Parent", description: "" }, capabilities: {},
    };
    const child: AgentConfig = {
      id: "child" as AgentId, profile: { name: "Child", description: "" }, capabilities: {},
    };
    await agentRegistry.register(parent);
    await agentRegistry.register(child, parent.id);
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, agentRegistry });
    await kernel.useAgent("parent" as AgentId);

    const output = await kernel.runAgent("child" as AgentId, "Do something", testCtx);
    expect(output).toBe("Sub result");
    expect(kernel.getCurrentAgent()?.id).toBe("parent");
  });

  it("TC31: runAgent restores current agent after completion", async () => {
    const model = new FakeModelProvider([{ content: "Ok" }]);
    const store = new FakeRunEventStore();
    const agentRegistry = new FakeAgentRegistry();
    const parent: AgentConfig = {
      id: "p" as AgentId, profile: { name: "P", description: "" }, capabilities: {},
    };
    const child: AgentConfig = {
      id: "c" as AgentId, profile: { name: "C", description: "" }, capabilities: {},
    };
    await agentRegistry.register(parent);
    await agentRegistry.register(child, parent.id);
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, agentRegistry });
    await kernel.useAgent("p" as AgentId);

    await kernel.runAgent("c" as AgentId, "Work", testCtx);
    expect(kernel.getCurrentAgent()?.id).toBe("p");
  });

  describe("plugin hooks integration", () => {
    function makeSpyPlugin(id: string, hooks: Partial<PluginHooks>): Plugin {
      return {
        manifest: { id, name: `Plugin ${id}`, version: "1.0.0" },
        activate: async () => {},
        hooks: {
          onRunStarted: hooks.onRunStarted ?? (async () => {}),
          onStepStarted: hooks.onStepStarted ?? (async () => {}),
          onTokenStreamed: hooks.onTokenStreamed ?? (async () => {}),
          onToolInvoked: hooks.onToolInvoked ?? (async () => null) as PluginHooks["onToolInvoked"],
          onToolCompleted: hooks.onToolCompleted ?? (async () => null) as PluginHooks["onToolCompleted"],
          onToolFailed: hooks.onToolFailed ?? (async () => {}),
          onContextCompressed: hooks.onContextCompressed ?? (async () => {}),
          onStepCompleted: hooks.onStepCompleted ?? (async () => {}),
          onRunCompleted: hooks.onRunCompleted ?? (async () => {}),
        },
      };
    }

    it("TC32: fires lifecycle hooks in correct order for a simple run", async () => {
      const model = new FakeModelProvider([{ content: "Hello" }]);
      const store = new FakeRunEventStore();
      const agentRegistry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(agentRegistry);
      const calls: string[] = [];
      const plugin = makeSpyPlugin("spy", {
        onRunStarted: async () => { calls.push("onRunStarted"); },
        onStepStarted: async () => { calls.push("onStepStarted"); },
        onTokenStreamed: async () => { calls.push("onTokenStreamed"); },
        onStepCompleted: async () => { calls.push("onStepCompleted"); },
        onRunCompleted: async () => { calls.push("onRunCompleted"); },
      });
      await pm.register(plugin);
      await pm.activate("spy");
      const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, pluginManager: pm });
      const handle = kernel.run("Hi", testCtx);
      await handle.completed;
      expect(calls).toEqual([
        "onRunStarted",
        "onStepStarted",
        "onTokenStreamed",
        "onStepCompleted",
        "onRunCompleted",
      ]);
    });

    it("TC33: onToolInvoked fires with correct data and can modify input", async () => {
      const model = new FakeModelProvider([{
        content: "Using tool",
        toolCalls: [{ id: "call-1", name: "test_tool", args: { value: 1 } }],
      }, { content: "Done" }]);
      const store = new FakeRunEventStore();
      const agentRegistry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(agentRegistry);
      let capturedInput: unknown;
      const plugin = makeSpyPlugin("spy", {
        onToolInvoked: async (data) => {
          capturedInput = data.input;
          return { modified: { input: { value: 999 } } };
        },
      });
      await pm.register(plugin);
      await pm.activate("spy");
      let executedArgs: unknown;
      const tool: ToolDefinition = {
        id: "test_tool", description: "Test", risk: "read",
        async execute(input: unknown) { executedArgs = input; return "ok"; },
      };
      const kernel = new AgentKernel({ model, store, tools: [tool], maxSteps: 10, pluginManager: pm });
      const handle = kernel.run("Use tool", testCtx);
      await handle.completed;
      expect(capturedInput).toEqual({ value: 1 });
      expect(executedArgs).toEqual({ value: 999 });
    });

    it("TC34: onToolCompleted fires with correct data and can modify output", async () => {
      const model = new FakeModelProvider([{
        content: "Using tool",
        toolCalls: [{ id: "call-1", name: "test_tool", args: {} }],
      }, { content: "Done" }]);
      const store = new FakeRunEventStore();
      const agentRegistry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(agentRegistry);
      let capturedOutput: unknown;
      const plugin = makeSpyPlugin("spy", {
        onToolCompleted: async (data) => {
          capturedOutput = data.output;
          return { modified: { output: "[REDACTED]" } };
        },
      });
      await pm.register(plugin);
      await pm.activate("spy");
      const tool: ToolDefinition = {
        id: "test_tool", description: "Test", risk: "read",
        async execute() { return "sensitive-data"; },
      };
      const kernel = new AgentKernel({ model, store, tools: [tool], maxSteps: 10, pluginManager: pm });
      const handle = kernel.run("Use tool", testCtx);
      await handle.completed;
      expect(capturedOutput).toBe("sensitive-data");
      const events = await store.list(handle.runId);
      const completedEvents = events.filter((e) => e.type === "tool.completed");
      const lastCompleted = completedEvents[completedEvents.length - 1];
      expect((lastCompleted?.data as Record<string, unknown>).output).toBe("[REDACTED]");
    });

    it("TC35: onToolFailed fires when tool throws", async () => {
      const model = new FakeModelProvider([{
        content: "Using tool",
        toolCalls: [{ id: "call-1", name: "error_tool", args: {} }],
      }, { content: "Trying again" }]);
      const store = new FakeRunEventStore();
      const agentRegistry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(agentRegistry);
      const errors: string[] = [];
      const plugin = makeSpyPlugin("spy", {
        onToolFailed: async (data) => { errors.push(data.error); },
      });
      await pm.register(plugin);
      await pm.activate("spy");
      const tool: ToolDefinition = {
        id: "error_tool", description: "Error", risk: "read",
        async execute() { throw new Error("something broke"); },
      };
      const kernel = new AgentKernel({ model, store, tools: [tool], maxSteps: 10, pluginManager: pm });
      const handle = kernel.run("Use tool", testCtx);
      await handle.completed;
      expect(errors).toContain("something broke");
    });

    it("TC36: onRunCompleted fires on failure", async () => {
      const model: ModelProvider = {
        model: "fail-model",
        pricing: { input: 0, output: 0 },
        generate: async () => { throw new Error("Invalid API key"); },
      };
      const store = new FakeRunEventStore();
      const agentRegistry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(agentRegistry);
      let runStatus: string | undefined;
      const plugin = makeSpyPlugin("spy", {
        onRunCompleted: async (data) => { runStatus = data.status; },
      });
      await pm.register(plugin);
      await pm.activate("spy");
      const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, pluginManager: pm });
      const handle = kernel.run("", testCtx);
      await handle.completed;
      expect(runStatus).toBe("failed");
    });
  });

  describe("wildcard permission matching", () => {
    it("TC37: allowedTools supports wildcard patterns", async () => {
      const model = new FakeModelProvider([{
        content: "",
        toolCalls: [{ id: "c1", name: "read_file", args: {} }],
      }, { content: "Result" }]);
      const store = new FakeRunEventStore();
      const agentRegistry = new FakeAgentRegistry();
      const agent: AgentConfig = {
        id: "wild" as AgentId, profile: { name: "Wild", description: "" },
        capabilities: {},
        permissions: { allowedTools: ["read_*", "search_*"] },
      };
      await agentRegistry.register(agent);
      const readFile: ToolDefinition = {
        id: "read_file", description: "Read", risk: "read",
        async execute() { return "content"; },
      };
      const writeFile: ToolDefinition = {
        id: "write_file", description: "Write", risk: "write",
        async execute() { return "written"; },
      };
      const kernel = new AgentKernel({ model, store, tools: [readFile, writeFile], maxSteps: 10, agentRegistry });
      await kernel.useAgent("wild" as AgentId);
      const handle = kernel.run("test", testCtx);
      await handle.completed;
      const events = await store.list(handle.runId);
      // read_file matches read_* → succeeds
      const toolCompleted = events.filter((e) => e.type === "tool.completed");
      expect(toolCompleted.length).toBeGreaterThan(0);
    });

  describe("tool filtering by agent capabilities", () => {
    it("TC39: filters tools to those matching agent capabilities.tools", async () => {
      const model = new FakeModelProvider([{ content: "done" }]);
      const store = new FakeRunEventStore();
      const agentRegistry = new FakeAgentRegistry();
      const agent: AgentConfig = {
        id: "filtered" as AgentId,
        profile: { name: "Filtered", description: "" },
        capabilities: { tools: ["read_*"] },
      };
      await agentRegistry.register(agent);
      const readFile: ToolDefinition = {
        id: "read_file", description: "Read", risk: "read",
        async execute() { return "content"; },
      };
      const writeFile: ToolDefinition = {
        id: "write_file", description: "Write", risk: "write",
        async execute() { return "written"; },
      };
      const kernel = new AgentKernel({ model, store, tools: [readFile, writeFile], maxSteps: 10, agentRegistry });
      await kernel.useAgent("filtered" as AgentId);
      // Verify only read_file is available
      expect(kernel["findTool"]("read_file")).toBeDefined();
      expect(kernel["findTool"]("write_file")).toBeUndefined();
    });

    it("TC40: no capabilities.tools means all tools are available", async () => {
      const model = new FakeModelProvider([{ content: "done" }]);
      const store = new FakeRunEventStore();
      const agentRegistry = new FakeAgentRegistry();
      const agent: AgentConfig = {
        id: "unfiltered" as AgentId,
        profile: { name: "Unfiltered", description: "" },
        capabilities: {},
      };
      await agentRegistry.register(agent);
      const readFile: ToolDefinition = {
        id: "read_file", description: "Read", risk: "read",
        async execute() { return "content"; },
      };
      const kernel = new AgentKernel({ model, store, tools: [readFile], maxSteps: 10, agentRegistry });
      await kernel.useAgent("unfiltered" as AgentId);
      expect(kernel["findTool"]("read_file")).toBeDefined();
    });
  });

  describe("agent identity injection", () => {
    it("TC41: builds identity from agent config", async () => {
      const model = new FakeModelProvider([{ content: "hello" }]);
      const store = new FakeRunEventStore();
      const agentRegistry = new FakeAgentRegistry();
      const agent: AgentConfig = {
        id: "ident" as AgentId,
        profile: { name: "Helper", description: "Helps with tasks" },
        capabilities: { streaming: true, tools: ["read", "write"] },
      };
      await agentRegistry.register(agent);
      const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, agentRegistry });
      await kernel.useAgent("ident" as AgentId);
      const identity = buildAgentIdentity(agent);
      expect(identity).toContain("Helper");
      expect(identity).toContain("Helps with tasks");
      expect(identity).toContain("streaming");
      expect(identity).toContain("tools: read, write");
    });

    it("TC42: sub-agent identity mentions sub-agent role", async () => {
      const model = new FakeModelProvider([{ content: "hello" }]);
      const store = new FakeRunEventStore();
      const agentRegistry = new FakeAgentRegistry();
      const agent: AgentConfig = {
        id: "sub" as AgentId,
        profile: { name: "Sub", description: "Sub agent" },
        capabilities: {},
        permissions: { mode: "subagent" },
      };
      await agentRegistry.register(agent);
      const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, agentRegistry });
      await kernel.useAgent("sub" as AgentId);
      const identity = buildAgentIdentity(agent);
      expect(identity).toContain("sub-agent");
      expect(identity).toContain("follow the primary agent");
    });
  });

  describe("full agent lifecycle", () => {
    it("TC43: spawn sub-agent, verify mode + permission inheritance", async () => {
      const model = new FakeModelProvider([{ content: "done" }]);
      const store = new FakeRunEventStore();
      const agentRegistry = new FakeAgentRegistry();
      const parent: AgentConfig = {
        id: "parent" as AgentId,
        profile: { name: "Parent", description: "Top level" },
        capabilities: { tools: ["read_*", "write_*"] },
        permissions: { mode: "primary", allowedTools: ["read_*", "write_*"] },
      };
      await agentRegistry.register(parent);
      const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, agentRegistry });
      await kernel.useAgent("parent" as AgentId);

      const child = await kernel.spawnAgent({
        profile: { name: "Child", description: "Sub task" },
        permissions: { deniedTools: ["write_delete"] },
      });
      expect(child.permissions?.mode).toBe("subagent");
      expect(child.permissions?.allowedTools).toEqual(["read_*", "write_*"]);
      expect(child.permissions?.deniedTools).toContain("write_delete");
    });

    it("TC44: ruleset-based permissions allow/deny correctly", async () => {
      const model = new FakeModelProvider([{ content: "",
        toolCalls: [{ id: "c1", name: "read_file", args: {} }],
      }, { content: "done" }]);
      const store = new FakeRunEventStore();
      const agentRegistry = new FakeAgentRegistry();
      const agent: AgentConfig = {
        id: "ruleset-agent" as AgentId,
        profile: { name: "Ruleset", description: "" },
        capabilities: {},
        permissions: {
          mode: "primary",
          ruleset: {
            rules: [
              { effect: "allow", target: "tool.read_*" },
              { effect: "allow", target: "tool.web_*" },
              { effect: "deny", target: "tool.write_*" },
            ],
          },
        },
      };
      await agentRegistry.register(agent);
      const readFile: ToolDefinition = {
        id: "read_file", description: "Read", risk: "read",
        async execute() { return "content"; },
      };
      const kernel = new AgentKernel({ model, store, tools: [readFile], maxSteps: 10, agentRegistry });
      await kernel.useAgent("ruleset-agent" as AgentId);
      const handle = kernel.run("read a file", testCtx);
      await handle.completed;
      const events = await store.list(handle.runId);
      const toolCompleted = events.filter((e) => e.type === "tool.completed" || e.type === "tool.failed");
      expect(toolCompleted.length).toBeGreaterThan(0);
      expect(toolCompleted[0]?.type).toBe("tool.completed");
    });

    it("TC45: ruleset deny overrides allow", async () => {
      const model = new FakeModelProvider([{ content: "",
        toolCalls: [{ id: "c1", name: "write_file", args: {} }],
      }, { content: "done" }]);
      const store = new FakeRunEventStore();
      const agentRegistry = new FakeAgentRegistry();
      const agent: AgentConfig = {
        id: "ruleset-deny" as AgentId,
        profile: { name: "DenyAgent", description: "" },
        capabilities: {},
        permissions: {
          mode: "primary",
          ruleset: {
            rules: [
              { effect: "allow", target: "tool.*" },
              { effect: "deny", target: "tool.write_*" },
            ],
          },
        },
      };
      await agentRegistry.register(agent);
      const writeFile: ToolDefinition = {
        id: "write_file", description: "Write", risk: "write",
        async execute() { return "written"; },
      };
      const kernel = new AgentKernel({ model, store, tools: [writeFile], maxSteps: 10, agentRegistry });
      await kernel.useAgent("ruleset-deny" as AgentId);
      const handle = kernel.run("write", testCtx);
      await handle.completed;
      const events = await store.list(handle.runId);
      const toolFailed = events.filter((e) => e.type === "tool.failed");
      expect(toolFailed.length).toBeGreaterThan(0);
      expect((toolFailed[0]?.data as Record<string, unknown>).error).toContain("not found");
    });
  });

    it("TC38: deniedTools with wildcard blocks matching tools", async () => {
      const model = new FakeModelProvider([{
        content: "",
        toolCalls: [{ id: "c1", name: "write_file", args: {} }],
      }, { content: "Done" }]);
      const store = new FakeRunEventStore();
      const agentRegistry = new FakeAgentRegistry();
      const agent: AgentConfig = {
        id: "deny-wild" as AgentId, profile: { name: "Deny", description: "" },
        capabilities: {},
        permissions: { allowedTools: ["*"], deniedTools: ["write_*", "delete_*"] },
      };
      await agentRegistry.register(agent);
      const writeFile: ToolDefinition = {
        id: "write_file", description: "Write", risk: "write",
        async execute() { return "written"; },
      };
      const readFile: ToolDefinition = {
        id: "read_file", description: "Read", risk: "read",
        async execute() { return "content"; },
      };
      const kernel = new AgentKernel({ model, store, tools: [writeFile, readFile], maxSteps: 10, agentRegistry });
      await kernel.useAgent("deny-wild" as AgentId);
      const handle = kernel.run("test", testCtx);
      await handle.completed;
      const events = await store.list(handle.runId);
      const toolFailed = events.filter((e) => e.type === "tool.failed");
      expect(toolFailed.length).toBeGreaterThan(0);
      expect((toolFailed[0]?.data as Record<string, unknown>).error).toContain("not found");
    });
  });

  describe("permission ask flow", () => {
    it("ask with 'once' reply emits permission events then executes tool", async () => {
      const model = new FakeModelProvider([
        { content: "", toolCalls: [{ id: "call_1", name: "read_file", args: { path: "test.txt" } }] },
        { content: "done reading" },
      ]);
      const store = new FakeRunEventStore();
      const approvalStore = new FakeApprovalStore();
      approvalStore.queueReply("once");

      const readFile: ToolDefinition = {
        id: "read_file", description: "Read", risk: "read",
        async execute() { return "file content"; },
      };

      const agent: AgentConfig = {
        id: "ask-agent" as AgentId,
        profile: { name: "AskAgent", description: "" },
        capabilities: {},
        permissions: {
          ruleset: {
            rules: [{ effect: "ask", target: "tool.read_file", reason: "Need approval to read" }],
          },
        },
      };

      const registry = new FakeAgentRegistry();
      await registry.register(agent);
      const kernel = new AgentKernel({ model, store, tools: [readFile], maxSteps: 10, agentRegistry: registry, approvalStore });
      await kernel.useAgent("ask-agent" as AgentId);

      const handle = kernel.run("read this file", testCtx);
      await handle.completed;

      const events = await store.list(handle.runId);
      const types = events.map((e) => e.type);

      expect(types).toContain("permission.requested");
      expect(types).toContain("permission.replied");
      expect(types).toContain("tool.invoked");
      expect(types).toContain("tool.completed");

      const reqEvent = events.find((e) => e.type === "permission.requested");
      expect((reqEvent!.data as Record<string, unknown>).toolName).toBe("read_file");
      expect((reqEvent!.data as Record<string, unknown>).reason).toBe("Need approval to read");

      const repEvent = events.find((e) => e.type === "permission.replied");
      expect((repEvent!.data as Record<string, unknown>).reply).toBe("once");
    });

    it("ask with 'reject' reply rejects tool and does not execute it", async () => {
      const model = new FakeModelProvider([
        { content: "", toolCalls: [{ id: "call_1", name: "read_file", args: { path: "test.txt" } }] },
      ]);
      const store = new FakeRunEventStore();
      const approvalStore = new FakeApprovalStore();
      approvalStore.queueReply("reject");

      const readFile: ToolDefinition = {
        id: "read_file", description: "Read", risk: "read",
        async execute() { return "file content"; },
      };

      const agent: AgentConfig = {
        id: "reject-agent" as AgentId,
        profile: { name: "RejectAgent", description: "" },
        capabilities: {},
        permissions: {
          ruleset: {
            rules: [{ effect: "ask", target: "tool.read_file", reason: "Need approval" }],
          },
        },
      };

      const registry = new FakeAgentRegistry();
      await registry.register(agent);
      const kernel = new AgentKernel({ model, store, tools: [readFile], maxSteps: 10, agentRegistry: registry, approvalStore });
      await kernel.useAgent("reject-agent" as AgentId);

      const handle = kernel.run("read this file", testCtx);
      await handle.completed;

      const events = await store.list(handle.runId);
      expect(events.filter((e) => e.type === "tool.invoked")).toHaveLength(0);
      expect(events.filter((e) => e.type === "tool.completed")).toHaveLength(0);

      const failed = events.find((e) => e.type === "tool.failed");
      expect(failed).toBeDefined();
      expect((failed!.data as Record<string, unknown>).error).toContain("rejected by user");
      expect(failed!.data).toMatchObject({ toolName: "read_file", domain: "core", decision: "deny" });
    });

    it("ask with 'always' reply executes tool", async () => {
      const model = new FakeModelProvider([
        { content: "", toolCalls: [{ id: "call_1", name: "read_file", args: { path: "test.txt" } }] },
        { content: "done reading" },
      ]);
      const store = new FakeRunEventStore();
      const approvalStore = new FakeApprovalStore();
      approvalStore.queueReply("always");

      const readFile: ToolDefinition = {
        id: "read_file", description: "Read", risk: "read",
        async execute() { return "file content"; },
      };

      const agent: AgentConfig = {
        id: "always-agent" as AgentId,
        profile: { name: "AlwaysAgent", description: "" },
        capabilities: {},
        permissions: {
          ruleset: {
            rules: [{ effect: "ask", target: "tool.read_file", reason: "Need approval" }],
          },
        },
      };

      const registry = new FakeAgentRegistry();
      await registry.register(agent);
      const kernel = new AgentKernel({ model, store, tools: [readFile], maxSteps: 10, agentRegistry: registry, approvalStore });
      await kernel.useAgent("always-agent" as AgentId);

      const handle = kernel.run("read this file", testCtx);
      await handle.completed;

      const events = await store.list(handle.runId);
      const replied = events.find((e) => e.type === "permission.replied");
      expect((replied!.data as Record<string, unknown>).reply).toBe("always");

      const invoked = events.find((e) => e.type === "tool.invoked");
      expect(invoked).toBeDefined();
    });

    it("no matching rule defaults to 'ask'", async () => {
      const model = new FakeModelProvider([
        { content: "", toolCalls: [{ id: "call_1", name: "read_file", args: { path: "test.txt" } }] },
      ]);
      const store = new FakeRunEventStore();
      const approvalStore = new FakeApprovalStore();
      approvalStore.queueReply("reject");

      const readFile: ToolDefinition = {
        id: "read_file", description: "Read", risk: "read",
        async execute() { return "file content"; },
      };

      const agent: AgentConfig = {
        id: "default-agent" as AgentId,
        profile: { name: "DefaultAgent", description: "" },
        capabilities: {},
        permissions: {
          ruleset: {
            rules: [{ effect: "allow", target: "tool.write_*" }],
          },
        },
      };

      const registry = new FakeAgentRegistry();
      await registry.register(agent);
      const kernel = new AgentKernel({ model, store, tools: [readFile], maxSteps: 10, agentRegistry: registry, approvalStore });
      await kernel.useAgent("default-agent" as AgentId);

      const handle = kernel.run("read this file", testCtx);
      await handle.completed;

      const events = await store.list(handle.runId);
      const types = events.map((e) => e.type);
      expect(types).toContain("permission.requested");
      expect(types).toContain("permission.replied");
      expect(types).not.toContain("tool.invoked");
    });

    it("no approvalStore configured rejects all asks", async () => {
      const model = new FakeModelProvider([
        { content: "", toolCalls: [{ id: "call_1", name: "read_file", args: { path: "test.txt" } }] },
      ]);
      const store = new FakeRunEventStore();

      const readFile: ToolDefinition = {
        id: "read_file", description: "Read", risk: "read",
        async execute() { return "file content"; },
      };

      const agent: AgentConfig = {
        id: "no-store-agent" as AgentId,
        profile: { name: "NoStoreAgent", description: "" },
        capabilities: {},
        permissions: {
          ruleset: {
            rules: [{ effect: "ask", target: "tool.read_file", reason: "Need approval" }],
          },
        },
      };

      const registry = new FakeAgentRegistry();
      await registry.register(agent);
      const kernel = new AgentKernel({ model, store, tools: [readFile], maxSteps: 10, agentRegistry: registry });
      await kernel.useAgent("no-store-agent" as AgentId);

      const handle = kernel.run("read this file", testCtx);
      await handle.completed;

      const events = await store.list(handle.runId);
      const replied = events.find((e) => e.type === "permission.replied");
      expect((replied!.data as Record<string, unknown>).reply).toBe("reject");
      expect(events.filter((e) => e.type === "tool.invoked")).toHaveLength(0);
    });

    it("ask flow emits correct permission events data", async () => {
      const model = new FakeModelProvider([
        { content: "", toolCalls: [{ id: "call_1", name: "read_file", args: { path: "test.txt" } }] },
        { content: "done" },
      ]);
      const store = new FakeRunEventStore();
      const approvalStore = new FakeApprovalStore();
      approvalStore.queueReply("once");

      const readFile: ToolDefinition = {
        id: "read_file", description: "Read", risk: "read",
        async execute() { return "file content"; },
      };

      const agent: AgentConfig = {
        id: "data-agent" as AgentId,
        profile: { name: "DataAgent", description: "" },
        capabilities: {},
        permissions: {
          ruleset: {
            rules: [{ effect: "ask", target: "tool.read_file", reason: "Custom reason" }],
          },
        },
      };

      const registry = new FakeAgentRegistry();
      await registry.register(agent);
      const kernel = new AgentKernel({ model, store, tools: [readFile], maxSteps: 10, agentRegistry: registry, approvalStore });
      await kernel.useAgent("data-agent" as AgentId);

      const handle = kernel.run("read this file", testCtx);
      await handle.completed;

      const events = await store.list(handle.runId);
      const reqEvent = events.find((e) => e.type === "permission.requested")!;
      const reqData = reqEvent.data as Record<string, unknown>;

      expect(reqData.requestId).toBeDefined();
      expect(reqData.toolName).toBe("read_file");
      expect(reqData.resource).toBe("read_file");
      expect(reqData.reason).toBe("Custom reason");

      const repEvent = events.find((e) => e.type === "permission.replied")!;
      const repData = repEvent.data as Record<string, unknown>;
      expect(repData.reply).toBe("once");
      expect(repData.requestId).toBeDefined();
    });

    it("onPermissionAsk plugin hook fires and can auto-approve", async () => {
      const model = new FakeModelProvider([
        { content: "", toolCalls: [{ id: "call_1", name: "read_file", args: { path: "test.txt" } }] },
        { content: "done" },
      ]);
      const store = new FakeRunEventStore();
      const pluginManager = new DefaultPluginManager(new FakeAgentRegistry());

      const askHook = vi.fn().mockResolvedValue({ modified: { reply: "once" } });
      const plugin: Plugin = {
        manifest: { id: "auto-approve", name: "AutoApprove", version: "1.0.0" },
        activate: async () => {},
        hooks: { onPermissionAsk: askHook },
      };
      await pluginManager.register(plugin);
      await pluginManager.activate("auto-approve");

      const readFile: ToolDefinition = {
        id: "read_file", description: "Read", risk: "read",
        async execute() { return "file content"; },
      };

      const agent: AgentConfig = {
        id: "hook-agent" as AgentId,
        profile: { name: "HookAgent", description: "" },
        capabilities: {},
        permissions: {
          ruleset: {
            rules: [{ effect: "ask", target: "tool.read_file", reason: "Need approval" }],
          },
        },
      };

      const registry = new FakeAgentRegistry();
      await registry.register(agent);
      const kernel = new AgentKernel({ model, store, tools: [readFile], maxSteps: 10, agentRegistry: registry, pluginManager });
      await kernel.useAgent("hook-agent" as AgentId);

      const handle = kernel.run("read this file", testCtx);
      await handle.completed;

      expect(askHook).toHaveBeenCalledOnce();
      expect(askHook).toHaveBeenCalledWith({
        permission: "tool.read_file",
        resource: "read_file",
        reason: "Need approval",
      });

      const events = await store.list(handle.runId);
      expect(events.filter((e) => e.type === "tool.invoked")).toHaveLength(1);
    });
  });

  describe("model binding", () => {
    it("resolves agent's preferred model from modelRegistry", async () => {
      const defaultModel = new FakeModelProvider([{ content: "default response" }]);
      const fastModel = new FakeModelProvider([{ content: "fast response" }]);
      const store = new FakeRunEventStore();

      const modelRegistry = new (await import("../src/model.js")).InMemoryModelRegistry();
      modelRegistry.register("fast-model", fastModel);

      const agent: AgentConfig = {
        id: "fast-agent" as AgentId,
        profile: { name: "FastAgent", description: "", model: "fast-model" },
        capabilities: {},
      };

      const agentRegistry = new FakeAgentRegistry();
      await agentRegistry.register(agent);
      const kernel = new AgentKernel({ model: defaultModel, store, tools: [], maxSteps: 10, agentRegistry, modelRegistry });
      await kernel.useAgent("fast-agent" as AgentId);

      const handle = kernel.run("test", testCtx);
      await handle.completed;

      expect(fastModel.generated).toBeGreaterThan(0);
      expect(defaultModel.generated).toBe(0);
    });

    it("falls back to default model when agent has no model preference", async () => {
      const defaultModel = new FakeModelProvider([{ content: "default response" }]);
      const store = new FakeRunEventStore();

      const agent: AgentConfig = {
        id: "plain-agent" as AgentId,
        profile: { name: "PlainAgent", description: "" },
        capabilities: {},
      };

      const agentRegistry = new FakeAgentRegistry();
      await agentRegistry.register(agent);
      const kernel = new AgentKernel({ model: defaultModel, store, tools: [], maxSteps: 10, agentRegistry });
      await kernel.useAgent("plain-agent" as AgentId);

      const handle = kernel.run("test", testCtx);
      await handle.completed;

      expect(defaultModel.generated).toBeGreaterThan(0);
    });

    it("falls back to default model when preferred model not in registry", async () => {
      const defaultModel = new FakeModelProvider([{ content: "default response" }]);
      const store = new FakeRunEventStore();

      const modelRegistry = new (await import("../src/model.js")).InMemoryModelRegistry();

      const agent: AgentConfig = {
        id: "missing-agent" as AgentId,
        profile: { name: "MissingAgent", description: "", model: "nonexistent-model" },
        capabilities: {},
      };

      const agentRegistry = new FakeAgentRegistry();
      await agentRegistry.register(agent);
      const kernel = new AgentKernel({ model: defaultModel, store, tools: [], maxSteps: 10, agentRegistry, modelRegistry });
      await kernel.useAgent("missing-agent" as AgentId);

      const handle = kernel.run("test", testCtx);
      await handle.completed;

      expect(defaultModel.generated).toBeGreaterThan(0);
    });
  });

  describe("step timeout + circuit breaker", () => {
    it("TC50: fails run when model call exceeds stepTimeout", async () => {
      const model: ModelProvider = {
        model: "hang-model",
        pricing: { input: 0, output: 0 },
        generate: async (_req, signal) => {
          return new Promise<ModelResponse>((_resolve, reject) => {
            if (signal?.aborted) { reject(new Error("timed out")); return; }
            signal?.addEventListener("abort", () => reject(new Error("timed out")), { once: true });
          });
        },
        countTokens: () => 0,
      };
      const store = new FakeRunEventStore();
      const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, stepTimeout: 1100 });
      const handle = kernel.run("test", testCtx);
      await handle.completed;
      const events = await store.list(handle.runId);
      const completed = findEvent(events, "run.completed");
      expect(completed?.data.status).toBe("failed");
      expect(completed?.data.error).toContain("timed out");
    });

    it("TC51: circuit breaker opens after consecutive model failures", async () => {
      const failModel: ModelProvider = {
        model: "fail-model",
        pricing: { input: 0, output: 0 },
        generate: async () => { throw new Error("API unavailable"); },
      };
      const store = new FakeRunEventStore();
      const kernel = new AgentKernel({
        model: failModel, store, tools: [], maxSteps: 10,
        circuitBreakerOptions: { failureThreshold: 3, resetTimeoutMs: 60000 },
      });
      const handle = kernel.run("test", testCtx);
      await handle.completed;
      const events = await store.list(handle.runId);
      const completed = findEvent(events, "run.completed");
      expect(completed?.data.status).toBe("failed");
    });
  });
});

describe("getRunOutput / getCompletedEventData snapshot optimization", () => {
  function makeEvent(runId: string, type: string, data: unknown, seq: number): RunEvent {
    return { id: crypto.randomUUID(), runId: runId as RunId, sequence: seq, type, occurredAt: new Date().toISOString(), traceId: "trace" as TraceId, data };
  }

  it("returns output from snapshot when available", async () => {
    const { getRunOutput } = await import("../src/kernel/sub-agent-runner.js");
    const store = new FakeRunEventStore();
    const runId = "test-run" as RunId;
    await store.saveSnapshot(runId, { finalOutput: "hello from snapshot", step: 5 });
    const output = await getRunOutput(store, runId);
    expect(output).toBe("hello from snapshot");
  });

  it("falls back to listing events when snapshot has no finalOutput", async () => {
    const { getRunOutput } = await import("../src/kernel/sub-agent-runner.js");
    const store = new FakeRunEventStore();
    const runId = "test-run" as RunId;
    await store.saveSnapshot(runId, { step: 5, finalOutput: "" });
    await store.append(makeEvent(runId, "run.completed", { output: "completed output", status: "completed" }, 1));
    const output = await getRunOutput(store, runId);
    expect(output).toBe("completed output");
  });

  it("falls back to listing events when no snapshot exists", async () => {
    const { getRunOutput } = await import("../src/kernel/sub-agent-runner.js");
    const store = new FakeRunEventStore();
    const runId = "test-run" as RunId;
    await store.append(makeEvent(runId, "run.completed", { output: "completed output", status: "completed" }, 1));
    const output = await getRunOutput(store, runId);
    expect(output).toBe("completed output");
  });

  it("getCompletedEventData returns event data when available", async () => {
    const { getCompletedEventData } = await import("../src/kernel/sub-agent-runner.js");
    const store = new FakeRunEventStore();
    const runId = "test-run" as RunId;
    await store.saveSnapshot(runId, { finalOutput: "snap", step: 3 });
    await store.append(makeEvent(runId, "run.completed", { output: "completed", status: "completed" }, 5));
    const data = await getCompletedEventData(store, runId);
    expect(data).toBeTruthy();
    expect((data as Record<string, unknown>).output).toBe("completed");
  });

  it("getCompletedEventData falls back to snapshot when no completed event after snapshot", async () => {
    const { getCompletedEventData } = await import("../src/kernel/sub-agent-runner.js");
    const store = new FakeRunEventStore();
    const runId = "test-run" as RunId;
    await store.saveSnapshot(runId, { finalOutput: "snap-output", step: 3 });
    const data = await getCompletedEventData(store, runId);
    expect(data).toBeTruthy();
    expect((data as Record<string, unknown>).output).toBe("snap-output");
  });
});
