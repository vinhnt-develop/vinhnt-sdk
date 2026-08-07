import type { RunId, TraceId, RequestId } from "./branded.js";
import type { AgentStepType } from "../types/agent-step.js";

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
  readonly data: TData;
  /** If false, event is emitted live but not persisted to the event store (e.g. streaming tokens) */
  readonly persist?: boolean;
  /** Schema version for migration support (matches EventDefinition.durable.version) */
  readonly version?: number;
}

// ---------------------------------------------------------------------------
// Data payloads (reusable by consumers)
// ---------------------------------------------------------------------------
export interface RunStartedData { readonly prompt: string; readonly model?: string; readonly agentName?: string; readonly agentId?: string }
export interface StepStartedData { readonly step: number }
export interface TokenStreamedData { readonly content: string; readonly step: number }
export interface ThinkingStartedData { readonly step: number }
export interface ThinkingContentData { readonly content: string; readonly step: number }
export interface ThinkingCompletedData { readonly content: string; readonly step: number }
export interface ContextCompressedData { readonly originalCount: number; readonly compressedCount: number }
export interface TokenCountedData { readonly inputTokens: number; readonly outputTokens?: number; readonly reasoningTokens?: number; readonly step: number; readonly source?: "local" | "api" }
export interface ModelCostData { readonly inputTokens: number; readonly outputTokens: number; readonly cost: number; readonly model: string; readonly durationMs: number; readonly step: number }
export interface ToolInvokedData { readonly toolId: string; readonly toolName: string; readonly input: unknown; readonly domain?: string; readonly decision?: "allow" | "deny" | "ask" }
export interface ToolCompletedData { readonly toolId: string; readonly toolName: string; readonly output: unknown; readonly metadata?: Record<string, unknown>; readonly domain?: string }
export interface ToolFailedData { readonly toolId: string; readonly toolName: string; readonly error: string; readonly domain?: string; readonly decision?: "allow" | "deny" | "ask" }
export interface ToolSelfCorrectingData { readonly toolId: string; readonly toolName: string; readonly error: string; readonly attempt: number }
export interface StepCompletedData { readonly step: number; readonly toolCallCount: number }
export interface RunCompletedData { readonly status: "succeeded" | "failed"; readonly output?: string; readonly error?: string; readonly totalSteps: number; readonly durationMs?: number; readonly inputTokens?: number; readonly outputTokens?: number; readonly reasoningTokens?: number }
export interface PermissionRequestedData { readonly requestId: RequestId; readonly toolName: string; readonly resource: string; readonly reason: string; readonly prompt: string }
export interface PermissionRepliedData { readonly requestId: RequestId; readonly reply: "once" | "always" | "reject" }
export interface StepTypeChangedData { readonly stepType: AgentStepType; readonly stepNumber: number; readonly toolName?: string; readonly detail?: string }

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
  | (RunEvent<ToolSelfCorrectingData> & { readonly type: "tool.self_correcting" })
  | (RunEvent<StepCompletedData> & { readonly type: "step.completed" })
  | (RunEvent<RunCompletedData> & { readonly type: "run.completed" })
  | (RunEvent<PermissionRequestedData> & { readonly type: "permission.requested" })
  | (RunEvent<PermissionRepliedData> & { readonly type: "permission.replied" })
  | (RunEvent<StepTypeChangedData> & { readonly type: "step.type_changed" })
  | (RunEvent<ModelCostData> & { readonly type: "model.cost" });
