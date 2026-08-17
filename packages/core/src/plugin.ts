import type { ToolDefinition } from "@vinhnt-sdk/tools";
import type { ContextSourceValue } from "./system-context/types.js";
import type { AgentRegistry } from "./agent/agent-registry.js";
import type { ToolProviderRegistry } from "@vinhnt-sdk/tools";
import type { EventBus } from "@vinhnt-sdk/event";
import type { AgentConfig } from "@vinhnt-sdk/schema";

export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly author?: string;
}

export interface PluginContext {
  registerTool(tool: ToolDefinition): void;
  registerContextSource(source: ContextSourceValue): void;
  registerAgent(config: AgentConfig): Promise<void>;
  getAgentRegistry(): AgentRegistry;
  getToolProviderRegistry(): ToolProviderRegistry;
  getEventBus(): EventBus;
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
