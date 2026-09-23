import type { RunId, AgentEvent, ToolChoice, ResponseFormat } from "@vinhnt-sdk/schema";
import type { ModelProvider, ModelRegistry } from "../model.js";
import type { SessionRuntimeState } from "@vinhnt-sdk/session";
import type { RunEventStore, SessionStore } from "@vinhnt-sdk/session";
import type { AgentRegistry } from "../agent/agent-registry.js";
import type { ToolDefinition, ToolRegistry, ToolProviderRegistry } from "@vinhnt-sdk/tools";
import type { PluginManager } from "../plugin.js";
import type { ConversationCompactor } from "@vinhnt-sdk/session";
import type { ContextRegistry } from "../system-context/types.js";
import type { ApprovalStore } from "@vinhnt-sdk/permission";
import type { EventBus } from "@vinhnt-sdk/event";
import type { CircuitBreaker, CircuitBreakerOptions, TerminationPolicy } from "@vinhnt-sdk/step-executor";
import type { z } from "zod";

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
 * Model settings — controls sampling, tool behavior, and output format.
 *
 * Grouped into a single object to avoid namespace pollution at the kernel config level.
 * Follows the industry-standard nested pattern (OpenAI Agents SDK, Mastra, Google ADK).
 *
 * @example
 * ```ts
 * const kernel = new AgentKernel({
 *   model: openaiProvider,
 *   store: eventStore,
 *   modelSettings: {
 *     temperature: 0.7,
 *     topP: 0.9,
 *     toolChoice: 'auto',
 *     parallelToolCalls: true,
 *   },
 * });
 * ```
 */
export interface ModelSettings {
  /** Sampling temperature (0-2). Higher = more random, lower = more deterministic. */
  readonly temperature?: number;
  /** Nucleus sampling threshold (0-1). Alternative to temperature. */
  readonly topP?: number;
  /** Penalizes tokens based on frequency in output (-2 to 2). */
  readonly frequencyPenalty?: number;
  /** Penalizes tokens based on presence in output (-2 to 2). */
  readonly presencePenalty?: number;
  /** Controls tool calling behavior. 'auto' = model decides, 'required' = must call, 'none' = no tools. */
  readonly toolChoice?: ToolChoice;
  /** Allow the model to call multiple tools in parallel. Default: true. */
  readonly parallelToolCalls?: boolean;
  /** Response format constraint (e.g., JSON mode). */
  readonly responseFormat?: ResponseFormat;
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
  /** Maximum number of steps (LLM calls) per run. Default: 25. */
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
  /** Maximum number of retries for transient model failures. Default: 3 */
  readonly maxRetries?: number;
  /** Base delay for exponential backoff in ms. Default: 1000 */
  readonly retryBackoffMs?: number;
  /** Maximum delay for retry backoff in ms. Default: 30000 */
  readonly maxRetryBackoffMs?: number;
  /** Doom loop detection threshold (consecutive identical outputs). Default: 3. */
  readonly doomLoopThreshold?: number;
  /** Workspace root directory for file operations. */
  readonly workspaceRoot?: string;
  /** Context compaction threshold ratio (0-1). Default: 0.75. */
  readonly compactionThreshold?: number;
  /**
   * Unified context budget — coordinates sanitizer/compressor/subagent limits.
   * Partial overrides; omitted fields fall back to {@link DEFAULT_CONTEXT_BUDGET}.
   */
  readonly contextBudget?: Partial<import("../context/context-budget.js").ContextBudget>;
  /**
   * Scrub secrets from tool outputs before persist/send (P1-7). Default: true.
   */
  readonly redactToolOutputs?: boolean;
  /** If true, disable event persistence (ephemeral runs). */
  readonly noStore?: boolean;
  /** Termination policy for advanced stop conditions. */
  readonly termination?: TerminationPolicy;

  // ─── Model Settings (nested) ─────────────────────────────────────────
  /** Model settings — temperature, topP, toolChoice, etc. */
  readonly modelSettings?: ModelSettings;

  /**
   * Structured output type — controls what the agent returns.
   *
   * - `'text'` (default): Returns plain text string.
   * - A Zod object schema: Returns validated, typed output.
   *
   * When a Zod schema is provided, the kernel:
   * 1. Converts it to JSON Schema and sends via `response_format`
   * 2. Validates the model's JSON response against the schema
   * 3. Returns the typed output (or throws on validation failure)
   *
   * @example
   * ```ts
   * const kernel = new AgentKernel({
   *   model: provider,
   *   store: eventStore,
   *   outputType: z.object({
   *     name: z.string(),
   *     date: z.string(),
   *     participants: z.array(z.string()),
   *   }),
   * });
   *
   * const result = await kernel.run('Extract event from "Meeting with Alice on March 5"');
   * // result.output is typed as { name: string; date: string; participants: string[] }
   * ```
   */
  readonly outputType?: 'text' | z.ZodTypeAny;

  /** Sandbox configuration for shell execution. */
  readonly sandbox?: KernelSandboxConfig;
  /** Permission configuration for tool execution. */
  readonly permissions?: PermissionConfig;
  /** Model routing configuration for multi-model setups. */
  readonly modelRouting?: ModelRoutingConfig;
  /** Hook configuration for plugin system. */
  readonly hooks?: HookConfig;
  /** Input guardrails — run before model calls. */
  readonly inputGuardrails?: readonly import("@vinhnt-sdk/guardrails").Guardrail[];
  /** Output guardrails — run after model responses. */
  readonly outputGuardrails?: readonly import("@vinhnt-sdk/guardrails").Guardrail[];
  /** Enterprise managed configuration. */
  readonly managedConfig?: Record<string, unknown>;
  /** Logger for kernel events. */
  readonly logger?: import("../logger.js").Logger;
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
 * Enhanced run handle with lifecycle management.
 * 
 * Provides methods to control and monitor an agent run.
 * 
 * @example
 * ```typescript
 * const handle = kernel.run("Write a hello world program");
 * 
 * // Wait for completion
 * await handle.completed;
 * 
 * // Or cancel
 * handle.cancel();
 * 
 * // Listen to events
 * for await (const event of handle.events()) {
 *   console.log(event.type);
 * }
 * ```
 */
export interface AgentRunHandle {
  /** Unique identifier for this run. */
  readonly runId: RunId;
  /** Promise that resolves when the run completes (or rejects on failure). */
  readonly completed: Promise<AgentRunResult>;
  /** Cancel the running agent. */
  cancel(): void;
  /** Check if the run is cancelled. */
  readonly isCancelled: boolean;
  /** Check if the run is completed. */
  readonly isCompleted: boolean;
  /** Check if the run is running. */
  readonly isRunning: boolean;
  /**
   * Stream events from this run.
   * @yields Agent events as they occur
   */
  events(): AsyncIterable<AgentEvent>;
  /**
   * Subscribe to events from this run.
   * @param handler - Event handler
   * @returns Unsubscribe function
   */
  onEvent(handler: (event: AgentEvent) => void): () => void;
}

/**
 * Usage metrics for a completed agent run.
 *
 * Follows the industry-standard nested usage pattern (OpenAI, Vercel AI SDK, Mastra, LangChain).
 * All token/cost metrics are grouped here instead of being flat on AgentRunResult.
 */
export interface RunUsage {
  /** Total number of steps (LLM calls) executed. */
  readonly totalSteps: number;
  /** Total duration in milliseconds. */
  readonly durationMs?: number;
  /** Input tokens used. */
  readonly inputTokens?: number;
  /** Output tokens used. */
  readonly outputTokens?: number;
  /** Reasoning/thinking tokens used. */
  readonly reasoningTokens?: number;
  /** Cache read tokens (prompt caching). */
  readonly cacheReadTokens?: number;
  /** Cache write tokens (prompt caching). */
  readonly cacheWriteTokens?: number;
  /** Total tokens (input + output + reasoning). */
  readonly totalTokens?: number;
  /** Total cost in USD. */
  readonly cost?: number;
  /** Number of tool calls executed. */
  readonly toolCallsCount?: number;
  /** Model used for this run. */
  readonly model?: string;
  /** Provider used for this run. */
  readonly provider?: string;
  /** Stop reason from the LLM. */
  readonly stopReason?: string;
  /** Provider-specific raw usage data. */
  readonly raw?: Record<string, unknown>;
}

/**
 * Result of a completed agent run.
 */
export interface AgentRunResult {
  /** Run identifier. */
  readonly runId: RunId;
  /** Final status. */
  readonly status: "succeeded" | "failed" | "cancelled";
  /** Output text if successful. */
  readonly output?: string;
  /** Validated structured output (when outputType is Zod schema). */
  readonly structuredOutput?: unknown;
  /** Error message if failed. */
  readonly error?: string;
  /** Usage metrics (tokens, cost, duration). */
  readonly usage?: RunUsage;
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
