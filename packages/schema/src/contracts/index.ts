// ───────────────────────────────────────────────
// Core contracts — branded ids, run events, errors.
// These are the identity + event-sourcing primitives
// the whole system depends on.
// ───────────────────────────────────────────────

export type {
  BrandedId, RunId, SessionId, AgentId, ToolCallId, MessageId, TraceId, RequestId, WorkspaceId, EnvironmentId, FilePatchId,
} from "./branded.js";
export {
  isAgentId, isRunId, isSessionId, isMessageId, isToolCallId,
  isTraceId, isRequestId, isRecord,
  assertAgentId, assertRunId, assertSessionId, assertMessageId,
} from "./branded.js";

export type {
  RunEvent, KnownRunEvent,
  RunStartedData, StepStartedData, TokenStreamedData,
  ThinkingStartedData, ThinkingContentData, ThinkingCompletedData,
  ContextCompressedData, TokenCountedData, ModelCostData,
  ToolInvokedData, ToolCompletedData, ToolFailedData, ToolSelfCorrectingData,
  StepCompletedData, RunCompletedData,
  PermissionRequestedData, PermissionRepliedData, StepTypeChangedData,
} from "./events.js";

export {
  VntError,
  AgentNotFoundError, AgentValidationError, AgentPermissionDenied,
  ToolNotFoundError, ToolExecutionError, ToolPermissionDenied,
  RunNotFoundError, RunAbortedError, RunTimeoutError,
} from "./errors/index.js";
