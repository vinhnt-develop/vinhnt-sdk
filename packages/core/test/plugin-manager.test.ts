import { describe, expect, it, vi } from "vitest";
import type { AgentId, AgentConfig } from "@vinhnt-sdk/core";
import type { ToolDefinition } from "../src/tool/definitions.js";
import type { SystemContext } from "../src/system-context/types.js";
import type { Plugin, PluginContext, PluginHooks, HookResult } from "../src/plugin.js";
import { DefaultPluginManager } from "../src/plugin/manager.js";
import { FakeAgentRegistry } from "../src/fakes/fake-agent-registry.js";

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

describe("DefaultPluginManager", () => {
  it("register a plugin", async () => {
    const registry = new FakeAgentRegistry();
    const pm = new DefaultPluginManager(registry);
    const plugin = makePlugin("test-plugin");
    await pm.register(plugin);
    expect(pm.list()).toHaveLength(1);
    expect(pm.get("test-plugin")).toBe(plugin);
  });

  it("register throws on duplicate plugin id", async () => {
    const registry = new FakeAgentRegistry();
    const pm = new DefaultPluginManager(registry);
    const plugin = makePlugin("dup");
    await pm.register(plugin);
    await expect(pm.register(plugin)).rejects.toThrow(/already registered/i);
  });

  it("activate calls plugin.activate with PluginContext", async () => {
    const registry = new FakeAgentRegistry();
    const pm = new DefaultPluginManager(registry);
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
  });

  it("activate throws on unknown plugin", async () => {
    const registry = new FakeAgentRegistry();
    const pm = new DefaultPluginManager(registry);
    await expect(pm.activate("nonexistent")).rejects.toThrow(/not found/i);
  });

  it("plugin can register tools via context", async () => {
    const registry = new FakeAgentRegistry();
    const pm = new DefaultPluginManager(registry);
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
    const registry = new FakeAgentRegistry();
    const pm = new DefaultPluginManager(registry);
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
    const registry = new FakeAgentRegistry();
    const pm = new DefaultPluginManager(registry);
    const plugin = makePlugin("agent-plugin", async (ctx) => {
      await ctx.registerAgent(testAgent);
    });
    await pm.register(plugin);
    await pm.activate("agent-plugin");
    const agent = await registry.get(testAgent.id);
    expect(agent).toEqual(testAgent);
  });

  it("plugin can access agent registry via getAgentRegistry", async () => {
    const registry = new FakeAgentRegistry();
    const pm = new DefaultPluginManager(registry);
    await registry.register(testAgent);
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

  it("deactivate calls plugin.deactivate if defined", async () => {
    const registry = new FakeAgentRegistry();
    const pm = new DefaultPluginManager(registry);
    const deactivate = vi.fn(async () => {});
    const plugin = makePlugin("deactivate-test", undefined, deactivate);
    await pm.register(plugin);
    await pm.deactivate("deactivate-test");
    expect(deactivate).toHaveBeenCalledOnce();
  });

  it("deactivate throws on unknown plugin", async () => {
    const registry = new FakeAgentRegistry();
    const pm = new DefaultPluginManager(registry);
    await expect(pm.deactivate("nonexistent")).rejects.toThrow(/not found/i);
  });

  it("get returns undefined for unknown plugin", () => {
    const registry = new FakeAgentRegistry();
    const pm = new DefaultPluginManager(registry);
    expect(pm.get("unknown")).toBeUndefined();
  });

  it("multiple plugins accumulate tools and context sources", async () => {
    const registry = new FakeAgentRegistry();
    const pm = new DefaultPluginManager(registry);
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
      const registry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(registry);
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
      const registry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(registry);
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
      const registry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(registry);
      const fn = vi.fn(async () => {});
      const plugin = makePlugin("test", undefined, undefined, { onRunStarted: fn });
      await pm.register(plugin);
      await pm.fireHook("onRunStarted", { runId: "r1", prompt: "hello" });
      expect(fn).not.toHaveBeenCalled();
    });

    it("onToolInvoked can modify tool input", async () => {
      const registry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(registry);
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
      const registry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(registry);
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
      const registry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(registry);
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
      const registry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(registry);
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
      const registry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(registry);
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
      const registry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(registry);
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

  describe("new Phase 2 hooks", () => {
    it("onPermissionAsk hook can auto-reply", async () => {
      const registry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(registry);
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
      const registry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(registry);
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
      const registry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(registry);
      const result = await pm.fireHook("onPermissionAsk", {
        permission: "tool.read_file",
        resource: "read_file",
        reason: "Test",
      });
      expect(result).toBeNull();
    });

    it("onChatParams hook can modify request", async () => {
      const registry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(registry);
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
      const registry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(registry);
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
      const registry = new FakeAgentRegistry();
      const pm = new DefaultPluginManager(registry);
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
