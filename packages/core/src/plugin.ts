import type { ToolDefinition } from "@vinhnt-sdk/tools";
import type { ContextSourceValue } from "./system-context/types.js";
import type { AgentRegistry } from "./agent/agent-registry.js";
import type { ToolProviderRegistry } from "@vinhnt-sdk/tools";
import type { EventBus, EventDefinition } from "@vinhnt-sdk/event";
import type { AgentConfig } from "@vinhnt-sdk/schema";

export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly author?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Disposable — cleanup handle returned by effects and event subscriptions.
 * Call `dispose()` to unregister/cleanup. Multiple calls are safe (idempotent).
 */
export interface Disposable {
  dispose(): Promise<void>;
}

/**
 * Create a disposable from a cleanup function.
 */
export function createDisposable(cleanup: () => Promise<void>): Disposable {
  let disposed = false;
  return {
    async dispose() {
      if (disposed) return;
      disposed = true;
      await cleanup();
    },
  };
}

export interface PluginContext {
  registerTool(tool: ToolDefinition): Disposable;
  registerContextSource(source: ContextSourceValue): Disposable;
  registerAgent(config: AgentConfig): Promise<Disposable>;
  getAgentRegistry(): AgentRegistry;
  getToolProviderRegistry(): ToolProviderRegistry;
  getEventBus(): EventBus;

  /**
   * Register an effect — a side-effect with automatic cleanup.
   * The returned Disposable unregisters the effect when disposed.
   *
   * @example
   * ```ts
   * async activate(ctx: PluginContext) {
   *   const interval = setInterval(() => { /* ... *\/ }, 5000);
   *   ctx.effect(() => clearInterval(interval));
   * }
   * ```
   */
  effect(cleanup: () => Promise<void>): Disposable;

  /**
   * Subscribe to an event on the event bus.
   * Returns a Disposable that unsubscribes when disposed.
   *
   * @param event - Event definition or string channel name
   * @param handler - Event handler
   *
   * @example
   * ```ts
   * async activate(ctx: PluginContext) {
   *   const sub = ctx.on(RunStarted, (data) => { /* ... *\/ });
   *   // later: await sub.dispose() to unsubscribe
   * }
   * ```
   */
  on(event: EventDefinition<unknown> | string, handler: (data: unknown) => void | Promise<void>): Disposable;
}

export type HookResult<T> = { modified: T } | null;

export interface PluginHooks {
  // Observation hooks (read-only)
  onRunStarted?(data: { runId: string; prompt: string }): Promise<void>;
  onStepStarted?(data: { step: number }): Promise<void>;
  onTokenStreamed?(data: { content: string; step: number }): Promise<void>;
  onToolCompleted?(data: { toolId: string; toolName: string; output: unknown }): Promise<HookResult<{ output: unknown }>>;
  onToolFailed?(data: { toolId: string; toolName: string; error: string }): Promise<void>;
  onContextCompressed?(data: { originalCount: number; compressedCount: number }): Promise<void>;
  onStepCompleted?(data: { step: number; toolCallCount: number }): Promise<void>;
  onStepFailed?(data: { step: number; reason: string; error?: string }): Promise<void>;
  onRunCompleted?(data: { status: string; output?: string; error?: string; stopCondition?: string }): Promise<void>;

  // Mutation hooks (can modify data flowing through the pipeline)
  onToolInvoked?(data: { toolId: string; toolName: string; input: unknown }): Promise<HookResult<{ input: unknown }>>;
  onPermissionAsk?(data: { permission: string; resource: string; reason: string }): Promise<HookResult<{ reply: "once" | "always" | "reject" } | null>>;
  onChatParams?(data: { request: Record<string, unknown> }): Promise<HookResult<{ request: Record<string, unknown> }>>;
  onShellEnv?(data: { env: Record<string, string> }): Promise<HookResult<{ env: Record<string, string> }>>;

  // New Phase 3 hooks — model call interception
  onBeforeModelCall?(data: { request: Record<string, unknown> }): Promise<HookResult<{ request: Record<string, unknown> }>>;
  onAfterModelCall?(data: { response: Record<string, unknown> }): Promise<HookResult<{ response: Record<string, unknown> }>>;

  // New Phase 3 hooks — tool execution lifecycle
  onBeforeToolExecution?(data: { toolId: string; toolName: string; input: unknown }): Promise<HookResult<{ input: unknown }>>;
  onAfterToolExecution?(data: { toolId: string; toolName: string; output: unknown }): Promise<HookResult<{ output: unknown }>>;
}

export interface Plugin {
  readonly manifest: PluginManifest;
  readonly hooks?: PluginHooks;
  activate(ctx: PluginContext): Promise<void>;
  deactivate?(): Promise<void>;
}

export type HookName = keyof PluginHooks;

export type HookPayload<N extends HookName> =
  Parameters<NonNullable<PluginHooks[N]>>[0];

export type HookReturn<N extends HookName> =
  ReturnType<NonNullable<PluginHooks[N]>> extends Promise<HookResult<infer T>>
    ? HookResult<T>
    : void;

export interface PluginManager {
  register(plugin: Plugin): Promise<void>;
  activate(id: string): Promise<void>;
  deactivate(id: string): Promise<void>;
  list(): readonly Plugin[];
  get(id: string): Plugin | undefined;
  getActivePlugins(): readonly Plugin[];
  fireHook<N extends HookName>(
    name: N,
    data: HookPayload<N>,
  ): Promise<HookReturn<N>>;
}
