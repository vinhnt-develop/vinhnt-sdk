// Re-export from @vinhnt-sdk/schema for backward compat
export type {
  BrandedId, RunId, SessionId, AgentId, ToolCallId, MessageId, TraceId, RequestId, WorkspaceId, EnvironmentId, FilePatchId,
  RunEvent, KnownRunEvent,
  RunStartedData, StepStartedData, TokenStreamedData,
  ThinkingStartedData, ThinkingContentData, ThinkingCompletedData,
  ContextCompressedData, TokenCountedData,
  ToolInvokedData, ToolCompletedData, ToolFailedData, ToolSelfCorrectingData,
  StepCompletedData, RunCompletedData,
  PermissionRequestedData, PermissionRepliedData, StepTypeChangedData,
  RequestContext, RunStatus,
  Session, Message, MessageTokens, SessionStats,
  AgentProfile, AgentCapabilities, AgentConfig, AgentPermissions, AgentMode, AgentBehaviourMode, AgentRule, AgentRuleset,
  PromptTier, PromptAssembly, CompressionSummary, MemoryEntry,
  SessionNode, SessionTreeSnapshot, TreeCursor, SessionTreeEvent, SessionTreeEventType,
  ApprovalRequest, ApprovalCategory, ApprovalStatus, ApprovalContext, ApprovalPolicy, PolicyEffect,
  AgentStepType, Result,
  SkillManifest, SkillDefinition, SkillSource, SkillSourceType, SkillMode, SkillPermission, SkillPermissionValue,
} from "@vinhnt-sdk/schema";
export {
  isAgentId, isRunId, isSessionId, isMessageId, isToolCallId,
  isTraceId, isRequestId, isRecord,
  assertAgentId, assertRunId, assertSessionId, assertMessageId,
  VntError,
  AgentNotFoundError, AgentValidationError, AgentPermissionDenied,
  ToolNotFoundError, ToolExecutionError, ToolPermissionDenied,
  RunNotFoundError, RunAbortedError, RunTimeoutError,
  APPROVAL_CATEGORY_LABELS, AGENT_STEP_LABELS, inferStepType,
  ok, fail,
} from "@vinhnt-sdk/schema";

// Event bus
export { InMemoryEventBus } from "./event-bus/in-memory-bus.js";
export type { EventBus, EventHandler, Unsubscribe } from "./event-bus/types.js";

// Domain types (flat by concern)
export type { ToolRisk, ToolDefinition } from "./tool/definitions.js";
export type { JsonSchema7Object, JsonSchemaProperty } from "./tool/json-schema.js";
export type { RunEventStore, RunEventListener, SessionStore, SessionUpdates, RunEventSnapshot } from "./session/store.js";
export type { ChatMessage, MessageContentPart, ModelRequest, ModelResponse, ModelStreamEvent, ModelProvider, ModelPricing, ModelRegistry } from "./model.js";
export type { ConversationCompactor } from "./session/compaction.js";
export type { ContextSourceKey, ContextSourceValue, ContextSnapshot, SystemContext, ReconcileResult, ContextRegistry } from "./system-context/types.js";
export type { AgentRegistry, SourceDir } from "./agent/agent-registry.js";
export type { PluginManifest, PluginContext, Plugin, PluginManager, PluginHooks, HookResult, HookName, HookPayload, HookReturn } from "./plugin.js";
export type { ToolContext, PermissionReply } from "./tool/context.js";
export type { ApprovalStore, PermissionStore } from "./permission/saved.js";
export type { PermissionEffect, PermissionRule, PermissionRuleset, PermissionRequest, PermissionDeniedError, PermissionRejectedError } from "./permission/permission.js";
export type { SessionRuntimeState, SessionRuntimeSnapshot } from "./session/session-state.js";
export { defineTool, toolToDefinition, zodSchemaToNestedJsonSchema } from "./tool/define-tool.js";
export { lintToolDescription, lintToolDefinitions } from "./tool/description-lint.js";
export type { ToolDescriptionReport, ToolDescriptionIssue, DescriptionIssueCode } from "./tool/description-lint.js";
export type { Tool, ToolConfig } from "./tool/define-tool.js";
export type { ToolFilter } from "./tool/registry.js";
export type { FileHistory, FileVersion, UndoEntry } from "./tool/file-history.js";
export type { SessionTree } from "./session/session-tree.js";
export type { AgentDefinition, AgentDefParser } from "./agent/agent-def.js";
export type { SkillDefRegistry, SkillDefParser } from "./skill/skill-def-registry.js";

// Application — kernel, plugins, services
export { canTransitionRun, terminalRunStatuses } from "./kernel/state-machine.js";
export { AgentKernel, KernelError, CircuitBreaker, CircuitBreakerOpenError } from "./kernel/kernel.js";
export type { AgentKernelConfig, RunState, KernelErrorCode, CircuitState, CircuitBreakerOptions } from "./kernel/kernel.js";
export type { RunHandle } from "./kernel/kernel-types.js";
export { RunStateMachine } from "./kernel/run-state.js";
export { PermissionGate } from "./kernel/permission-gate.js";
export type { PermissionCheckResult } from "./kernel/permission-gate.js";
export { ModelCaller } from "./kernel/model-caller.js";
export { evaluateStopConditions, toToolCallOutcome } from "./kernel/termination.js";
export type { StopCondition, TerminationPolicy, ToolCallOutcome, StepVerificationContext } from "./kernel/termination.js";
export { SessionRunCoordinator, kernelAsRunHandler } from "./session/run-coordinator.js";
export type { SessionEvent, SessionEventType } from "./session/run-coordinator.js";
export { DefaultPluginManager } from "./plugin/manager.js";
export { InMemoryAgentRegistry } from "./agent/agent-registry.js";
export { ExecutionEngine } from "./agent/execution-engine.js";
export { Tracer } from "./tracer.js";
export type { Traceable } from "./tracer.js";
export { ToolRegistry as InMemoryToolRegistry, ToolRegistry } from "./tool/registry.js";
export { ToolSaga } from "./kernel/tool-saga.js";
export type { ToolPermissionRule, ToolMaterialization } from "./tool/registry.js";
export { ToolProviderRegistry } from "./tool/provider.js";
export type { ToolProvider } from "./tool/provider.js";
export { InMemorySessionState } from "./session/in-memory-session-state.js";
export { restoreRunFromStore, findActiveSessionIds } from "./session/durable-reload.js";
export type { RestoredRun } from "./session/durable-reload.js";
export { NullRunEventStore, NullSessionStore } from "./session/null-store.js";
export { InMemoryModelRegistry } from "./model.js";
export { InMemoryApprovalStore } from "./permission/saved.js";
export { InMemorySessionTree } from "./session/session-tree.js";
export { createDefaultSessionTitleGenerator } from "./session/title.js";
export { createAgent, createSubAgent, validateAgentConfig } from "./agent/agent-factory.js";
export type { CreateAgentParams, SubAgentParams } from "./agent/agent-factory.js";
export { createSpawnAgentTool } from "./agent/spawn-agent-tool.js";
export type { SpawnAgentInput } from "./agent/spawn-agent-tool.js";
export { createDelegateTool } from "./agent/delegate-tool.js";
export type { DelegateInput } from "./agent/delegate-tool.js";
export { createDelegateBatchTool } from "./agent/delegate-batch-tool.js";
export type { DelegateBatchInput } from "./agent/delegate-batch-tool.js";
export { createListAgentsTool } from "./agent/list-agents-tool.js";
export { createCreateAgentTool } from "./agent/create-agent-tool.js";
export type { CreateAgentInput } from "./agent/create-agent-tool.js";
export { createSkillTool, createSkillSearchTool } from "./skill/skill-tool.js";
export type { SkillToolInput } from "./skill/skill-tool.js";
export { createCreateSkillTool } from "./skill/create-skill-tool.js";
export type { CreateSkillInput } from "./skill/create-skill-tool.js";
export { WorkspaceManager } from "./workspace.js";
export type { Workspace, WorkspaceEventType, WorkspaceEvent } from "./workspace.js";
export { AgentParser } from "./agent/agent-parser.js";
export { SkillParser } from "./skill/skill-parser.js";
export { InMemorySkillDefRegistry } from "./skill/skill-def-registry.js";
export { wildcardMatch } from "@vinhnt-sdk/schema";
export { checkRiskAllowed, resolveEffectivePermissions, mergeRulesets, normalizePermissions, evaluatePermission } from "./permission/checker.js";
export type { PermissionResult } from "./permission/checker.js";
export { matchPermission, buildPermissionRules } from "./permission/evaluator.js";

// Context sources
export { createContextRegistry } from "./system-context/registry.js";
export { createDateSource } from "./system-context/sources/date-source.js";
export { createWorkspaceSource } from "./system-context/sources/workspace-source.js";
export type { WorkspaceInfo } from "./system-context/sources/workspace-source.js";
export { createInstructionsSource } from "./system-context/sources/instructions-source.js";
export type { InstructionsInfo } from "./system-context/sources/instructions-source.js";
export { createAgentSource } from "./system-context/sources/agent-source.js";
export type { AgentContextInfo } from "./system-context/sources/agent-source.js";
export { createSystemPromptSource } from "./system-context/prompts/system-prompt-source.js";
export { createSkillGuidanceSource } from "./system-context/sources/skill-guidance-source.js";
export type { SkillGuidanceInfo } from "./system-context/sources/skill-guidance-source.js";

// Knowledge
export { InMemoryMemoryStore, SessionMemory, BoundedMemory, ContextCompressor, LlmCompactor, WriteApprovalQueue, BackgroundReview, LearningEngine, createMemorySearchTool, buildPrompt } from "./knowledge/index.js";
export type { MemoryItem, MemoryStore, MemoryTier, Skill, CompressorOptions, ReviewOptions, PromptBuilderOptions } from "./knowledge/index.js";

// Crypto
export { hashPassword, verifyPassword } from "./crypto/password.js";

// Tool runtime
export { validateInput, ToolInputError } from "./tool/validate.js";
export type { ApprovalDecision } from "./kernel/permission-gate.js";
export type { DynamicRule } from "./kernel/permission-gate.js";
export type { ApprovalHandler } from "./tool/policy.js";
export { ToolSandbox, signalToToolContext } from "./tool/sandbox.js";
export type { SandboxConfig } from "./tool/sandbox.js";
export { ToolRuntime } from "./tool/runtime.js";
export type { ToolExecutionResult, ToolRuntimeConfig, ToolHook } from "./tool/runtime.js";
export { createKernelTools, createPluginToolHook } from "./tool/bridge.js";
export { FileReadTracker } from "./tool/read-tracker.js";
export { InMemoryFileHistory } from "./tool/file-history.js";
export { createFileHistoryHook } from "./tool/history-hook.js";
export { readImageToContentParts, createReadImageTool } from "./tool/image-tools.js";
export { generateDiff } from "./tool/diff.js";
export type { UnifiedDiff } from "./tool/diff.js";
export { createReadFileTool, createWriteFileTool, createEditFileTool, createApplyPatchTool, createListDirectoryTool, createShellTool, createGitStatusTool, createGitDiffTool, createGitLogTool, createGitCommitTool, createGlobFilesTool, createGrepFilesTool, createWebFetchTool, createQuestionTool, createWebSearchTool, createTodoWriteTool } from "./tool/index.js";
export { createCodingDomain } from "./tool/domain.js";
export type { DomainManifest } from "./tool/domain.js";
export type { QuestionInput, QuestionHandler } from "./tool/question-tool.js";
export type { ShellToolConfig } from "./tool/shell-tool.js";
