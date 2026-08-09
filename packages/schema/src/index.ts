// @vinhnt-sdk/schema
// Core types and contracts for vinhnt-sdk

/**
 * Branded ID types for type safety.
 * 
 * @example
 * ```typescript
 * import { RunId, SessionId } from "@vinhnt-sdk/schema";
 * 
 * const runId: RunId = "run_123" as RunId;
 * const sessionId: SessionId = "session_456" as SessionId;
 * ```
 */

// === Branded IDs ===

/**
 * Branded ID types for type-safe identifiers.
 */
export type {
  BrandedId, RunId, SessionId, AgentId, TraceId, RequestId, ToolCallId, MessageId, WorkspaceId, EnvironmentId, FilePatchId,
} from "./contracts/index.js";

/**
 * Type guards for branded IDs.
 * 
 * @example
 * ```typescript
 * import { isAgentId } from "@vinhnt-sdk/schema";
 * 
 * if (isAgentId(id)) {
 *   // id is safely typed as AgentId
 * }
 * ```
 */
export {
  isAgentId, isRunId, isSessionId, isMessageId, isToolCallId,
  isTraceId, isRequestId, isRecord,
  assertAgentId, assertRunId, assertSessionId, assertMessageId,
} from "./contracts/index.js";

/**
 * Event system for run lifecycle events.
 * 
 * Events are used to track and monitor agent execution.
 */
// === Events ===

/**
 * Run event types and data structures.
 */
export type {
  RunEvent, KnownRunEvent,
  RunStartedData, StepStartedData, TokenStreamedData,
  ThinkingStartedData, ThinkingContentData, ThinkingCompletedData,
  ContextCompressedData, TokenCountedData,
  ToolInvokedData, ToolCompletedData, ToolFailedData, ToolSelfCorrectingData,
  StepCompletedData, RunCompletedData,
  PermissionRequestedData, PermissionRepliedData, StepTypeChangedData,
} from "./contracts/index.js";

/**
 * Agent event types for all agent lifecycle events.
 * 
 * @example
 * ```typescript
 * import { AgentEvent } from "@vinhnt-sdk/schema";
 * 
 * function handleEvent(event: AgentEvent) {
 *   switch (event.type) {
 *     case "agent.started":
 *       console.log(`Agent started: ${event.prompt}`);
 *       break;
 *     case "tool.start":
 *       console.log(`Tool started: ${event.tool}`);
 *       break;
 *     case "agent.completed":
 *       console.log(`Agent completed: ${event.status}`);
 *       break;
 *   }
 * }
 * ```
 */
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
} from "./contracts/index.js";

/**
 * Error classes for the SDK.
 * 
 * All errors extend VntError and include error codes and retryable flags.
 * 
 * @example
 * ```typescript
 * import { VntError, ToolInputError } from "@vinhnt-sdk/schema";
 * 
 * try {
 *   throw new ToolInputError("Invalid input", { toolId: "my_tool" });
 * } catch (e) {
 *   if (e instanceof ToolInputError) {
 *     console.log(e.code); // "tool_input_error"
 *     console.log(e.retryable); // false
 *   }
 * }
 * ```
 */

// === Error classes ===

/**
 * Base error class for all SDK errors.
 */
export {
  VntError,
  AgentNotFoundError, AgentValidationError, AgentPermissionDenied,
  ToolNotFoundError, ToolExecutionError, ToolPermissionDenied,
  RunNotFoundError, RunAbortedError, RunTimeoutError,
  KernelError, CircuitBreakerOpenError, ToolInputError,
  PermissionDeniedError, ValidationError, TimeoutError,
  NetworkError, RateLimitError, AuthenticationError,
  ConfigurationError, PluginError,
} from "./contracts/index.js";

/**
 * Error context type.
 */
export type { VntErrorCtx } from "./contracts/index.js";

/**
 * Core types for the SDK.
 * 
 * These types define the data structures used throughout the SDK.
 */

// === Core types ===

/**
 * Core types for runs, sessions, agents, and more.
 */
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

/**
 * Utility constants and functions.
 */
export {
  APPROVAL_CATEGORY_LABELS, AGENT_STEP_LABELS, inferStepType,
  ok, fail,
} from "./types/index.js";

/**
 * Event system for defining and subscribing to typed events.
 * 
 * @example
 * ```typescript
 * import { defineEvent } from "@vinhnt-sdk/schema";
 * 
 * const ToolExecuted = defineEvent<{
 *   toolId: string;
 *   duration: number;
 * }>("tool.executed");
 * 
 * bus.on(ToolExecuted, (event) => {
 *   console.log(`${event.toolId} executed in ${event.duration}ms`);
 * });
 * ```
 */

// === Event system ===

/**
 * Event registry and event definition utilities.
 */
export { EventRegistry, defineEvent } from "./event/index.js";

/**
 * Event type definitions.
 */
export type { EventDefinition, TypedEvent } from "./event/index.js";

/**
 * Built-in permission events.
 */
export { PermissionRequested, PermissionReplied } from "./event/events.js";

/**
 * Schema versioning utilities for backward compatibility.
 */

// === Schema versioning ===

/**
 * Schema versioning utilities.
 */
export { SchemaVersionedBaseSchema, versionedSchema, deprecated } from "./versioned.js";

/**
 * Schema versioning types.
 */
export type { SchemaVersionedBase, VersionedSchemaOptions } from "./versioned.js";

/**
 * Utility functions.
 */

// === Utilities ===

/**
 * Wildcard pattern matching utility.
 */
export { wildcardMatch } from "./wildcard.js";

/**
 * Contract schemas for validation.
 */

// === Contract schemas ===

/**
 * Zod schemas for core types.
 */
export { AgentConfigSchema, RequestContextSchema } from "./contracts/schema/index.js";
