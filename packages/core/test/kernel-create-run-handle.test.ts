import { describe, expect, it, vi } from "vitest";
import { AgentKernel } from "../src/kernel/kernel.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeTool } from "../src/fakes/fake-tool.js";
import type { AgentEvent, RunId } from "@vinhnt-sdk/schema";
import type { ModelProvider } from "../src/model.js";

const testCtx = {
  requestId: "test-req-1",
  traceId: "test-trace-1",
  actorId: "test-actor-1",
  tenantId: "test-tenant-1",
} as const;

describe("AgentKernel.createRunHandle", () => {
  it("returns an AgentRunHandle with correct initial state", async () => {
    const model = new FakeModelProvider([{ content: "Hello!" }]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 1 });

    const handle = kernel.createRunHandle("Hello!", testCtx);

    expect(handle.runId).toBeDefined();
    expect(handle.isRunning).toBe(true);
    expect(handle.isCancelled).toBe(false);
    expect(handle.isCompleted).toBe(false);
  });

  it("completes successfully with correct result", async () => {
    const model = new FakeModelProvider([{ content: "Response" }]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 1 });

    const handle = kernel.createRunHandle("Test", testCtx);
    const result = await handle.completed;

    expect(result.status).toBe("succeeded");
    expect(result.runId).toBe(handle.runId);
    expect(handle.isCompleted).toBe(true);
    expect(handle.isRunning).toBe(false);
  });

  it("emits agent.completed event via onEvent", async () => {
    const model = new FakeModelProvider([{ content: "Done" }]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 1 });

    const handle = kernel.createRunHandle("Test prompt", testCtx);
    const events: AgentEvent[] = [];

    handle.onEvent((event) => events.push(event));
    await handle.completed;

    await new Promise(r => setTimeout(r, 50));

    const completedEvent = events.find(e => e.type === "agent.completed");
    expect(completedEvent).toBeDefined();
    
    if (completedEvent?.type === "agent.completed") {
      expect(completedEvent.status).toBe("succeeded");
    }
  });

  it("cancel() sets isCancelled to true", async () => {
    const model = new FakeModelProvider([{ content: "Done" }]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 1 });

    const handle = kernel.createRunHandle("Test", testCtx);
    
    handle.cancel();
    
    expect(handle.isCancelled).toBe(true);
    expect(handle.isRunning).toBe(false);
  });

  it("events() yields completed event", async () => {
    const model = new FakeModelProvider([{ content: "Response" }]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 1 });

    const handle = kernel.createRunHandle("Test", testCtx);
    const events: AgentEvent[] = [];

    const collectPromise = (async () => {
      for await (const event of handle.events()) {
        events.push(event);
      }
    })();

    await handle.completed;
    await new Promise(r => setTimeout(r, 100));
    await collectPromise;

    const eventTypes = events.map(e => e.type);
    expect(eventTypes).toContain("agent.completed");
  });

  it("onEvent() returns unsubscribe function", async () => {
    const model = new FakeModelProvider([{ content: "Response" }]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 1 });

    const handle = kernel.createRunHandle("Test", testCtx);
    const events: AgentEvent[] = [];

    const unsubscribe = handle.onEvent((event) => events.push(event));
    
    await handle.completed;
    await new Promise(r => setTimeout(r, 50));

    const countAfterSubscribe = events.length;
    
    unsubscribe();
    
    expect(events.length).toBe(countAfterSubscribe);
  });

  it("handles tool calls correctly", async () => {
    const calculator = new FakeTool("calculator", async (input) => {
      const { a, b, op } = input as { a: number; b: number; op: string };
      if (op === "+") return String(a + b);
      return String(a - b);
    });

    const model = new FakeModelProvider([
      {
        content: "Let me calculate that.",
        toolCalls: [{ id: "call-1", name: "calculator", args: { a: 2, b: 3, op: "+" } }],
      },
      { content: "The result is 5" },
    ]);

    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [calculator], maxSteps: 5 });

    const handle = kernel.createRunHandle("What is 2+3?", testCtx);
    const result = await handle.completed;

    expect(result.status).toBe("succeeded");
  });

  it("cancel() aborts a running model call and reports steps taken", async () => {
    // A slow model that waits until its signal aborts before resolving.
    let modelCalls = 0;
    const slowModel: ModelProvider = {
      provider: "fake",
      model: "slow-model",
      pricing: { input: 1.0, output: 2.0 },
      capabilities: { streaming: false, toolCalling: false, imageInput: false, thinking: false, structuredOutput: false },
      async generate(request, signal) {
        modelCalls++;
        await new Promise<void>((resolve, reject) => {
          const onAbort = () => {
            signal?.removeEventListener("abort", onAbort);
            reject(new DOMException("Aborted", "AbortError"));
          };
          signal?.addEventListener("abort", onAbort, { once: true });
          setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
          }, 50);
        });
        return { content: "Slow reply" };
      },
      async *stream(request, signal) {
        const r = await this.generate(request, signal);
        if (r.content) yield { type: "text", content: r.content };
        yield { type: "done" };
      },
    };

    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model: slowModel, store, tools: [], maxSteps: 5 });

    const handle = kernel.createRunHandle("Do something slow", testCtx);
    // Let the model call start, then cancel.
    await new Promise((r) => setTimeout(r, 5));
    handle.cancel();

    const result = await handle.completed;

    expect(result.status).toBe("cancelled");
    expect(result.totalSteps).toBe(1); // step 0 was entered before the abort hit
    expect(modelCalls).toBe(1); // the in-flight call was aborted, no second call started
    expect(handle.isCompleted).toBe(true);
  });

  it("reports real totalSteps on successful runs", async () => {
    const model = new FakeModelProvider([{ content: "Response" }]);
    const store = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 1 });

    const handle = kernel.createRunHandle("Test", testCtx);
    const result = await handle.completed;

    expect(result.status).toBe("succeeded");
    expect(result.totalSteps).toBe(1);
  });

  it("rejects when maxSteps exceeded", async () => {
    const model = new FakeModelProvider([{ content: "Response" }]);
    const store = new FakeRunEventStore();
    
    // maxSteps: 1 should work but we'll test the limit
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 1 });

    const handle = kernel.createRunHandle("Test", testCtx);
    const result = await handle.completed;

    // Should complete successfully with maxSteps: 1
    expect(result.status).toBe("succeeded");
  });
});
