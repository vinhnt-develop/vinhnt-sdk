import type { RunId, AgentEvent, ToolChoice, ResponseFormat } from "@vinhnt-sdk/schema";
import type { ModelProvider, ModelRegistry } from "../model.js";
import type { SessionRuntimeState } from "@vinhnt-sdk/session";
import type { RunEventStore, SessionStore } from "@vinhnt-sdk/session";
import type { AgentRegistry } from "../agent/agent-registry.js";
import type { ToolDefinition, ToolRegistry, ToolProviderRegistry } from "@vinhnt-sdk/tools";
import type { PluginManager } from "../plugin.js";
import type { ConversationCompactor } from "@vinhnt-sdk/session";
import type { ContextRegistry } from "../system-context/types.js";
import type { ApprovalStore, PermissionMode, PermissionClassifier } from "@vinhnt-sdk/permission";
import type { EventBus } from "@vinhnt-sdk/event";
import type { CircuitBreaker, CircuitBreakerOptions, TerminationPolicy, FileSnapshotConfig } from "@vinhnt-sdk/step-executor";
import type { z } from "zod";

/** Sandbox configuration for shell command execution. */
export interface KernelSandboxConfig {
  /** Sandbox mode: "host" (default), "process", or "container". */
  readonly mode?: string;
}

/** Permission configuration for tool execution and file access. */
export interface PermissionConfig {
  /** Store for persisting approval decisions. */
  readonly approvalStore?: ApprovalStore;
  /** If true, auto-approve low-risk operations without user confirmation. */
  readonly autoApprovalEnabled?: boolean;
  /**
   * G5: Claude-style approval mode (`default`/`acceptEdits`/`plan`/`bypass`/
   * `auto` + legacy `ask`/`edit`/`full` aliases). Applied by the permission
   * gate on top of the rule pipeline; undefined = legacy behavior (no overlay).
   */
  readonly permissionMode?: PermissionMode;
  /**
   * G5: classifier consulted by `permissionMode: "auto"` for risk-floor asks.
   * Defaults to the built-in risk classifier (pure, fail-closed).
   */
  readonly permissionClassifier?: PermissionClassifier;
  /**
   * Hard timeout (ms) for a single approval wait. Defaults to 120_000 (2 min)
   * inside PermissionGate — independent of agent stale-run threshold.
   */
  readonly approvalTimeoutMs?: number;
  /** If true, allow tools to access files outside the workspace root. */
  readonly externalDirectoryAccess?: boolean;
  /** Global permission rules applied to all tools (e.g. { "edit": "allow", "shell": "ask" }). */
  readonly globalPermissionRules?: Record<string, string | Record<string, string>>;
  /** Risk-level defaults for permission checking (e.g. { "read": "allow", "write": "ask" }). */
  readonly permissionRiskDefaults?: Record<string, string>;
  /** Top-level rules for allow/deny/ask categories. */
  readonly topLevelPermissionRules?: Record<"allow" | "deny" | "ask", string[]>;
  /**
   * P1-5: when a bare-name deny rule matches a tool, remove it from the
   * model-facing tools[] snapshot. Default: true. Pattern-scoped denies
   * (`paramPattern` / `Tool(glob)`) always keep the tool visible and only
   * block matching calls at runtime.
   */
  readonly bareDenyHidesTool?: boolean;
  /**
   * P1-5: tools (glob patterns) always omitted from the model-facing
   * tools[] snapshot, regardless of permission evaluation.
   */
  readonly hideFromModel?: readonly string[];
}

/** Model routing configuration for multi-model setups. */
export interface ModelRoutingConfig {
  /** Fallback models to try if the primary model fails. */
  readonly failoverModels?: string[];
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
  /**
   * reset_tool_choice semantics (Phase 7 group 2): when toolChoice='required',
   * after the first successful tool execution in a run, subsequent model calls
   * downgrade to 'auto' so the model can finish (anti forced-loop). One-shot
   * claim-repair `forceToolChoice` overrides this. Default: true.
   */
  readonly resetToolChoice?: boolean;
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
  /**
   * P1-3: config-driven doom-loop policy (enabled/threshold/action/perTool).
   * When set, takes precedence over {@link doomLoopThreshold} for detection
   * and selects the action (`ask` default, `stop`, `inject-hint`, `allow`).
   */
  readonly loopDetection?: import("@vinhnt-sdk/step-executor").LoopDetectionConfig;
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
  /**
   * GenAI tracing (G3.1) — OTel `gen_ai.*` span recording + optional OTLP export.
   * Defaults: recording ON (in-memory), export only when `tracing.otlp.endpoint`
   * or standard `OTEL_EXPORTER_OTLP_*` env vars resolve. `enabled: false` opts out.
   */
  readonly tracing?: import("./run-tracing.js").TracingConfig;
  /**
   * G7.2 (P2-3): per-step file snapshot → undo. Omit or `false` = off
   * (default — zero behavior change); `true` = on with defaults; object =
   * on + seam overrides (`toolIds`, `pathArgs`, `maxContentBytes`,
   * `maxSnapshots`, `workspaceRoot`, `fs`). Mutating file tools are
   * pre-imaged before execution; read back via `getFileSnapshots()` /
   * restore via `undoFileSnapshots()`.
   */
  readonly fileSnapshot?: boolean | FileSnapshotConfig;
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
    * const handle = kernel.createRunHandle('Extract event from "Meeting with Alice on March 5"', ctx);
    * const result = await handle.completed;
    * // result.structuredOutput is typed as { name: string; date: string; participants: string[] }
   * ```
   */
  readonly outputType?: 'text' | z.ZodTypeAny;

  /** Sandbox configuration for shell execution. */
  readonly sandbox?: KernelSandboxConfig;
  /** Permission configuration for tool execution. */
  readonly permissions?: PermissionConfig;
  /** Model routing configuration for multi-model setups. */
  readonly modelRouting?: ModelRoutingConfig;
  /** Input guardrails — run before model calls. */
  readonly inputGuardrails?: readonly import("@vinhnt-sdk/guardrails").Guardrail[];
  /** Output guardrails — run after model responses. */
  readonly outputGuardrails?: readonly import("@vinhnt-sdk/guardrails").Guardrail[];
  /**
   * P3.1: monotonic tool guards — evaluated before each tool execution.
   * `deny` fails the call; `escalate` forces a user approval ask.
   */
  readonly guards?: readonly import("@vinhnt-sdk/guard").ToolGuard[];
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
 * const handle = kernel.createRunHandle("Write a hello world program", ctx);
 *
 * // Wait for completion
 * const result = await handle.completed;
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
   * Stream lifecycle events from this run.
   * @yields Only the `AgentEvent` lifecycle vocabulary: `agent.started`,
   *   `agent.completed`, `agent.error`. For full run telemetry (steps, tools,
   *   tokens, permissions, …) use `kernel.streamRun()` (yields `KnownRunEvent`)
   *   or an `EventBus` passed in the kernel config.
   */
  events(): AsyncIterable<AgentEvent>;
  /**
   * Subscribe to lifecycle events from this run (same vocabulary as `events()`).
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
 * // config.sandbox.mode === "process"
 * ```
 */
export function normalizeConfig(config: Record<string, unknown>): AgentKernelConfig {
  const normalized: Record<string, unknown> = { ...config };

  if (!normalized.sandbox) {
    normalized.sandbox = {
      mode: normalized.sandboxMode ?? normalized.sandboxScope,
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
      bareDenyHidesTool: normalized.bareDenyHidesTool,
      hideFromModel: normalized.hideFromModel,
    };
    delete normalized.approvalStore;
    delete normalized.autoApprovalEnabled;
    delete normalized.externalDirectoryAccess;
    delete normalized.globalPermissionRules;
    delete normalized.permissionRiskDefaults;
    delete normalized.topLevelPermissionRules;
    delete normalized.bareDenyHidesTool;
    delete normalized.hideFromModel;
  }

  if (!normalized.modelRouting) {
    normalized.modelRouting = {
      failoverModels: normalized.failoverModels,
    };
    delete normalized.failoverModels;
    delete normalized.advisorModel;
    delete normalized.perFeatureModels;
    delete normalized.allowedModels;
  }

  // Legacy hook knobs — hooks live on pluginManager; strip stragglers.
  delete normalized.hooksConfig;
  delete normalized.hooks;

  return normalized as unknown as AgentKernelConfig;
}
