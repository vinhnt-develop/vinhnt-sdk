import { describe, expect, it, vi } from "vitest";
import type { AgentId, AgentConfig } from "@vinhnt-sdk/agent-core";
import type { ToolDefinition } from "../src/tool/definitions.js";
import type { SystemContext } from "../src/system-context/types.js";
import type { Plugin, PluginContext, PluginHooks, HookResult } from "../src/plugin.js";
import type { ToolProviderRegistry } from "../src/tool/provider.js";
import type { EventBus } from "../src/event-bus/types.js";
import { DefaultPluginManager } from "../src/plugin/manager.js";
import { PluginToolProvider } from "../src/plugin/plugin-tool-provider.js";
import { FakeAgentRegistry } from "../src/fakes/fake-agent-registry.js";
import { ToolProviderRegistry as RealToolProviderRegistry } from "../src/tool/provider.js";
import { InMemoryEventBus } from "../src/event-bus/in-memory-bus.js";

function makeTool(id: string): ToolDefinition {
  return {
    id,
    description: `Tool: ${id}`,
    risk: "read",
    async execute() { return `result: ${id}`; },
  };
}

function makeContextSource(id: string): SystemContext {
  return {
    baseline: `context: ${id}`,
    snapshots: new Map(),
  };
}

const testAgent: AgentConfig = {
  id: "agent-plugin-1" as AgentId,
  profile: { name: "Plugin Agent", description: "Registered via plugin" },
  capabilities: { tools: ["plugin-tool"], streaming: true },
  systemPrompt: "You are a plugin agent.",
};

function makePlugin(
  id: string,
  activateFn?: (ctx: PluginContext) => Promise<void>,
  deactivateFn?: () => Promise<void>,
  hooks?: PluginHooks,
): Plugin {
  return {
    manifest: { id, name: `Plugin ${id}`, version: "1.0.0" },
    activate: activateFn ?? (async () => {}),
    ...(deactivateFn ? { deactivate: deactivateFn } : {}),
    ...(hooks ? { hooks } : {}),
  };
}

function createManagerDeps() {
  return {
    agentRegistry: new FakeAgentRegistry(),
    toolProviderRegistry: new RealToolProviderRegistry(),
    eventBus: new InMemoryEventBus(),
  };
}

describe("DefaultPluginManager", () => {
  it("register a plugin", async () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    const plugin = makePlugin("test-plugin");
    await pm.register(plugin);
    expect(pm.list()).toHaveLength(1);
    expect(pm.get("test-plugin")).toBe(plugin);
  });

  it("register throws on duplicate plugin id", async () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    const plugin = makePlugin("dup");
    await pm.register(plugin);
    await expect(pm.register(plugin)).rejects.toThrow(/already registered/i);
  });

  it("activate calls plugin.activate with PluginContext", async () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    const activate = vi.fn(async (_ctx: PluginContext) => {});
    const plugin = makePlugin("activate-test", activate);
    await pm.register(plugin);
    await pm.activate("activate-test");
    expect(activate).toHaveBeenCalledOnce();
    const ctx = activate.mock.calls[0]![0] as PluginContext;
    expect(ctx).toHaveProperty("registerTool");
    expect(ctx).toHaveProperty("registerContextSource");
    expect(ctx).toHaveProperty("registerAgent");
    expect(ctx).toHaveProperty("getAgentRegistry");
    expect(ctx).toHaveProperty("getToolProviderRegistry");
    expect(ctx).toHaveProperty("getEventBus");
  });

  it("activate throws on unknown plugin", async () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    await expect(pm.activate("nonexistent")).rejects.toThrow(/not found/i);
  });

  it("plugin can register tools via context", async () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    const tool = makeTool("plugin-tool");
    const plugin = makePlugin("tool-plugin", async (ctx) => {
      ctx.registerTool(tool);
    });
    await pm.register(plugin);
    await pm.activate("tool-plugin");
    expect(pm.tools).toHaveLength(1);
    expect(pm.tools[0]?.id).toBe("plugin-tool");
  });

  it("plugin can register context sources via context", async () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    const ctxSrc = makeContextSource("plugin-ctx");
    const plugin = makePlugin("ctx-plugin", async (ctx) => {
      ctx.registerContextSource(ctxSrc);
    });
    await pm.register(plugin);
    await pm.activate("ctx-plugin");
    expect(pm.contextSources).toHaveLength(1);
    expect(pm.contextSources[0]?.baseline).toBe("context: plugin-ctx");
  });

  it("plugin can register agents via context", async () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    const plugin = makePlugin("agent-plugin", async (ctx) => {
      await ctx.registerAgent(testAgent);
    });
    await pm.register(plugin);
    await pm.activate("agent-plugin");
    const agent = await deps.agentRegistry.get(testAgent.id);
    expect(agent).toEqual(testAgent);
  });

  it("plugin can access agent registry via getAgentRegistry", async () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    await deps.agentRegistry.register(testAgent);
    let capturedRegistry: FakeAgentRegistry | undefined;
    const plugin = makePlugin("registry-plugin", async (ctx) => {
      capturedRegistry = ctx.getAgentRegistry() as FakeAgentRegistry;
    });
    await pm.register(plugin);
    await pm.activate("registry-plugin");
    expect(capturedRegistry).toBeDefined();
    const agent = await capturedRegistry!.get(testAgent.id);
    expect(agent).toEqual(testAgent);
  });

  it("plugin can access ToolProviderRegistry", async () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    let capturedRegistry: ToolProviderRegistry | undefined;
    const plugin = makePlugin("tpr-plugin", async (ctx) => {
      capturedRegistry = ctx.getToolProviderRegistry();
    });
    await pm.register(plugin);
    await pm.activate("tpr-plugin");
    expect(capturedRegistry).toBe(deps.toolProviderRegistry);
  });

  it("plugin can access EventBus", async () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    let capturedBus: EventBus | undefined;
    const plugin = makePlugin("bus-plugin", async (ctx) => {
      capturedBus = ctx.getEventBus();
    });
    await pm.register(plugin);
    await pm.activate("bus-plugin");
    expect(capturedBus).toBe(deps.eventBus);
  });

  it("deactivate calls plugin.deactivate if defined", async () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    const deactivate = vi.fn(async () => {});
    const plugin = makePlugin("deactivate-test", undefined, deactivate);
    await pm.register(plugin);
    await pm.deactivate("deactivate-test");
    expect(deactivate).toHaveBeenCalledOnce();
  });

  it("deactivate throws on unknown plugin", async () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    await expect(pm.deactivate("nonexistent")).rejects.toThrow(/not found/i);
  });

  it("get returns undefined for unknown plugin", () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    expect(pm.get("unknown")).toBeUndefined();
  });

  it("multiple plugins accumulate tools and context sources", async () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    const pluginA = makePlugin("plugin-a", async (ctx) => {
      ctx.registerTool(makeTool("tool-a"));
      ctx.registerContextSource(makeContextSource("ctx-a"));
    });
    const pluginB = makePlugin("plugin-b", async (ctx) => {
      ctx.registerTool(makeTool("tool-b"));
      ctx.registerContextSource(makeContextSource("ctx-b"));
    });
    await pm.register(pluginA);
    await pm.register(pluginB);
    await pm.activate("plugin-a");
    await pm.activate("plugin-b");
    expect(pm.tools).toHaveLength(2);
    expect(pm.contextSources).toHaveLength(2);
    expect(pm.list()).toHaveLength(2);
  });

  describe("plugin hooks", () => {
    it("getActivePlugins returns only activated plugins", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const pluginA = makePlugin("a");
      const pluginB = makePlugin("b");
      await pm.register(pluginA);
      await pm.register(pluginB);
      expect(pm.getActivePlugins()).toHaveLength(0);
      await pm.activate("a");
      expect(pm.getActivePlugins()).toHaveLength(1);
      expect(pm.getActivePlugins()[0]?.manifest.id).toBe("a");
      await pm.deactivate("a");
      expect(pm.getActivePlugins()).toHaveLength(0);
    });

    it("fireHook calls observation hooks on all active plugins", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const fnA = vi.fn(async () => {});
      const fnB = vi.fn(async () => {});
      const pluginA = makePlugin("a", undefined, undefined, { onRunStarted: fnA });
      const pluginB = makePlugin("b", undefined, undefined, { onRunStarted: fnB });
      await pm.register(pluginA);
      await pm.register(pluginB);
      await pm.activate("a");
      await pm.activate("b");
      await pm.fireHook("onRunStarted", { runId: "r1", prompt: "hello" });
      expect(fnA).toHaveBeenCalledWith({ runId: "r1", prompt: "hello" });
      expect(fnB).toHaveBeenCalledWith({ runId: "r1", prompt: "hello" });
    });

    it("fireHook does NOT call hooks on registered-but-not-activated plugins", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const fn = vi.fn(async () => {});
      const plugin = makePlugin("test", undefined, undefined, { onRunStarted: fn });
      await pm.register(plugin);
      await pm.fireHook("onRunStarted", { runId: "r1", prompt: "hello" });
      expect(fn).not.toHaveBeenCalled();
    });

    it("onToolInvoked can modify tool input", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const plugin = makePlugin("redact", undefined, undefined, {
        onToolInvoked: async (data) => {
          return { modified: { input: { ...data.input as Record<string, unknown>, redacted: true } } };
        },
      });
      await pm.register(plugin);
      await pm.activate("redact");
      const result = await pm.fireHook("onToolInvoked", {
        toolId: "t1", toolName: "read_file", input: { path: "/secret" },
      });
      expect(result).toEqual({ modified: { input: { path: "/secret", redacted: true } } });
    });

    it("onToolCompleted can modify tool output", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const plugin = makePlugin("censor", undefined, undefined, {
        onToolCompleted: async (data) => {
          return { modified: { output: "[REDACTED]" } };
        },
      });
      await pm.register(plugin);
      await pm.activate("censor");
      const result = await pm.fireHook("onToolCompleted", {
        toolId: "t1", toolName: "read_file", output: "sensitive-data",
      });
      expect(result).toEqual({ modified: { output: "[REDACTED]" } });
    });

    it("error isolation: one plugin hook failure does not prevent others", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const failing = makePlugin("fail", undefined, undefined, {
        onStepStarted: async () => { throw new Error("boom"); },
      });
      const ok = makePlugin("ok", undefined, undefined, {
        onStepStarted: vi.fn(async () => {}),
      });
      await pm.register(failing);
      await pm.register(ok);
      await pm.activate("fail");
      await pm.activate("ok");
      await pm.fireHook("onStepStarted", { step: 1 });
      expect((ok.hooks!.onStepStarted! as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({ step: 1 });
    });

    it("multiple hooks chain: all matching hooks are called in register order", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const calls: string[] = [];
      const pluginA = makePlugin("a", undefined, undefined, {
        onRunStarted: async () => { calls.push("a"); },
      });
      const pluginB = makePlugin("b", undefined, undefined, {
        onRunStarted: async () => { calls.push("b"); },
      });
      await pm.register(pluginA);
      await pm.register(pluginB);
      await pm.activate("a");
      await pm.activate("b");
      await pm.fireHook("onRunStarted", { runId: "r1", prompt: "hi" });
      expect(calls).toEqual(["a", "b"]);
    });

    it("onToolInvoked mutation chains: second plugin sees first plugin's modified input", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      let seenByB: unknown;
      const pluginA = makePlugin("a", undefined, undefined, {
        onToolInvoked: async (data) => {
          return { modified: { input: { ...data.input as Record<string, unknown>, step: "a" } } };
        },
      });
      const pluginB = makePlugin("b", undefined, undefined, {
        onToolInvoked: async (data) => {
          seenByB = data.input;
          return null;
        },
      });
      await pm.register(pluginA);
      await pm.register(pluginB);
      await pm.activate("a");
      await pm.activate("b");
      await pm.fireHook("onToolInvoked", { toolId: "t1", toolName: "test", input: { initial: true } });
      expect(seenByB).toEqual({ initial: true, step: "a" });
    });

    it("deactivate removes plugin from active list, hooks no longer fire", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const fn = vi.fn(async () => {});
      const plugin = makePlugin("temp", undefined, undefined, { onRunStarted: fn });
      await pm.register(plugin);
      await pm.activate("temp");
      expect(pm.getActivePlugins()).toHaveLength(1);
      await pm.deactivate("temp");
      expect(pm.getActivePlugins()).toHaveLength(0);
      await pm.fireHook("onRunStarted", { runId: "r1", prompt: "no" });
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("Phase 3 hooks", () => {
    it("onBeforeModelCall can modify request", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const plugin = makePlugin("before-model", undefined, undefined, {
        onBeforeModelCall: async ({ request }) => ({
          modified: { request: { ...request, temperature: 0.1 } },
        }),
      });
      await pm.register(plugin);
      await pm.activate("before-model");
      const result = await pm.fireHook("onBeforeModelCall", {
        request: { messages: [], maxTokens: 100 },
      });
      expect((result?.modified?.request as Record<string, unknown>).temperature).toBe(0.1);
    });

    it("onAfterModelCall can modify response", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const plugin = makePlugin("after-model", undefined, undefined, {
        onAfterModelCall: async ({ response }) => ({
          modified: { response: { ...response, cached: true } },
        }),
      });
      await pm.register(plugin);
      await pm.activate("after-model");
      const result = await pm.fireHook("onAfterModelCall", {
        response: { content: "hello", tokens: 10 },
      });
      expect((result?.modified?.response as Record<string, unknown>).cached).toBe(true);
    });

    it("onBeforeToolExecution can modify tool input", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const plugin = makePlugin("before-tool", undefined, undefined, {
        onBeforeToolExecution: async ({ input }) => ({
          modified: { input: { ...input as Record<string, unknown>, intercepted: true } },
        }),
      });
      await pm.register(plugin);
      await pm.activate("before-tool");
      const result = await pm.fireHook("onBeforeToolExecution", {
        toolId: "t1", toolName: "shell", input: { command: "ls" },
      });
      expect((result?.modified?.input as Record<string, unknown>).intercepted).toBe(true);
    });

    it("onAfterToolExecution can modify tool output", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const plugin = makePlugin("after-tool", undefined, undefined, {
        onAfterToolExecution: async ({ output }) => ({
          modified: { output: `[PROCESSED] ${output}` },
        }),
      });
      await pm.register(plugin);
      await pm.activate("after-tool");
      const result = await pm.fireHook("onAfterToolExecution", {
        toolId: "t1", toolName: "shell", output: "file1.txt",
      });
      expect(result?.modified?.output).toBe("[PROCESSED] file1.txt");
    });

    it("onPermissionAsk hook can auto-reply", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const plugin = makePlugin("ask-reply", undefined, undefined, {
        onPermissionAsk: async () => ({ modified: { reply: "once" as const } }),
      });
      await pm.register(plugin);
      await pm.activate("ask-reply");
      const result = await pm.fireHook("onPermissionAsk", {
        permission: "tool.read_file",
        resource: "read_file",
        reason: "Need approval",
      });
      expect(result?.modified?.reply).toBe("once");
    });

    it("onPermissionAsk hook can reject", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const plugin = makePlugin("ask-reject", undefined, undefined, {
        onPermissionAsk: async () => ({ modified: { reply: "reject" as const } }),
      });
      await pm.register(plugin);
      await pm.activate("ask-reject");
      const result = await pm.fireHook("onPermissionAsk", {
        permission: "tool.delete_file",
        resource: "delete_file",
        reason: "Dangerous",
      });
      expect(result?.modified?.reply).toBe("reject");
    });

    it("onPermissionAsk returns null when no plugin modifies", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const result = await pm.fireHook("onPermissionAsk", {
        permission: "tool.read_file",
        resource: "read_file",
        reason: "Test",
      });
      expect(result).toBeNull();
    });

    it("onChatParams hook can modify request", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const plugin = makePlugin("chat-params", undefined, undefined, {
        onChatParams: async ({ request }) => ({
          modified: { request: { ...request, maxTokens: 999 } },
        }),
      });
      await pm.register(plugin);
      await pm.activate("chat-params");
      const result = await pm.fireHook("onChatParams", {
        request: { maxTokens: 100, messages: [] },
      });
      expect((result?.modified?.request as Record<string, unknown>).maxTokens).toBe(999);
    });

    it("onShellEnv hook can add env vars", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      const plugin = makePlugin("shell-env", undefined, undefined, {
        onShellEnv: async () => ({
          modified: { env: { MY_VAR: "hello", ANOTHER: "world" } },
        }),
      });
      await pm.register(plugin);
      await pm.activate("shell-env");
      const result = await pm.fireHook("onShellEnv", { env: {} });
      expect(result?.modified?.env).toEqual({ MY_VAR: "hello", ANOTHER: "world" });
    });

    it("onShellEnv chains: second plugin sees first plugin's env", async () => {
      const deps = createManagerDeps();
      const pm = new DefaultPluginManager(deps);
      let seenByB: Record<string, string> | undefined;
      const pluginA = makePlugin("env-a", undefined, undefined, {
        onShellEnv: async () => ({ modified: { env: { A: "va" } } }),
      });
      const pluginB = makePlugin("env-b", undefined, undefined, {
        onShellEnv: async ({ env }) => {
          seenByB = env;
          return null;
        },
      });
      await pm.register(pluginA);
      await pm.register(pluginB);
      await pm.activate("env-a");
      await pm.activate("env-b");
      await pm.fireHook("onShellEnv", { env: {} });
      expect(seenByB).toEqual({ A: "va" });
    });
  });
});

describe("PluginToolProvider", () => {
  it("wraps plugin-registered tools as ToolProvider", async () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    const provider = new PluginToolProvider(pm);

    const plugin = makePlugin("tp", async (ctx) => {
      ctx.registerTool(makeTool("plugin-a"));
      ctx.registerTool(makeTool("plugin-b"));
    });
    await pm.register(plugin);
    await pm.activate("tp");

    expect(provider.id).toBe("plugins");
    expect(provider.name).toBe("Plugin Tools");
    expect(provider.tools).toHaveLength(2);
    expect(provider.tools.map((t) => t.id)).toEqual(["plugin-a", "plugin-b"]);
  });

  it("reflects live plugin tool additions", async () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    const provider = new PluginToolProvider(pm);

    expect(provider.tools).toHaveLength(0);

    const plugin = makePlugin("live", async (ctx) => {
      ctx.registerTool(makeTool("tool-1"));
    });
    await pm.register(plugin);

    await pm.activate("live");
    expect(provider.tools).toHaveLength(1);
    expect(provider.tools[0]?.id).toBe("tool-1");
  });

  it("multiple plugins contribute tools", async () => {
    const deps = createManagerDeps();
    const pm = new DefaultPluginManager(deps);
    const provider = new PluginToolProvider(pm);

    const p1 = makePlugin("p1", async (ctx) => { ctx.registerTool(makeTool("t1")); });
    const p2 = makePlugin("p2", async (ctx) => { ctx.registerTool(makeTool("t2")); });
    await pm.register(p1);
    await pm.register(p2);
    await pm.activate("p1");
    await pm.activate("p2");

    expect(provider.tools).toHaveLength(2);
    expect(provider.tools.map((t) => t.id)).toContain("t1");
    expect(provider.tools.map((t) => t.id)).toContain("t2");
  });
});
