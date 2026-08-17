// ───────────────────────────────────────────────
// Core contracts — branded ids, run events, errors, API transport schemas.
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
  StepCompletedData, StepFailedData, RunCompletedData,
  PermissionRequestedData, PermissionRepliedData, StepTypeChangedData,
} from "./events.js";

export type {
  AgentEvent,
  AgentEventBase,
  AgentStartedEvent,
  ModelRequestEvent,
  ModelResponseEvent,
  ToolStartEvent,
  ToolEndEvent,
  AgentThinkingEvent,
  AgentCompletedEvent,
  AgentErrorEvent,
  PermissionEvent,
} from "./events.js";

export {
  VntError,
  AgentNotFoundError, AgentValidationError, AgentPermissionDenied,
  ToolNotFoundError, ToolExecutionError, ToolPermissionDenied,
  RunNotFoundError, RunAbortedError, RunTimeoutError,
  KernelError, CircuitBreakerOpenError, ToolInputError,
  PermissionDeniedError, ValidationError, TimeoutError,
  NetworkError, RateLimitError, AuthenticationError,
  ConfigurationError, PluginError,
} from "./errors/index.js";
export type { VntErrorCtx } from "./errors/index.js";

// ── API transport schemas (WS, Webview, HTTP contracts) ──
export {
  WsConnectSchema, WsHeartbeatSchema, WsRunEventSchema, WsMessageSchema,
  parseWsMessage, runEventToWs,
  WebviewAppendSchema, WebviewDoneSchema, WebviewErrorSchema,
  WebviewSetMessagesSchema, WebviewEventSchema, WebviewResponseSchema,
  WebviewChatSchema, WebviewReadySchema, WebviewMessageSchema,
  PaginationSchema, RunResultSchema, ErrorResponseSchema,
  CreateShareSchema, ShareResponseSchema, SharedSessionSchema,
} from "./api/index.js";
export type {
  WsMessage, WsRunEvent, RunEventLike,
  WebviewResponse, WebviewMessage,
  RunResult, ErrorResponse, CreateShare, ShareResponse, SharedSession,
} from "./api/index.js";
