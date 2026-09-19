// @vinhnt-sdk/core
// Core agent engine for building AI coding agents
//
// PUBLIC API — slim, essential exports only.
// Import from specific packages for full access.

// === Kernel (core runtime) ===

export { AgentKernel, KernelError } from "./kernel/kernel.js";
export { canTransitionRun, terminalRunStatuses } from "./kernel/state-machine.js";
export { RunStateMachine } from "@vinhnt-sdk/step-executor";

export type { AgentKernelConfig, RunHandle, AgentRunHandle, AgentRunResult, RunUsage } from "./kernel/kernel-types.js";

// === Agent system ===

export { createAgent } from "./agent/agent-factory.js";
export type { CreateAgentParams } from "./agent/agent-factory.js";

// === Agent-as-Tool ===

export { agentAsTool, createHandoffTool } from "./kernel/agent-as-tool.js";
export type { AgentAsToolOptions } from "./kernel/agent-as-tool.js";

// === Plan tracking ===

export { createUpdatePlanTool, createGetPlanTool } from "./tools/update-plan.js";
export type { Plan, PlanStep } from "./tools/update-plan.js";

// === Event bus ===

export { InMemoryEventBus } from "@vinhnt-sdk/event";
export type { EventBus, EventHandler, Unsubscribe } from "@vinhnt-sdk/event";

// === Session management ===

export { InMemorySessionState } from "@vinhnt-sdk/session";
export { SessionRunCoordinator } from "./session/run-coordinator.js";
export type { RunEventStore, SessionStore } from "@vinhnt-sdk/session";

// === Agent registry ===

export { InMemoryAgentRegistry } from "./agent/agent-registry.js";
export type { AgentRegistry } from "./agent/agent-registry.js";

// === Model registry ===

export { InMemoryModelRegistry } from "./model.js";
export type { ModelProvider, ModelRequest, ModelResponse, ModelStreamEvent, ModelUsage, ContentPart, ToolCallResult } from "./model.js";
export { getTextContent } from "./model.js";

// === Permission stores ===

export { InMemoryApprovalStore } from "@vinhnt-sdk/permission";
export type { ApprovalStore } from "@vinhnt-sdk/permission";

// === Workspace ===

export { WorkspaceManager } from "./workspace.js";

// === Skill system ===

export { InMemorySkillDefRegistry } from "./skill/skill-def-registry.js";

// === Tracing ===

export { Tracer } from "./tracer.js";

// === Logger ===

export { setLogger, setLogLevel, getLogger } from "./logger.js";
export type { Logger, LogLevel } from "./logger.js";

// === Plugin system ===

export type { PluginManifest, PluginContext, PluginHooks, Plugin, Disposable } from "./plugin.js";
export { createDisposable } from "./plugin.js";

export type { ContextSourceValue, ContextSourceKey } from "./system-context/types.js";

// === Guard system ===

export { evaluateGuards } from "@vinhnt-sdk/guard";
export type { GuardDecision, ToolGuard, ToolGuardContext, ToolGuardInput, ToolGuardDecision } from "@vinhnt-sdk/guard";

// === Workflow ===

export { parallel, sequential, conditional } from "@vinhnt-sdk/workflow";
export type { WorkflowStep, WorkflowContext, StepResult, ConditionalBranch } from "@vinhnt-sdk/workflow";

// === Guardrails ===

export { runGuardrails, maxLengthGuardrail, blocklistGuardrail, secretDetectionGuardrail } from "@vinhnt-sdk/guardrails";
export type { Guardrail, GuardrailContext, GuardrailResult, GuardrailScope } from "@vinhnt-sdk/guardrails";

// === Essential schema types ===

export type {
  RunId, SessionId, AgentId, TraceId, RequestId,
  RunStatus, RequestContext,
  AgentConfig, AgentProfile,
  Session, Message,
} from "@vinhnt-sdk/schema";

export {
  VntError,
  AgentNotFoundError, AgentValidationError, AgentPermissionDenied,
  ToolNotFoundError, ToolExecutionError, ToolPermissionDenied,
  RunNotFoundError, RunAbortedError, RunTimeoutError,
  CircuitBreakerOpenError, ToolInputError,
  PermissionDeniedError, ValidationError, TimeoutError,
  NetworkError, RateLimitError, AuthenticationError,
  ConfigurationError, PluginError,
} from "@vinhnt-sdk/schema";

export type { VntErrorCtx } from "@vinhnt-sdk/schema";

// === Essential tool types ===

export {
  defineTool, toolToDefinition, zodSchemaToNestedJsonSchema,
  ToolRegistry, LazyToolRegistry,
} from "@vinhnt-sdk/tools";
export type {
  Tool, ToolConfig, ToolRisk, ToolDefinition,
  ToolContext, ToolAnnotations,
} from "@vinhnt-sdk/tools";

// === Tool providers (built-in) ===

export {
  createReadFileTool, createWriteFileTool, createEditFileTool,
  createShellTool, createGlobFilesTool, createGrepFilesTool,
  createWebSearchTool,
} from "@vinhnt-sdk/tools";

// === Knowledge ===

export { BoundedMemory, ContextCompressor } from "@vinhnt-sdk/knowledge";
export type { MemoryItem, MemoryStore } from "@vinhnt-sdk/knowledge";

// === Security (deprecated — use @vinhnt-sdk/guard) ===

export { redactSecrets, detectSecrets } from "@vinhnt-sdk/guard";
