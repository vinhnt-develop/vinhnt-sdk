import type { RunId, TraceId, RequestId } from "./branded.js";
import type { AgentStepType } from "../types/agent-step.js";

// ---------------------------------------------------------------------------
// Snapshot types (for LLM request/response capture)
// ---------------------------------------------------------------------------

/**
 * Simplified message representation for LLM request snapshots.
 * Uses strict role enum (state machine core).
 */
export interface LlmSnapshotMessage {
  readonly role: "system" | "user" | "assistant" | "developer" | "tool";
  readonly content: string;
  readonly toolCalls?: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly args: unknown;
  }>;
  readonly toolCallId?: string;
}

/**
 * Tool definition snapshot for LLM request debugging.
 *
 * Wire (`name`/`description`/`parameters`) vs off-wire (`origin`) per AGENTS.md §2b.
 * Prefer the Zod-derived type from `./schema/run-event.js` when validating.
 */
export interface LlmSnapshotToolDef {
  /** Wire name as sent to the provider. */
  readonly name: string;
  readonly description?: string;
  readonly parameters?: Record<string, unknown>;
  /** Off-wire provenance — never sent to the LLM. */
  readonly origin?: {
    readonly id?: string;
    readonly risk?: string;
    readonly metadata?: Record<string, unknown>;
    readonly annotations?: Record<string, unknown>;
  };
}

/**
 * Selected resource entry — either a bare id string or an object with id +
 * optional display/enabled flags (webui composer form).
 */
export type LlmSnapshotSelectedTool = string | {
  readonly id: string;
  readonly name?: string;
  readonly enabled?: boolean;
};

/** Selected knowledge entry — bare id or object with id/key/enabled. */
export type LlmSnapshotSelectedKnowledge = string | {
  readonly id: string;
  readonly key?: string;
  readonly enabled?: boolean;
};

/**
 * User-selected resources for a specific LLM request.
 * Empty arrays or undefined = send all (backward compatible default).
 */
export interface LlmSnapshotSelection {
  readonly tools?: LlmSnapshotSelectedTool[];
  readonly knowledge?: LlmSnapshotSelectedKnowledge[];
  readonly plugins?: string[];
  readonly metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Base metadata (shared by all events)
// ---------------------------------------------------------------------------
export interface RunEvent<TData = unknown> {
  readonly id: string;
  readonly runId: RunId;
  readonly sequence: number;
  readonly type: string;
  readonly occurredAt: string;
  readonly traceId: TraceId;
  readonly parentRunId?: RunId;
  readonly data: TData;
  /** If false, event is emitted live but not persisted to the event store (e.g. streaming tokens) */
  readonly persist?: boolean;
  /** Schema version for migration support (matches EventDefinition.durable.version) */
  readonly version?: number;
}

// ---------------------------------------------------------------------------
// AgentEvent — general event type for all agent lifecycle events
// ---------------------------------------------------------------------------

/**
 * Base agent event interface.
 * All agent events extend this interface.
 */
export interface AgentEventBase {
  readonly type: string;
  readonly timestamp: string;
  readonly traceId?: TraceId;
  readonly runId?: RunId;
  readonly parentRunId?: RunId;
}

/**
 * Agent started event.
 */
export interface AgentStartedEvent extends AgentEventBase {
  readonly type: "agent.started";
  readonly runId: RunId;
  readonly prompt: string;
  readonly model?: string;
  readonly provider?: string;
}

/**
 * Model request event.
 */
export interface ModelRequestEvent extends AgentEventBase {
  readonly type: "model.request";
  readonly runId: RunId;
  readonly model: string;
  readonly provider?: string;
  readonly tokenCount?: number;
}

/**
 * Model response event.
 */
export interface ModelResponseEvent extends AgentEventBase {
  readonly type: "model.response";
  readonly runId: RunId;
  readonly model: string;
  readonly provider?: string;
  readonly tokensUsed?: number;
  readonly durationMs?: number;
}

/**
 * Tool start event.
 */
export interface ToolStartEvent extends AgentEventBase {
  readonly type: "tool.start";
  readonly runId: RunId;
  readonly tool: string;
  readonly input?: unknown;
}

/**
 * Tool end event.
 */
export interface ToolEndEvent extends AgentEventBase {
  readonly type: "tool.end";
  readonly runId: RunId;
  readonly tool: string;
  readonly output?: unknown;
  readonly durationMs?: number;
}

/**
 * Agent thinking event.
 */
export interface AgentThinkingEvent extends AgentEventBase {
  readonly type: "agent.thinking";
  readonly runId: RunId;
  readonly content: string;
}

/**
 * Agent completed event.
 */
export interface AgentCompletedEvent extends AgentEventBase {
  readonly type: "agent.completed";
  readonly runId: RunId;
  readonly status: "succeeded" | "failed" | "cancelled";
  readonly output?: string;
  readonly error?: string;
  readonly durationMs?: number;
}

/**
 * Agent error event.
 */
export interface AgentErrorEvent extends AgentEventBase {
  readonly type: "agent.error";
  readonly runId: RunId;
  readonly error: string;
  readonly code?: string;
}

/**
 * Permission requested event.
 */
export interface PermissionEvent extends AgentEventBase {
  readonly type: "permission.requested";
  readonly runId: RunId;
  readonly tool: string;
  readonly resource: string;
  readonly reason: string;
}

/**
 * Agent event — discriminated union of all agent events.
 * Use this type for type-safe event handling.
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
export type AgentEvent =
  | AgentStartedEvent
  | ModelRequestEvent
  | ModelResponseEvent
  | ToolStartEvent
  | ToolEndEvent
  | AgentThinkingEvent
  | AgentCompletedEvent
  | AgentErrorEvent
  | PermissionEvent;

// ---------------------------------------------------------------------------
// Data payloads (reusable by consumers)
// ---------------------------------------------------------------------------
export interface RunStartedData { readonly prompt: string; readonly model: string; readonly provider: string; readonly agentName?: string; readonly agentId?: string; readonly parentRunId?: RunId }
export interface StepStartedData { readonly turn: number; readonly step: number }
export interface TokenStreamedData { readonly content: string; readonly step: number }
export interface ThinkingStartedData { readonly step: number }
export interface ThinkingContentData { readonly content: string; readonly step: number }
export interface ThinkingCompletedData { readonly content: string; readonly step: number }
export interface ContextCompressedData {
  readonly originalCount: number;
  readonly compressedCount: number;
  readonly summary?: string;
  readonly removedMessageIds?: string[];
}
export interface TokenCountedData { readonly inputTokens: number; readonly outputTokens?: number; readonly reasoningTokens?: number; readonly cacheReadTokens?: number; readonly cacheWriteTokens?: number; readonly provider: string; readonly model: string; readonly step: number; readonly source?: "local" | "api" }
export interface ModelCostData { readonly inputTokens: number; readonly outputTokens: number; readonly cost: number; readonly model: string; readonly provider: string; readonly durationMs: number; readonly step: number }
export interface ToolInvokedData { readonly toolId: string; readonly toolName: string; readonly input: unknown; readonly domain?: string; readonly decision?: "allow" | "deny" | "ask" }
export interface ToolCompletedData { readonly toolId: string; readonly toolName: string; readonly output: unknown; readonly metadata?: Record<string, unknown>; readonly domain?: string }
export interface ToolFailedData { readonly toolId: string; readonly toolName: string; readonly error: string; readonly domain?: string; readonly decision?: "allow" | "deny" | "ask" }
export interface ToolSelfCorrectingData { readonly toolId: string; readonly toolName: string; readonly error: string; readonly attempt: number }
export interface StepCompletedData { readonly turn: number; readonly step: number; readonly toolCallCount: number }
export interface StepFailedData { readonly turn: number; readonly step: number; readonly reason: string; readonly error?: string }
export interface RunCompletedData { readonly status: "succeeded" | "failed"; readonly cancelled?: boolean; readonly output?: string; readonly error?: string; readonly totalSteps: number; readonly durationMs?: number; readonly inputTokens?: number; readonly outputTokens?: number; readonly reasoningTokens?: number; readonly stopReason?: string; readonly provider?: string }
export interface PermissionRequestedData { readonly requestId: RequestId; readonly toolName: string; readonly resource: string; readonly reason: string; readonly prompt: string }
export interface PermissionRepliedData { readonly requestId: RequestId; readonly reply: "once" | "always" | "reject" }
export interface StepTypeChangedData { readonly stepType: AgentStepType; readonly stepNumber: number; readonly toolName?: string; readonly detail?: string }
export interface TurnStartedData { readonly turn: number }
export interface TurnEndedData { readonly turn: number; readonly reason: "completed" | "aborted" | "blocked" | "error" | "max_tokens" | "interrupted" }
export interface LlmRetryData { readonly attempt: number; readonly delayMs: number; readonly reason: string; readonly provider?: string }
export interface LlmRetryStartedData { readonly attempt: number }
export interface LlmFailoverData { readonly fromProvider: string; readonly fromModel: string; readonly toProvider: string; readonly toModel: string; readonly reason: string }
export interface ApprovalAskedData { readonly requestId: RequestId; readonly toolName: string; readonly resource: string; readonly reason: string }
export interface ApprovalDecidedData { readonly requestId: RequestId; readonly decision: "allow" | "deny" | "unavailable" }
export interface ToolCancelledData { readonly toolId: string; readonly toolName: string; readonly callId?: string }
export interface RequestHeaderData { readonly provider: string; readonly model: string; readonly reason: "initial" | "resume" | "change" | "series" }
export interface RequestContextData { readonly provider: string; readonly model: string; readonly contextWindow?: number }
/**
 * Data payload for the `llm.request` event.
 *
 * Grouped: `params` (generation knobs), `prompt` (assembly summary),
 * optional top-level snapshot (`messages`/`tools`/`selection`/`agent`).
 * Prefer Zod-derived type from `./schema/run-event.js` when validating.
 */
export interface LlmRequestData {
  readonly step: number;
  readonly model: string;
  readonly provider?: string;
  /** Generation / sampling knobs. */
  readonly params?: {
    readonly temperature?: number;
    readonly maxTokens?: number;
    readonly maxCompletionTokens?: number;
    readonly topP?: number;
    readonly stopSequences?: readonly string[];
    readonly frequencyPenalty?: number;
    readonly presencePenalty?: number;
    readonly toolChoice?: string | Record<string, unknown>;
    readonly parallelToolCalls?: boolean;
    readonly responseFormat?: Record<string, unknown>;
    readonly stream?: boolean;
    readonly seed?: number;
    readonly user?: string;
    readonly logitBias?: Record<string, number>;
    readonly logprobs?: boolean;
    readonly topLogprobs?: number;
    readonly reasoningEffort?: string;
  };
  /** Prompt assembly summary. */
  readonly prompt?: {
    readonly systemPromptLength?: number;
    readonly systemPrompt?: string;
    readonly messageCount?: number;
    readonly toolCount?: number;
  };
  /** Full messages array sent to LLM. */
  readonly messages?: ReadonlyArray<LlmSnapshotMessage>;
  /** Tool definitions with schemas. */
  readonly tools?: ReadonlyArray<LlmSnapshotToolDef>;
  /** User-selected resources from composer. */
  readonly selection?: LlmSnapshotSelection;
  /** Agent identity at time of request. */
  readonly agent?: { readonly id?: string; readonly name?: string };
}

/**
 * Data payload for the `llm.response` event.
 * Captures the full model response as a unified snapshot.
 */
export interface LlmResponseData {
  readonly content: string;
  readonly toolCalls?: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly args: unknown;
  }>;
  readonly finishReason?: string;
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly reasoningTokens?: number;
    readonly cacheReadTokens?: number;
    readonly cacheWriteTokens?: number;
  };
  readonly durationMs: number;
  readonly model?: string;
  readonly provider?: string;
  /** Step number this response belongs to (matches llm.request.step). */
  readonly step?: number;
  readonly metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Discriminated union — enables type-safe narrowing in consumers
// instead of `event.data as Record<string, unknown>`
// ---------------------------------------------------------------------------
export type KnownRunEvent =
  | (RunEvent<RunStartedData> & { readonly type: "run.started" })
  | (RunEvent<StepStartedData> & { readonly type: "step.started" })
  | (RunEvent<TokenStreamedData> & { readonly type: "token.streamed" })
  | (RunEvent<ThinkingStartedData> & { readonly type: "thinking.started" })
  | (RunEvent<ThinkingContentData> & { readonly type: "thinking.content" })
  | (RunEvent<ThinkingCompletedData> & { readonly type: "thinking.completed" })
  | (RunEvent<ContextCompressedData> & { readonly type: "context.compressed" })
  | (RunEvent<TokenCountedData> & { readonly type: "token.counted" })
  | (RunEvent<ToolInvokedData> & { readonly type: "tool.invoked" })
  | (RunEvent<ToolCompletedData> & { readonly type: "tool.completed" })
  | (RunEvent<ToolFailedData> & { readonly type: "tool.failed" })
  | (RunEvent<ToolCancelledData> & { readonly type: "tool.cancelled" })
  | (RunEvent<ToolSelfCorrectingData> & { readonly type: "tool.self_correcting" })
  | (RunEvent<StepCompletedData> & { readonly type: "step.completed" })
  | (RunEvent<StepFailedData> & { readonly type: "step.failed" })
  | (RunEvent<RunCompletedData> & { readonly type: "run.completed" })
  | (RunEvent<PermissionRequestedData> & { readonly type: "permission.requested" })
  | (RunEvent<PermissionRepliedData> & { readonly type: "permission.replied" })
  | (RunEvent<StepTypeChangedData> & { readonly type: "step.type_changed" })
  | (RunEvent<ModelCostData> & { readonly type: "model.cost" })
  | (RunEvent<TurnStartedData> & { readonly type: "turn.started" })
  | (RunEvent<TurnEndedData> & { readonly type: "turn.end" })
  | (RunEvent<LlmRetryData> & { readonly type: "llm.retry" })
  | (RunEvent<LlmRetryStartedData> & { readonly type: "llm.retry_started" })
  | (RunEvent<LlmFailoverData> & { readonly type: "llm.failover" })
  | (RunEvent<ApprovalAskedData> & { readonly type: "approval.asked" })
  | (RunEvent<ApprovalDecidedData> & { readonly type: "approval.decided" })
  | (RunEvent<RequestHeaderData> & { readonly type: "request.header" })
  | (RunEvent<RequestContextData> & { readonly type: "request.context" })
  | (RunEvent<LlmRequestData> & { readonly type: "llm.request" })
  | (RunEvent<LlmResponseData> & { readonly type: "llm.response" });
