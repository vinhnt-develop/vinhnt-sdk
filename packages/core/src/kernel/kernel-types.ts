import type { RunId } from "@vinhnt-sdk/schema";
import type { ModelProvider, ModelRegistry } from "../model.js";
import type { SessionRuntimeState } from "../session/session-state.js";
import type { RunEventStore, SessionStore } from "../session/store.js";
import type { AgentRegistry } from "../agent/agent-registry.js";
import type { ToolDefinition } from "../tool/definitions.js";
import type { ToolRegistry } from "../tool/registry.js";
import type { ToolProviderRegistry } from "../tool/provider.js";
import type { PluginManager } from "../plugin.js";
import type { ConversationCompactor } from "../session/compaction.js";
import type { ContextRegistry } from "../system-context/types.js";
import type { ApprovalStore } from "../permission/saved.js";
import type { EventBus } from "../event-bus/types.js";
import type { CircuitBreaker } from "./circuit-breaker.js";
import type { CircuitBreakerOptions } from "./circuit-breaker.js";
import type { TerminationPolicy } from "./termination.js";

/** Sandbox configuration for shell command execution. */
export interface KernelSandboxConfig {
  /** Sandbox mode: "host" (default), "process", or "container". */
  readonly mode?: string;
  /** Sandbox scope for permission checking. */
  readonly scope?: string;
  /** Timeout in ms for sandboxed operations. */
  readonly timeoutMs?: number;
}

/** Permission configuration for tool execution and file access. */
export interface PermissionConfig {
  /** Store for persisting approval decisions. */
  readonly approvalStore?: ApprovalStore;
  /** If true, auto-approve low-risk operations without user confirmation. */
  readonly autoApprovalEnabled?: boolean;
  /** If true, allow tools to access files outside the workspace root. */
  readonly externalDirectoryAccess?: boolean;
  /** Global permission rules applied to all tools (e.g. { "edit": "allow", "shell": "ask" }). */
  readonly globalPermissionRules?: Record<string, string | Record<string, string>>;
  /** Risk-level defaults for permission checking (e.g. { "read": "allow", "write": "ask" }). */
  readonly permissionRiskDefaults?: Record<string, string>;
  /** Top-level rules for allow/deny/ask categories. */
  readonly topLevelPermissionRules?: Record<"allow" | "deny" | "ask", string[]>;
}

/** Model routing configuration for multi-model setups. */
export interface ModelRoutingConfig {
  /** Fallback models to try if the primary model fails. */
  readonly failoverModels?: string[];
  /** Model ID for advisory/evaluation tasks. */
  readonly advisorModel?: string;
  /** Per-feature model overrides (e.g. { "code-review": "gpt-4" }). */
  readonly perFeatureModels?: Record<string, string>;
  /** Whitelist of allowed model IDs (empty = all allowed). */
  readonly allowedModels?: string[];
}

/** Hook configuration for plugin system. */
export interface HookConfig {
  /** Custom hook handlers keyed by hook name. */
  readonly hooks?: Record<string, unknown>;
}

/**
 * Configuration for AgentKernel — the core agent orchestration engine.
 *
 * @example
 * ```ts
 * const kernel = new AgentKernel({
 *   model: openaiProvider,
 *   store: eventStore,
 *   maxSteps: 20,
 *   permissions: { autoApprovalEnabled: false },
 * });
 * ```
 */
export interface AgentKernelConfig {
  /** LLM provider for generating responses. */
  readonly model: ModelProvider;
  /** Event store for persisting run events and session state. */
  readonly store: RunEventStore;
  /** Tool definitions available to the agent. */
  readonly tools?: readonly ToolDefinition[];
  /** ToolProviderRegistry — single source of truth for all tools. */
  readonly toolProviderRegistry?: ToolProviderRegistry;
  /** Maximum number of steps (LLM calls) per run. Default: 30. */
  readonly maxSteps?: number;
  /** Maximum tool calls per step. Default: 10. */
  readonly maxToolCallsPerStep?: number;
  /** Maximum concurrent tool calls. */
  readonly maxConcurrentToolCalls?: number;
  /** Maximum tokens per LLM response. Default: 4096. */
  readonly maxTokens?: number;
  /** Conversation compactor for context window management. */
  readonly compactor?: ConversationCompactor;
  /** System context registry for dynamic system prompts. */
  readonly systemContext?: ContextRegistry;
  /** Token budget for extended thinking (0 = disabled). */
  readonly thinkingBudget?: number;
  /** Custom thinking prompt for extended thinking. */
  readonly thinkingPrompt?: string;
  /** If true, auto-retry on tool execution failure. */
  readonly selfCorrectOnFailure?: boolean;
  /** Maximum self-correction attempts per step. */
  readonly maxSelfCorrectAttempts?: number;
  /** Maximum sub-agent nesting depth. */
  readonly maxSubAgentDepth?: number;
  /** Session store for durable session persistence. */
  readonly sessionStore?: SessionStore;
  /** Session ID for resuming an existing session. */
  readonly sessionId?: string;
  /** Agent registry for sub-agent spawning. */
  readonly agentRegistry?: AgentRegistry;
  /** Plugin manager for hook execution. */
  readonly pluginManager?: PluginManager;
  /** Runtime session state for the current run. */
  readonly sessionState?: SessionRuntimeState;
  /** Tool registry for dynamic tool registration. */
  readonly toolRegistry?: ToolRegistry;
  /** Model registry for multi-model routing. */
  readonly modelRegistry?: ModelRegistry;
  /** Custom function to generate session titles from prompts. */
  readonly sessionTitleGenerator?: (prompt: string) => Promise<string>;
  /** Event bus for publishing runtime events. */
  readonly eventBus?: EventBus;
  /** Per-step timeout in ms. Default: 120000. */
  readonly stepTimeout?: number;
  /** Circuit breaker for model call resilience. */
  readonly circuitBreaker?: CircuitBreaker;
  /** Circuit breaker configuration (used if no breaker provided). */
  readonly circuitBreakerOptions?: CircuitBreakerOptions;
  /** Doom loop detection threshold (consecutive identical outputs). Default: 3. */
  readonly doomLoopThreshold?: number;
  /** Workspace root directory for file operations. */
  readonly workspaceRoot?: string;
  /** Context compaction threshold ratio (0-1). Default: 0.75. */
  readonly compactionThreshold?: number;
  /** If true, disable event persistence (ephemeral runs). */
  readonly noStore?: boolean;
  /** Termination policy for advanced stop conditions. */
  readonly termination?: TerminationPolicy;

  /** Sandbox configuration for shell execution. */
  readonly sandbox?: KernelSandboxConfig;
  /** Permission configuration for tool execution. */
  readonly permissions?: PermissionConfig;
  /** Model routing configuration for multi-model setups. */
  readonly modelRouting?: ModelRoutingConfig;
  /** Hook configuration for plugin system. */
  readonly hooks?: HookConfig;
  /** Enterprise managed configuration. */
  readonly managedConfig?: Record<string, unknown>;
}

/** Handle for a running agent run — provides abort control and completion tracking. */
export interface RunHandle {
  /** Unique identifier for this run. */
  readonly runId: RunId;
  /** Promise that resolves when the run completes (or rejects on failure). */
  readonly completed: Promise<void>;
  /** Abort the running agent. */
  abort(): void;
}

/**
 * Normalize a legacy flat config object into the new nested structure.
 * Supports backward compatibility for configs using flat permission/sandbox/modelRouting properties.
 *
 * @example
 * ```ts
 * const config = normalizeConfig({
 *   model: provider,
 *   store: eventStore,
 *   autoApprovalEnabled: true,
 *   sandboxScope: "process",
 * });
 * // config.permissions.autoApprovalEnabled === true
 * // config.sandbox.scope === "process"
 * ```
 */
export function normalizeConfig(config: Record<string, unknown>): AgentKernelConfig {
  const normalized: Record<string, unknown> = { ...config };

  if (!normalized.sandbox) {
    normalized.sandbox = {
      mode: normalized.sandboxMode,
      scope: normalized.sandboxScope,
      timeoutMs: normalized.sandboxTimeoutMs,
    };
    delete normalized.sandboxMode;
    delete normalized.sandboxScope;
    delete normalized.sandboxTimeoutMs;
  }

  if (!normalized.permissions) {
    normalized.permissions = {
      approvalStore: normalized.approvalStore,
      autoApprovalEnabled: normalized.autoApprovalEnabled,
      externalDirectoryAccess: normalized.externalDirectoryAccess,
      globalPermissionRules: normalized.globalPermissionRules,
      permissionRiskDefaults: normalized.permissionRiskDefaults,
      topLevelPermissionRules: normalized.topLevelPermissionRules,
    };
    delete normalized.approvalStore;
    delete normalized.autoApprovalEnabled;
    delete normalized.externalDirectoryAccess;
    delete normalized.globalPermissionRules;
    delete normalized.permissionRiskDefaults;
    delete normalized.topLevelPermissionRules;
  }

  if (!normalized.modelRouting) {
    normalized.modelRouting = {
      failoverModels: normalized.failoverModels,
      advisorModel: normalized.advisorModel,
      perFeatureModels: normalized.perFeatureModels,
      allowedModels: normalized.allowedModels,
    };
    delete normalized.failoverModels;
    delete normalized.advisorModel;
    delete normalized.perFeatureModels;
    delete normalized.allowedModels;
  }

  if (!normalized.hooks) {
    normalized.hooks = {
      hooks: normalized.hooksConfig,
    };
    delete normalized.hooksConfig;
  }

  return normalized as unknown as AgentKernelConfig;
}
