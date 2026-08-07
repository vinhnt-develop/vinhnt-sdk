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

export interface AgentKernelConfig {
  readonly model: ModelProvider;
  readonly store: RunEventStore;
  readonly tools?: readonly ToolDefinition[];
  /** ToolProviderRegistry — single source of truth for all tools. */
  readonly toolProviderRegistry?: ToolProviderRegistry;
  readonly maxSteps?: number;
  readonly maxToolCallsPerStep?: number;
  readonly maxConcurrentToolCalls?: number;
  readonly maxTokens?: number;
  readonly compactor?: ConversationCompactor;
  readonly systemContext?: ContextRegistry;
  readonly thinkingBudget?: number;
  readonly thinkingPrompt?: string;
  readonly selfCorrectOnFailure?: boolean;
  readonly maxSelfCorrectAttempts?: number;
  readonly maxSubAgentDepth?: number;
  readonly sessionStore?: SessionStore;
  readonly sessionId?: string;
  readonly agentRegistry?: AgentRegistry;
  readonly pluginManager?: PluginManager;
  readonly sessionState?: SessionRuntimeState;
  readonly toolRegistry?: ToolRegistry;
  readonly approvalStore?: ApprovalStore;
  readonly modelRegistry?: ModelRegistry;
  readonly sessionTitleGenerator?: (prompt: string) => Promise<string>;
  readonly eventBus?: EventBus;
  readonly stepTimeout?: number;
  readonly circuitBreaker?: CircuitBreaker;
  readonly circuitBreakerOptions?: CircuitBreakerOptions;
  readonly doomLoopThreshold?: number;
  readonly autoApprovalEnabled?: boolean;
  readonly externalDirectoryAccess?: boolean;
  readonly workspaceRoot?: string;
  readonly globalPermissionRules?: Record<string, string | Record<string, string>>;
  readonly permissionRiskDefaults?: Record<string, string>;
  readonly topLevelPermissionRules?: Record<"allow" | "deny" | "ask", string[]>;
  readonly compactionThreshold?: number;
  readonly noStore?: boolean;
  readonly termination?: TerminationPolicy;

  // Model routing
  readonly failoverModels?: string[];
  readonly advisorModel?: string;
  readonly perFeatureModels?: Record<string, string>;

  // Sandbox
  readonly sandboxMode?: string;
  readonly sandboxScope?: string;
  readonly sandboxTimeoutMs?: number;

  // Hooks & automation
  readonly hooksConfig?: Record<string, unknown>;

  // Managed (enterprise)
  readonly managedConfig?: Record<string, unknown>;
  readonly allowedModels?: string[];
}

export interface RunHandle {
  readonly runId: RunId;
  readonly completed: Promise<void>;
  abort(): void;
}
