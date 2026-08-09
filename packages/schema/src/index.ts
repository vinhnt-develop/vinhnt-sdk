// @vinhnt-sdk/schema
// Core types and contracts for vinhnt-sdk

// === Branded IDs ===
export type {
  BrandedId, RunId, SessionId, AgentId, TraceId, RequestId, ToolCallId, MessageId, WorkspaceId, EnvironmentId, FilePatchId,
} from "./contracts/index.js";
export {
  isAgentId, isRunId, isSessionId, isMessageId, isToolCallId,
  isTraceId, isRequestId, isRecord,
  assertAgentId, assertRunId, assertSessionId, assertMessageId,
} from "./contracts/index.js";

// === Events ===
export type {
  RunEvent, KnownRunEvent,
  RunStartedData, StepStartedData, TokenStreamedData,
  ThinkingStartedData, ThinkingContentData, ThinkingCompletedData,
  ContextCompressedData, TokenCountedData,
  ToolInvokedData, ToolCompletedData, ToolFailedData, ToolSelfCorrectingData,
  StepCompletedData, RunCompletedData,
  PermissionRequestedData, PermissionRepliedData, StepTypeChangedData,
} from "./contracts/index.js";

// === Error classes ===
export {
  VntError,
  AgentNotFoundError, AgentValidationError, AgentPermissionDenied,
  ToolNotFoundError, ToolExecutionError, ToolPermissionDenied,
  RunNotFoundError, RunAbortedError, RunTimeoutError,
} from "./contracts/index.js";

// === Core types ===
export type {
  RunStatus, RequestContext, Result,
  Session, Message, MessageTokens, SessionStats,
  AgentProfile, AgentConfig, AgentPermissions,
  AgentMode, AgentBehaviourMode, AgentCapabilities, AgentRule, AgentRuleset,
  MemoryEntry,
  SkillManifest, SkillDefinition,
  SkillSource, SkillSourceType, SkillPermission, SkillPermissionValue,
  ChatMessage, MessageContentPart,
  CompressionSummary,
  ApprovalRequest,
  ConversationCompactor,
  ModelProvider,
  PromptAssembly,
  SessionStore,
  ToolDefinitionLike,
  ToolCall,
  PermissionRequest, PermissionReply, SavedApproval,
  ModelRequest, ModelResponse, ModelStreamEvent, ModelPricing, ModelCapabilities, ModelRegistry,
  RunEventSnapshot, RunEventListener, SessionUpdates, RunEventStore,
  SessionNode, SessionTreeSnapshot, SessionTreeEvent,
} from "./types/index.js";
export {
  APPROVAL_CATEGORY_LABELS, AGENT_STEP_LABELS, inferStepType,
  ok, fail,
} from "./types/index.js";

// === Event system ===
export { EventRegistry, defineEvent } from "./event/index.js";
export type { EventDefinition, TypedEvent } from "./event/index.js";
export { PermissionRequested, PermissionReplied } from "./event/events.js";

// === Schema versioning ===
export { SchemaVersionedBaseSchema, versionedSchema, deprecated } from "./versioned.js";
export type { SchemaVersionedBase, VersionedSchemaOptions } from "./versioned.js";

// === Utilities ===
export { wildcardMatch } from "./wildcard.js";

// === Contract schemas ===
export { AgentConfigSchema, RequestContextSchema } from "./contracts/schema/index.js";
