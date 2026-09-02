import type { AgentConfig } from "@vinhnt-sdk/schema";
import type { ToolDefinition } from "@vinhnt-sdk/tools";
import type { ContextSourceValue } from "../system-context/types.js";
import type { AgentRegistry } from "../agent/agent-registry.js";
import type { ToolProviderRegistry } from "@vinhnt-sdk/tools";
import type { EventBus } from "@vinhnt-sdk/event";
import type {
  PluginContext, Plugin, PluginManager, Disposable,
  PluginHooks, HookName, HookPayload, HookReturn,
} from "../plugin.js";
import { createDisposable } from "../plugin.js";
import { getLogger } from "../logger.js";

export interface PluginManagerConfig {
  agentRegistry: AgentRegistry;
  toolProviderRegistry: ToolProviderRegistry;
  eventBus: EventBus;
}

export class DefaultPluginManager implements PluginManager {
  private readonly plugins = new Map<string, Plugin>();
  private readonly activePluginIds = new Set<string>();
  private readonly toolRegistrations: ToolDefinition[] = [];
  private readonly ctxSources: ContextSourceValue[] = [];
  private readonly agentRegistry: AgentRegistry;
  private readonly toolProviderRegistry: ToolProviderRegistry;
  private readonly eventBus: EventBus;
  /** Per-plugin effect disposables — cleaned up on deactivation. */
  private readonly pluginEffects = new Map<string, Disposable[]>();

  constructor(config: PluginManagerConfig);
  /** @deprecated Use config-based constructor: `new DefaultPluginManager({ agentRegistry, toolProviderRegistry, eventBus })` */
  constructor(agentRegistry: AgentRegistry);
  constructor(configOrRegistry: PluginManagerConfig | AgentRegistry) {
    if ("toolProviderRegistry" in configOrRegistry) {
      this.agentRegistry = configOrRegistry.agentRegistry;
      this.toolProviderRegistry = configOrRegistry.toolProviderRegistry;
      this.eventBus = configOrRegistry.eventBus;
    } else {
      // Backward compatibility: old single-arg constructor
      this.agentRegistry = configOrRegistry;
      // Lazy-init — these will be replaced by real instances at runtime
      this.toolProviderRegistry = {
        registerProvider() {}, unregisterProvider() {}, getProvider() { return undefined; },
        listProviders() { return []; }, getAllTools() { return []; }, getTool() { return undefined; },
        hasTool() { return false; }, async refreshProvider() {}, count() { return 0; },
      } as unknown as ToolProviderRegistry;
      this.eventBus = {
        publish() {}, subscribe() { return () => {}; }, subscribeAll() { return () => {}; },
        async durable() { return (async function* () {})(); },
      } as unknown as EventBus;
    }
  }

  get tools(): readonly ToolDefinition[] {
    return this.toolRegistrations;
  }

  get contextSources(): readonly ContextSourceValue[] {
    return this.ctxSources;
  }

  async register(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.manifest.id)) {
      throw new Error(`Plugin '${plugin.manifest.id}' already registered`);
    }
    this.plugins.set(plugin.manifest.id, plugin);
  }

  async activate(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) throw new Error(`Plugin '${id}' not found`);

    const effects: Disposable[] = [];
    this.pluginEffects.set(id, effects);

    const addEffect = (d: Disposable) => { effects.push(d); return d; };

    const ctx: PluginContext = {
      registerTool: (tool) => {
        this.toolRegistrations.push(tool);
        return addEffect(createDisposable(async () => {
          const idx = this.toolRegistrations.indexOf(tool);
          if (idx >= 0) this.toolRegistrations.splice(idx, 1);
        }));
      },
      registerContextSource: (source) => {
        this.ctxSources.push(source);
        return addEffect(createDisposable(async () => {
          const idx = this.ctxSources.indexOf(source);
          if (idx >= 0) this.ctxSources.splice(idx, 1);
        }));
      },
      registerAgent: async (config: AgentConfig) => {
        await this.agentRegistry.register(config);
        return addEffect(createDisposable(async () => {
          // Agent deregistration — best-effort
        }));
      },
      getAgentRegistry: () => this.agentRegistry,
      getToolProviderRegistry: () => this.toolProviderRegistry,
      getEventBus: () => this.eventBus,

      effect: (cleanup) => addEffect(createDisposable(cleanup)),

      on: (event, handler) => {
        let unsubscribe: () => void;
        if (typeof event === "string") {
          // String channel — use subscribeAll with namespace
          unsubscribe = this.eventBus.subscribeAll(handler, event);
        } else {
          // EventDefinition — use typed subscribe
          unsubscribe = this.eventBus.subscribe(event, (typedEvent) => { void handler(typedEvent); });
        }
        return addEffect(createDisposable(async () => { unsubscribe(); }));
      },
    };

    await plugin.activate(ctx);
    this.activePluginIds.add(id);
  }

  async deactivate(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) throw new Error(`Plugin '${id}' not found`);

    // Clean up per-plugin effects in reverse order
    const effects = this.pluginEffects.get(id) ?? [];
    for (let i = effects.length - 1; i >= 0; i--) {
      try { await effects[i]!.dispose(); } catch { /* best-effort */ }
    }
    this.pluginEffects.delete(id);

    await plugin.deactivate?.();
    this.activePluginIds.delete(id);
  }

  list(): readonly Plugin[] {
    return [...this.plugins.values()];
  }

  get(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  getActivePlugins(): readonly Plugin[] {
    return [...this.activePluginIds]
      .map((id) => this.plugins.get(id))
      .filter((p): p is Plugin => p !== undefined);
  }

  async fireHook<N extends HookName>(
    name: N,
    data: HookPayload<N>,
  ): Promise<HookReturn<N>> {
    let currentData = data;
    let mutationResult: { modified: unknown } | null = null;

    for (const plugin of this.getActivePlugins()) {
      const hookFn = (plugin.hooks as PluginHooks | undefined)?.[
        name as keyof PluginHooks
      ] as ((data: unknown) => Promise<unknown>) | undefined;
      if (!hookFn) continue;

      try {
        const result = await hookFn(currentData);

        if (
          result !== null &&
          result !== undefined &&
          typeof result === "object" &&
          "modified" in (result as Record<string, unknown>)
        ) {
          mutationResult = result as { modified: unknown };
          // Chain mutations: pass modified data to next plugin
          const isMutationHook = [
            "onToolInvoked", "onToolCompleted", "onPermissionAsk",
            "onChatParams", "onShellEnv", "onBeforeModelCall",
            "onAfterModelCall", "onBeforeToolExecution", "onAfterToolExecution",
          ].includes(name as string);

          if (isMutationHook) {
            const mod = (result as { modified: Record<string, unknown> }).modified;
            currentData = { ...currentData, ...mod } as HookPayload<N>;
          }
        }
      } catch (err) {
        getLogger().warn(`[Plugin ${plugin.manifest.id}] ${name} failed:`, err);
      }
    }

    const isMutationHook = [
      "onToolInvoked", "onToolCompleted", "onPermissionAsk",
      "onChatParams", "onShellEnv", "onBeforeModelCall",
      "onAfterModelCall", "onBeforeToolExecution", "onAfterToolExecution",
    ].includes(name as string);

    return (isMutationHook ? mutationResult : undefined) as HookReturn<N>;
  }
}
