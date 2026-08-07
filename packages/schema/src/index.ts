// ── Contracts: branded ids, events, errors ──
export type {
  BrandedId, RunId, SessionId, AgentId, ToolCallId, MessageId, TraceId, RequestId, WorkspaceId, EnvironmentId, FilePatchId,
  RunEvent, KnownRunEvent,
  RunStartedData, StepStartedData, TokenStreamedData,
  ThinkingStartedData, ThinkingContentData, ThinkingCompletedData,
  ContextCompressedData, TokenCountedData,
  ToolInvokedData, ToolCompletedData, ToolFailedData, ToolSelfCorrectingData,
  StepCompletedData, RunCompletedData,
  PermissionRequestedData, PermissionRepliedData, StepTypeChangedData,
} from "./contracts/index.js";
export {
  isAgentId, isRunId, isSessionId, isMessageId, isToolCallId,
  isTraceId, isRequestId, isRecord,
  assertAgentId, assertRunId, assertSessionId, assertMessageId,
  VntError,
  AgentNotFoundError, AgentValidationError, AgentPermissionDenied,
  ToolNotFoundError, ToolExecutionError, ToolPermissionDenied,
  RunNotFoundError, RunAbortedError, RunTimeoutError,
} from "./contracts/index.js";

// ── Domain data types ──
export type {
  AgentMode, AgentBehaviourMode, AgentProfile, AgentCapabilities, AgentRule, AgentRuleset, AgentPermissions, AgentConfig,
  Session, Message, MessageTokens, SessionStats,
  SessionNode, SessionTreeSnapshot, TreeCursor, SessionTreeEvent, SessionTreeEventType,
  ApprovalRequest, ApprovalCategory, ApprovalStatus, ApprovalContext, ApprovalPolicy, PolicyEffect,
  SkillManifest, SkillDefinition, SkillSource, SkillSourceType, SkillMode, SkillPermission, SkillPermissionValue,
  PermissionRequest, PermissionReply, SavedApproval,
  RequestContext,
  Result,
  RunStatus,
  MemoryEntry,
  PromptTier, PromptAssembly, CompressionSummary,
  AgentStepType,
} from "./types/index.js";
export {
  APPROVAL_CATEGORY_LABELS,
  AGENT_STEP_LABELS, inferStepType,
  ok, fail,
} from "./types/index.js";

// ── Event system (definitions + registry) ──
export { EventRegistry, defineEvent } from "./event/index.js";
export type { EventDefinition, TypedEvent } from "./event/index.js";
export * from "./event/events.js";

// ── Zod schemas (data validation) ──
export * from "./contracts/schema/index.js";

// ── Zod schemas (tool input validation) ──
export { ReadFileSchema, WriteFileSchema, EditFileSchema, EditBlockSchema, ApplyPatchSchema, ListDirectorySchema, ExecuteCommandSchema, GlobFilesSchema, GrepFilesSchema, WebFetchSchema, ReadImageSchema, SkillSchema, SkillSearchSchema, CreateSkillSchema, GitDiffSchema, GitLogSchema, GitCommitSchema, GitStatusSchema, LspDiagnosticsSchema, LspSymbolsSchema, LspPositionSchema, QuestionSchema, WebSearchSchema } from "./tool/schemas.js";

// ── Schema versioning (envelope + upcast chain) ──
export {
  SchemaVersionedBaseSchema, versionedSchema, deprecated,
  DurableEventEnvelopeSchema, upcastEventToCurrent,
} from "./versioned.js";
export type {
  SchemaVersionedBase, SchemaMigration, DeprecationNote,
  VersionedSchemaOptions, VersionedSchema, DurableEventEnvelope, DurableEventDefinition,
} from "./versioned.js";

// ── Utilities ──
export { wildcardMatch } from "./wildcard.js";
