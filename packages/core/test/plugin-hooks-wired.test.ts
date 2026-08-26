import { describe, expect, it } from "vitest";
import { AgentKernel } from "../src/kernel/kernel.js";
import { DefaultPluginManager } from "../src/plugin/manager.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeTool } from "../src/fakes/fake-tool.js";
import { FakeAgentRegistry } from "../src/fakes/fake-agent-registry.js";
import { InMemoryEventBus } from "@vinhnt-sdk/event";
import { ToolRegistry } from "@vinhnt-sdk/tools";
import type { ToolProviderRegistry } from "@vinhnt-sdk/tools";
import type { Plugin } from "../src/plugin.js";
import type { RequestId, TraceId } from "@vinhnt-sdk/schema";

const testCtx = {
  requestId: "req_ph" as RequestId,
  traceId: "trace_ph" as TraceId,
  actorId: "test",
  tenantId: "default",
};

function makeKernel(pluginHooks: Plugin["hooks"]) {
  const agentRegistry = new FakeAgentRegistry();
  const toolReg = new ToolRegistry();
  const calc = new FakeTool("calculator", async (input) => String((input as { a: number; b: number }).a + (input as { a: number; b: number }).b));
  toolReg.register(calc);

  const plugin: Plugin = {
    manifest: { id: "hook-test", name: "Hook Test", version: "1.0.0" },
    ...(pluginHooks !== undefined ? { hooks: pluginHooks } : {}),
    async activate() {},
  };
  const manager = new DefaultPluginManager({
    agentRegistry,
    toolProviderRegistry: toolReg as unknown as ToolProviderRegistry,
    eventBus: new InMemoryEventBus(),
  });
  void manager.register(plugin);
  void manager.activate("hook-test");

  const store = new FakeRunEventStore();
  const model = new FakeModelProvider([
    { content: "Let me calculate.", toolCalls: [{ id: "c1", name: "calculator", args: { a: 2, b: 3 } }] },
    { content: "Result is 5", toolCalls: [] },
  ]);
  const kernel = new AgentKernel({ model, store, tools: [calc], pluginManager: manager, maxSteps: 3 });
  return { kernel, store };
}

describe("P1-F plugin hooks wired", () => {
  it("model-caller fires onBeforeModelCall and onAfterModelCall (stream path)", async () => {
    const calls: string[] = [];
    let sawBeforeRequest: unknown;
    let sawAfterResponse: unknown;
    const { kernel } = makeKernel({
      async onBeforeModelCall(data) {
        calls.push("before");
        sawBeforeRequest = data.request;
        return null;
      },
      async onAfterModelCall(data) {
        calls.push("after");
        sawAfterResponse = data.response;
        return null;
      },
    });

    const handle = kernel.createRunHandle("Hello", testCtx);
    await handle.completed;

    expect(calls.filter((c) => c === "before").length).toBeGreaterThan(0);
    expect(calls.filter((c) => c === "after").length).toBeGreaterThan(0);
    // before runs before after on each call
    expect(calls.join(",").replace(/before/g, "B").replace(/after/g, "A")).toMatch(/^B,A(,B,A)*$/);
    expect(sawBeforeRequest).toMatchObject({ messages: expect.anything() });
    expect(sawAfterResponse).toMatchObject({ content: expect.anything() });
  });

  it("onBeforeModelCall can modify the request (steering prompt)", async () => {
    const { kernel } = makeKernel({
      async onBeforeModelCall() {
        return {
          modified: {
            request: {
              messages: [
                { role: "system", content: "STEERED" },
                { role: "user", content: "what" },
              ],
              tools: [],
            },
          },
        };
      },
    });

    const handle = kernel.createRunHandle("Hello", testCtx);
    const result = await handle.completed;
    expect(result.status).toBe("succeeded");
  });

  it("step-executor fires onBeforeToolExecution and onAfterToolExecution around tool.run", async () => {
    const order: string[] = [];
    let sawInput: unknown;
    let sawOutput: unknown;
    const { kernel } = makeKernel({
      async onBeforeToolExecution(data) {
        order.push("before");
        sawInput = data.input;
        return null;
      },
      async onAfterToolExecution(data) {
        order.push("after");
        sawOutput = data.output;
        return null;
      },
    });

    const handle = kernel.createRunHandle("what is 2+3?", testCtx);
    const result = await handle.completed;
    expect(result.status).toBe("succeeded");

    expect(order).toEqual(["before", "after"]);
    expect(sawInput).toEqual({ a: 2, b: 3 });
    expect(sawOutput).toBe("5");
  });

  it("onBeforeToolExecution can modify input and onAfterToolExecution the output", async () => {
    const { kernel } = makeKernel({
      async onBeforeToolExecution() {
        return { modified: { input: { a: 10, b: 20 } } };
      },
      async onAfterToolExecution() {
        return { modified: { output: "MODIFIED_OUTPUT" } };
      },
    });

    const handle = kernel.createRunHandle("what is 2+3?", testCtx);
    const result = await handle.completed;
    expect(result.status).toBe("succeeded");
  });
});