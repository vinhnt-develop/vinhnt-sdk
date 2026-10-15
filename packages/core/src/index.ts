// @vinhnt-sdk/core
// Core agent engine for building AI coding agents
//
// PUBLIC API — slim, essential exports only.
// Import from specific packages for full access.

// === Kernel (core runtime) ===

export { AgentKernel, KernelError } from "./kernel/kernel.js";
export { canTransitionRun, terminalRunStatuses } from "./kernel/state-machine.js";
export { RunStateMachine } from "@vinhnt-sdk/step-executor";
export type {
  FileSnapshot,
  FileSnapshotRef,
  FileSnapshotConfig,
  FileSnapshotFilter,
  FileSnapshotUndoResult,
} from "@vinhnt-sdk/step-executor";

export type { AgentKernelConfig, ModelSettings, RunHandle, AgentRunHandle, AgentRunResult, RunUsage } from "./kernel/kernel-types.js";
export { AgentRunContext } from "./kernel/run-context.js";
export type { ApprovalRecord } from "./kernel/run-context.js";

// === Context budget ===

export {
  DEFAULT_CONTEXT_BUDGET,
  deriveContextBudget,
  budgetToCompressorFields,
} from "./context/context-budget.js";
export type { ContextBudget } from "./context/context-budget.js";
// E5: default context window (fallback when the provider declares none).
export { DEFAULT_CONTEXT_WINDOW } from "@vinhnt-sdk/llm";

// === WorldState (Codex-style context diff, RFC 7386) ===

export {
  createWorldState,
  applyWorldStatePatch,
  diffWorldStateSnapshots,
} from "./context/world-state.js";
export type {
  WorldState,
  WorldStateSection,
  WorldStateSnapshot,
  WorldStateAdvance,
} from "./context/world-state.js";
export { createMergePatch, applyMergePatch } from "./context/merge-patch.js";

// === Agent system ===

export { createAgent } from "./agent/agent-factory.js";
export type { CreateAgentParams } from "./agent/agent-factory.js";

// === Agent-as-Tool ===

export { agentAsTool } from "./kernel/agent-as-tool.js";
export type { AgentAsToolOptions } from "./kernel/agent-as-tool.js";

// === Handoff ===

export { createHandoff, createHandoffTool, isHandoff, HANDOFF_SYMBOL, HandoffTracker } from "./kernel/handoff.js";
export type { Handoff, HandoffToolOptions, HandoffRecord } from "./kernel/handoff.js";

// === Plan tracking ===

export { createUpdatePlanTool, createGetPlanTool, PlanStore } from "./tools/update-plan.js";
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
export type { ModelProvider, ModelRequest, ModelResponse, ModelStreamEvent, ContentPart, ToolCallResult } from "./model.js";
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
export type { TracingConfig, RunTrace, RunTraceStatus } from "./kernel/run-tracing.js";

// === Logger ===

export { setLogger, setLogLevel, getLogger } from "./logger.js";
export type { Logger, LogLevel } from "./logger.js";

// === Plugin system ===

export type { PluginManifest, PluginContext, PluginHooks, Plugin, Disposable, PluginManager, HookName, HookPayload, HookReturn } from "./plugin.js";
export { createDisposable } from "./plugin.js";
export { DefaultPluginManager } from "./plugin/manager.js";
export type { PluginManagerConfig } from "./plugin/manager.js";

export type { ContextSourceValue, ContextSourceKey, ContextSnapshot, SystemContext, ReconcileResult, ContextRegistry } from "./system-context/types.js";
export { createContextRegistry } from "./system-context/registry.js";
export { createSystemPromptSource } from "./system-context/prompts/system-prompt-source.js";
export { createDateSource } from "./system-context/sources/date-source.js";
export { createWorkspaceSource } from "./system-context/sources/workspace-source.js";
export { createInstructionsSource } from "./system-context/sources/instructions-source.js";
export {
  DEFAULT_INSTRUCTIONS_MAX_BYTES,
  DEFAULT_INSTRUCTIONS_ROOT_MARKERS,
} from "./system-context/sources/instructions-source.js";
export type { InstructionsInfo, InstructionsSourceOptions } from "./system-context/sources/instructions-source.js";
export { createAgentSource } from "./system-context/sources/agent-source.js";

export { createToolContextSource } from "./system-context/sources/tool-context-source.js";
export { createCustomSource } from "./system-context/sources/custom-source.js";
export { createMemorySource, DEFAULT_MEMORY_SOURCE_PRIORITY } from "./system-context/sources/memory-source.js";
export type { MemorySourceOptions, MemorySourceLoader } from "./system-context/sources/memory-source.js";

// === Workflow graphs (G6.3 — edge-driven AgentGraph) ===
export { AgentGraph, createSequentialWorkflow, createParallelWorkflow } from "./workflow/index.js";
export type {
  GraphExecutor,
  GraphContext,
  WorkflowNodeType,
  WorkflowNode,
  AgentNode,
  ConditionNode,
  TransformNode,
  ParallelNode,
  SequentialNode,
  AnyWorkflowNode,
  WorkflowEdge,
  Workflow,
  WorkflowNodeStatus,
  WorkflowNodeResult,
  WorkflowResult,
  WorkflowCondition,
} from "./workflow/index.js";
export { PromptRegistry, defaultPromptRegistry, selectPrompt } from "./system-context/prompts/index.js";
export type { PromptRegistryConfig } from "./system-context/prompts/index.js";
export type { WorkspaceInfo } from "./system-context/sources/workspace-source.js";
export type { AgentContextInfo } from "./system-context/sources/agent-source.js";
export type { SkillGuidanceInfo } from "./system-context/sources/skill-guidance-source.js";
export type { ToolContextInfo } from "./system-context/sources/tool-context-source.js";

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
  createReadFileTool, createWriteFileTool, createEditFileTool, createApplyPatchTool,
  createShellTool, createGlobFilesTool, createGrepFilesTool,
  createWebSearchTool,
} from "@vinhnt-sdk/tools";

// === Tool provider bootstrap ===

export { createToolProviderRegistry, wireAgentAndSkillTools } from "./tool/provider-helpers.js";
export type { WireAgentAndSkillToolsOptions, WiredAgentAndSkillTools } from "./tool/provider-helpers.js";

// === Skills (P4.4 — file discovery + skill tools) ===

export { SkillFileLoader, SkillFileProvider } from "./skill/skill-file-loader.js";
export { SkillParser } from "./skill/skill-parser.js";
export { createSkillTool, createSkillSearchTool } from "./skill/skill-tool.js";
export { createSkillGuidanceSource } from "./system-context/sources/skill-guidance-source.js";

// === Sub-agent capability tools (P4.4 — spawn/delegate/create/list) ===

export { createSpawnAgentTool } from "./agent/spawn-agent-tool.js";
export { createDelegateTool } from "./agent/delegate-tool.js";
export { createCreateAgentTool } from "./agent/create-agent-tool.js";
export { createListAgentsTool } from "./agent/list-agents-tool.js";

// === Knowledge ===

export { BoundedMemory, ContextCompressor } from "@vinhnt-sdk/knowledge";
export type { MemoryItem, MemoryStore } from "@vinhnt-sdk/knowledge";
