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
 * Agent event — discriminated union of the lifecycle events emitted by
 * `handle.events()` / `onEvent()` (the AgentRunHandle surface).
 *
 * Detailed run telemetry (tool, LLM, permission, step, …) uses the canonical
 * `KnownRunEvent` vocabulary via the event bus / persisted run events — not
 * this union.
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
 *     case "agent.error":
 *       console.log(`Agent error: ${event.error}`);
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
  | AgentCompletedEvent
  | AgentErrorEvent;

// ---------------------------------------------------------------------------
// Data payloads (reusable by consumers)
// ---------------------------------------------------------------------------
export interface RunStartedData { readonly prompt: string; readonly model: string; readonly provider: string; readonly agentName?: string; readonly agentId?: string; readonly parentRunId?: RunId; readonly sessionId?: string }
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
export interface ToolInvokedData { readonly toolId: string; readonly toolName: string; readonly input: unknown; readonly domain?: string; readonly decision?: "allow" | "deny" | "ask"; readonly source?: string; readonly risk?: string }
export interface ToolCompletedData { readonly toolId: string; readonly toolName: string; readonly output: unknown; readonly metadata?: Record<string, unknown>; readonly domain?: string; readonly source?: string; readonly risk?: string; readonly durationMs?: number }
export interface ToolFailedData { readonly toolId: string; readonly toolName: string; readonly error: string; readonly domain?: string; readonly decision?: "allow" | "deny" | "ask"; readonly source?: string; readonly risk?: string; readonly durationMs?: number }
export interface ToolSelfCorrectingData { readonly toolId: string; readonly toolName: string; readonly error: string; readonly attempt: number }
export interface StepCompletedData { readonly turn: number; readonly step: number; readonly toolCallCount: number }
export interface StepFailedData { readonly turn: number; readonly step: number; readonly reason: string; readonly error?: string }
export interface RunCompletedData { readonly status: "succeeded" | "failed"; readonly cancelled?: boolean; readonly output?: string; readonly error?: string; readonly totalSteps: number; readonly durationMs?: number; readonly inputTokens?: number; readonly outputTokens?: number; readonly reasoningTokens?: number; readonly stopReason?: string; readonly provider?: string }
export interface PermissionRequestedData {
  readonly requestId: RequestId;
  readonly toolName: string;
  readonly resource: string;
  readonly reason: string;
  readonly prompt: string;
  readonly permission?: string;
  /**
   * Allow-rule patterns a `"always"` reply would persist (scope the user is
   * granting). Empty/absent → no durable scope beyond the current call.
   */
  readonly scope?: readonly string[];
  /** Origin of the ask (e.g. `rules` | `risk`) for UI explanation. */
  readonly source?: string;
}
export interface PermissionRepliedData { readonly requestId: RequestId; readonly reply: "once" | "always" | "reject"; readonly reason?: string }
export interface StepTypeChangedData { readonly stepType: AgentStepType; readonly stepNumber: number; readonly toolName?: string; readonly detail?: string }
export interface TurnStartedData { readonly turn: number }
export interface TurnEndedData { readonly turn: number; readonly reason: "completed" | "aborted" | "blocked" | "error" | "max_tokens" | "interrupted" }
export interface AgentHandoffData { readonly fromAgentId: string; readonly toAgentId: string; readonly reason: string; readonly summary?: string }
export interface LlmRetryData { readonly attempt: number; readonly delayMs: number; readonly reason: string; readonly provider?: string }
export interface LlmRetryStartedData { readonly attempt: number }
export interface LlmFailoverData { readonly fromProvider: string; readonly fromModel: string; readonly toProvider: string; readonly toModel: string; readonly reason: string }
export interface ApprovalAskedData { readonly requestId: RequestId; readonly toolName: string; readonly resource: string; readonly reason: string }
export interface ApprovalDecidedData { readonly requestId: RequestId; readonly decision: "allow" | "deny" | "unavailable" }
export interface ToolCancelledData { readonly toolId: string; readonly toolName: string; readonly callId?: string }
/**
 * A single todo item in the agent's task list.
 * Prefer the Zod-derived type from `./schema/run-event.js` when validating.
 */
export interface TodoItem {
  readonly id: string;
  readonly content: string;
  /** Continuous-present form of `content` (e.g. "Running tests"). */
  readonly activeForm?: string;
  readonly status: "pending" | "in_progress" | "completed" | "cancelled";
  readonly priority?: "high" | "medium" | "low";
  readonly createdAt?: number;
  readonly updatedAt?: number;
  readonly metadata?: Record<string, unknown>;
}
/** Data payload for the `todo.updated` event — full task-list snapshot. */
export interface TodoUpdatedData {
  readonly sessionId?: string;
  readonly todos: ReadonlyArray<TodoItem>;
}
/** A single selectable option for a question. */
export interface QuestionOption {
  readonly label: string;
  readonly description?: string;
}
/** One question within a `question.requested` batch (1–4 per request). */
export interface QuestionItem {
  /** Short title for the question (≤ 30 chars). */
  readonly header: string;
  /** The question text shown to the user. */
  readonly question: string;
  /** Predefined answer options; absent → free-text answer. */
  readonly options?: ReadonlyArray<QuestionOption>;
  /** Allow selecting multiple options (default false). */
  readonly multiple?: boolean;
}
/** Data payload for the `question.requested` event (HITL ask). */
export interface QuestionRequestedData {
  readonly requestId: RequestId;
  readonly sessionId?: string;
  readonly questions: ReadonlyArray<QuestionItem>;
  readonly allowCustom?: boolean;
  readonly expiresAt?: number;
}
/** Answer to a single question in a batch. */
export interface QuestionAnswer {
  /** Matches the `header` of the corresponding {@link QuestionItem}. */
  readonly header: string;
  /** Selected option labels (empty for free-text-only answers). */
  readonly selected: ReadonlyArray<string>;
  /** Free-text ("Other") answer, when the user typed one. */
  readonly text?: string;
}
/** Data payload for the `question.replied` event. */
export interface QuestionRepliedData {
  readonly requestId: RequestId;
  readonly action: "accept" | "decline" | "cancel";
  readonly answers?: ReadonlyArray<QuestionAnswer>;
}
/** A single step in a plan presented for approval (`plan.requested`). */
export interface PlanApprovalStep {
  /** Stable step id; the UI falls back to the array index when absent. */
  readonly id?: string;
  /** The step text shown to the user. */
  readonly text: string;
  /** Optional per-step status hint ("pending" | "in_progress" | "completed" | …). */
  readonly status?: string;
}
/** Data payload for the `plan.requested` event (HITL plan approval). */
export interface PlanRequestedData {
  readonly requestId: RequestId;
  readonly sessionId?: string;
  readonly title?: string;
  readonly steps: ReadonlyArray<PlanApprovalStep>;
  readonly explanation?: string;
  readonly expiresAt?: number;
}
/** Data payload for the `plan.replied` event. */
export interface PlanRepliedData {
  readonly requestId: RequestId;
  readonly decision: "approve" | "request_changes" | "cancel";
  readonly feedback?: string;
}
/** Semantic color for a surface callout/badge. */
export type UiSurfaceTone = "neutral" | "info" | "success" | "warning" | "danger";
/**
 * A clickable button inside an `actions` component. When the user clicks it
 * the client sends a `ui.action` message back to the agent carrying
 * `surfaceId` + `id` (+ optional `value`). Purely declarative — the SDK never
 * executes anything.
 */
export interface UiSurfaceActionItem {
  /** Stable action id echoed back to the agent on click. */
  readonly id: string;
  /** Button label shown to the user. */
  readonly label: string;
  /** Optional semantic color hint for the renderer. */
  readonly tone?: UiSurfaceTone;
  /** Optional opaque payload forwarded to the agent on click. */
  readonly value?: string;
}
/**
 * A single component inside a generative-UI surface. The set is a closed,
 * client-rendered whitelist (no code is ever evaluated) — consumers drop
 * unknown types. Mirrors the Zod discriminated union in
 * `./schema/run-event.js`.
 */
export type UiSurfaceComponent =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "markdown"; readonly markdown: string }
  | {
      readonly type: "keyValue";
      readonly items: ReadonlyArray<{ readonly label: string; readonly value: string }>;
    }
  | {
      readonly type: "table";
      readonly columns: ReadonlyArray<string>;
      readonly rows: ReadonlyArray<ReadonlyArray<string>>;
    }
  | {
      readonly type: "callout";
      readonly tone?: UiSurfaceTone;
      readonly title?: string;
      readonly text: string;
    }
  | { readonly type: "codeBlock"; readonly language?: string; readonly code: string }
  | {
      readonly type: "progress";
      readonly value: number;
      readonly max?: number;
      readonly label?: string;
    }
  | { readonly type: "badge"; readonly label: string; readonly tone?: UiSurfaceTone }
  | { readonly type: "list"; readonly items: ReadonlyArray<string>; readonly ordered?: boolean }
  | { readonly type: "actions"; readonly items: ReadonlyArray<UiSurfaceActionItem> };
/** A named generative-UI surface the agent renders for the user. */
export interface UiSurface {
  readonly surfaceId: string;
  readonly title?: string;
  readonly description?: string;
  readonly components: ReadonlyArray<UiSurfaceComponent>;
}
/**
 * Data payload for the `ui.surface` event. Full-surface snapshot (last-write-
 * wins); `action: "delete"` removes the surface. Durable so the UI can replay.
 */
export interface UiSurfaceData {
  readonly surfaceId: string;
  readonly sessionId?: string;
  readonly action?: "upsert" | "delete";
  readonly surface?: UiSurface;
}
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
  | (RunEvent<AgentHandoffData> & { readonly type: "agent.handoff" })
  | (RunEvent<LlmRetryData> & { readonly type: "llm.retry" })
  | (RunEvent<LlmRetryStartedData> & { readonly type: "llm.retry_started" })
  | (RunEvent<LlmFailoverData> & { readonly type: "llm.failover" })
  | (RunEvent<ApprovalAskedData> & { readonly type: "approval.asked" })
  | (RunEvent<ApprovalDecidedData> & { readonly type: "approval.decided" })
  | (RunEvent<TodoUpdatedData> & { readonly type: "todo.updated" })
  | (RunEvent<QuestionRequestedData> & { readonly type: "question.requested" })
  | (RunEvent<QuestionRepliedData> & { readonly type: "question.replied" })
  | (RunEvent<PlanRequestedData> & { readonly type: "plan.requested" })
  | (RunEvent<PlanRepliedData> & { readonly type: "plan.replied" })
  | (RunEvent<UiSurfaceData> & { readonly type: "ui.surface" })
  | (RunEvent<RequestHeaderData> & { readonly type: "request.header" })
  | (RunEvent<RequestContextData> & { readonly type: "request.context" })
  | (RunEvent<LlmRequestData> & { readonly type: "llm.request" })
  | (RunEvent<LlmResponseData> & { readonly type: "llm.response" });
