import { z } from "zod";
import { isRunId, isTraceId } from "../branded.js";
import { RequestContextSchema } from "./request-context.js";

/* ── Data payload schemas ── */

/** Data payload for the `run.started` event. */
export const RunStartedDataSchema = z.object({
  prompt: z.string(),
  model: z.string().optional(),
  provider: z.string().optional(),
  agentName: z.string().optional(),
  agentId: z.string().optional(),
  maxSteps: z.number().optional(),
  ctx: RequestContextSchema.optional(),
});
/** Inferred type of {@link RunStartedDataSchema}. */
export type RunStartedData = z.infer<typeof RunStartedDataSchema>;

/** Data payload for the `step.started` event. */
export const StepStartedDataSchema = z.object({
  step: z.number(),
});
/** Inferred type of {@link StepStartedDataSchema}. */
export type StepStartedData = z.infer<typeof StepStartedDataSchema>;

/** Data payload for the `token.streamed` event. */
export const TokenStreamedDataSchema = z.object({
  content: z.string(),
  step: z.number(),
});
/** Inferred type of {@link TokenStreamedDataSchema}. */
export type TokenStreamedData = z.infer<typeof TokenStreamedDataSchema>;

/** Data payload for the `thinking.started` event. */
export const ThinkingStartedDataSchema = z.object({
  step: z.number(),
});
/** Inferred type of {@link ThinkingStartedDataSchema}. */
export type ThinkingStartedData = z.infer<typeof ThinkingStartedDataSchema>;

/** Data payload for the `thinking.content` event. */
export const ThinkingContentDataSchema = z.object({
  content: z.string(),
  step: z.number(),
});
/** Inferred type of {@link ThinkingContentDataSchema}. */
export type ThinkingContentData = z.infer<typeof ThinkingContentDataSchema>;

/** Data payload for the `thinking.completed` event. */
export const ThinkingCompletedDataSchema = z.object({
  content: z.string(),
  step: z.number(),
});
/** Inferred type of {@link ThinkingCompletedDataSchema}. */
export type ThinkingCompletedData = z.infer<typeof ThinkingCompletedDataSchema>;

/** Data payload for the `context.compressed` event. */
export const ContextCompressedDataSchema = z.object({
  originalCount: z.number(),
  compressedCount: z.number(),
  step: z.number().optional(),
});
/** Inferred type of {@link ContextCompressedDataSchema}. */
export type ContextCompressedData = z.infer<typeof ContextCompressedDataSchema>;

/** Data payload for the `token.counted` event. */
export const TokenCountedDataSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number().optional(),
  reasoningTokens: z.number().optional(),
  step: z.number(),
  source: z.enum(["local", "api"]).optional(),
});
/** Inferred type of {@link TokenCountedDataSchema}. */
export type TokenCountedData = z.infer<typeof TokenCountedDataSchema>;

/** Data payload for the `model.cost` event. */
export const ModelCostDataSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cost: z.number(),
  model: z.string(),
  provider: z.string().optional(),
  durationMs: z.number(),
  step: z.number(),
});
/** Inferred type of {@link ModelCostDataSchema}. */
export type ModelCostData = z.infer<typeof ModelCostDataSchema>;

/** Data payload for the `tool.invoked` event. */
export const ToolInvokedDataSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  input: z.unknown(),
  domain: z.string().optional(),
  decision: z.enum(["allow", "deny", "ask"]).optional(),
});
/** Inferred type of {@link ToolInvokedDataSchema}. */
export type ToolInvokedData = z.infer<typeof ToolInvokedDataSchema>;

/** Data payload for the `tool.completed` event. */
export const ToolCompletedDataSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  output: z.unknown(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  domain: z.string().optional(),
});
/** Inferred type of {@link ToolCompletedDataSchema}. */
export type ToolCompletedData = z.infer<typeof ToolCompletedDataSchema>;

/** Data payload for the `tool.failed` event. */
export const ToolFailedDataSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  error: z.string(),
  domain: z.string().optional(),
  decision: z.enum(["allow", "deny", "ask"]).optional(),
});
/** Inferred type of {@link ToolFailedDataSchema}. */
export type ToolFailedData = z.infer<typeof ToolFailedDataSchema>;

/** Data payload for the `tool.self_correcting` event. */
export const ToolSelfCorrectingDataSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  error: z.string(),
  attempt: z.number(),
});
/** Inferred type of {@link ToolSelfCorrectingDataSchema}. */
export type ToolSelfCorrectingData = z.infer<typeof ToolSelfCorrectingDataSchema>;

/** Data payload for the `permission.requested` event. */
export const PermissionRequestedDataSchema = z.object({
  requestId: z.string(),
  toolName: z.string(),
  resource: z.string(),
  reason: z.string(),
  prompt: z.string(),
});
/** Inferred type of {@link PermissionRequestedDataSchema}. */
export type PermissionRequestedData = z.infer<typeof PermissionRequestedDataSchema>;

/** Data payload for the `permission.replied` event. */
export const PermissionRepliedDataSchema = z.object({
  requestId: z.string(),
  reply: z.enum(["once", "always", "reject"]),
});
/** Inferred type of {@link PermissionRepliedDataSchema}. */
export type PermissionRepliedData = z.infer<typeof PermissionRepliedDataSchema>;

/** Valid step type identifiers. Single source of truth for agent step types. */
export const STEP_TYPES = [
  "analyzing_codebase",
  "searching_files",
  "reading_file",
  "generating_patch",
  "running_tests",
  "executing_bash",
  "thinking",
  "writing_file",
  "compiling",
  "idle",
] as const;

/** Data payload for the `step.type_changed` event. */
export const StepTypeChangedDataSchema = z.object({
  stepType: z.enum(STEP_TYPES),
  stepNumber: z.number(),
  toolName: z.string().optional(),
  detail: z.string().optional(),
});
/** Inferred type of {@link StepTypeChangedDataSchema}. */
export type StepTypeChangedData = z.infer<typeof StepTypeChangedDataSchema>;

/** Data payload for the `turn.started` event. */
export const TurnStartedDataSchema = z.object({
  turn: z.number(),
});
/** Inferred type of {@link TurnStartedDataSchema}. */
export type TurnStartedData = z.infer<typeof TurnStartedDataSchema>;

/** Data payload for the `turn.end` event. */
export const TurnEndedDataSchema = z.object({
  turn: z.number(),
  reason: z.enum(["completed", "aborted", "blocked", "error", "max_tokens", "interrupted"]),
});
/** Inferred type of {@link TurnEndedDataSchema}. */
export type TurnEndedData = z.infer<typeof TurnEndedDataSchema>;

/** Data payload for the `llm.retry` event. */
export const LlmRetryDataSchema = z.object({
  attempt: z.number(),
  delayMs: z.number(),
  reason: z.string(),
});
/** Inferred type of {@link LlmRetryDataSchema}. */
export type LlmRetryData = z.infer<typeof LlmRetryDataSchema>;

/** Data payload for the `llm.retry_started` event. */
export const LlmRetryStartedDataSchema = z.object({
  attempt: z.number(),
});
/** Inferred type of {@link LlmRetryStartedDataSchema}. */
export type LlmRetryStartedData = z.infer<typeof LlmRetryStartedDataSchema>;

/** Data payload for the `approval.asked` event. */
export const ApprovalAskedDataSchema = z.object({
  requestId: z.string(),
  toolName: z.string(),
  resource: z.string(),
  reason: z.string(),
});
/** Inferred type of {@link ApprovalAskedDataSchema}. */
export type ApprovalAskedData = z.infer<typeof ApprovalAskedDataSchema>;

/** Data payload for the `approval.decided` event. */
export const ApprovalDecidedDataSchema = z.object({
  requestId: z.string(),
  decision: z.enum(["allow", "deny", "unavailable"]),
});
/** Inferred type of {@link ApprovalDecidedDataSchema}. */
export type ApprovalDecidedData = z.infer<typeof ApprovalDecidedDataSchema>;

/** Data payload for the `tool.cancelled` event. */
export const ToolCancelledDataSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  callId: z.string().optional(),
});
/** Inferred type of {@link ToolCancelledDataSchema}. */
export type ToolCancelledData = z.infer<typeof ToolCancelledDataSchema>;

/** Data payload for the `step.completed` event. */
export const StepCompletedDataSchema = z.object({
  step: z.number(),
  toolCallCount: z.number(),
});
/** Inferred type of {@link StepCompletedDataSchema}. */
export type StepCompletedData = z.infer<typeof StepCompletedDataSchema>;

/** Data payload for the `step.failed` event. */
export const StepFailedDataSchema = z.object({
  step: z.number(),
  reason: z.string(),
  error: z.string().optional(),
});
/** Inferred type of {@link StepFailedDataSchema}. */
export type StepFailedData = z.infer<typeof StepFailedDataSchema>;

/** Data payload for the `run.completed` event. */
export const RunCompletedDataSchema = z.object({
  status: z.enum(["succeeded", "failed"]),
  /** True when the run was cancelled (status is still "failed" — the status
   * enum stays closed so consumers can rely on exactly two terminal outcomes;
   * the cancelled flag disambiguates a user cancel from a genuine failure). */
  cancelled: z.boolean().optional(),
  output: z.string().optional(),
  error: z.string().optional(),
  totalSteps: z.number().optional(),
  durationMs: z.number().optional(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  reasoningTokens: z.number().optional(),
});
/** Inferred type of {@link RunCompletedDataSchema}. */
export type RunCompletedData = z.infer<typeof RunCompletedDataSchema>;

/* ── Event wrapper schema factory ── */

const EventBaseSchema = z.object({
  id: z.string().min(1),
  runId: z.string().refine(isRunId, "Invalid RunId"),
  sequence: z.number().int().nonnegative(),
  type: z.string(),
  occurredAt: z.string().datetime(),
  traceId: z.string().refine(isTraceId, "Invalid TraceId"),
  persist: z.boolean().optional(),
  version: z.number().int().nonnegative().optional(),
});

function eventSchema<T extends z.ZodTypeAny>(dataSchema: T, eventType: z.ZodLiteral<string>) {
  return EventBaseSchema.extend({
    type: eventType,
    data: dataSchema,
  });
}

/* ── Individual event schemas ── */

/** Zod schema for the `run.started` event. */
export const RunStartedEventSchema = eventSchema(RunStartedDataSchema, z.literal("run.started"));
/** Inferred type of {@link RunStartedEventSchema}. */
export type RunStartedEvent = z.infer<typeof RunStartedEventSchema>;

/** Zod schema for the `step.started` event. */
export const StepStartedEventSchema = eventSchema(StepStartedDataSchema, z.literal("step.started"));
/** Inferred type of {@link StepStartedEventSchema}. */
export type StepStartedEvent = z.infer<typeof StepStartedEventSchema>;

/** Zod schema for the `token.streamed` event. */
export const TokenStreamedEventSchema = eventSchema(TokenStreamedDataSchema, z.literal("token.streamed"));
/** Inferred type of {@link TokenStreamedEventSchema}. */
export type TokenStreamedEvent = z.infer<typeof TokenStreamedEventSchema>;

/** Zod schema for the `thinking.started` event. */
export const ThinkingStartedEventSchema = eventSchema(ThinkingStartedDataSchema, z.literal("thinking.started"));
/** Inferred type of {@link ThinkingStartedEventSchema}. */
export type ThinkingStartedEvent = z.infer<typeof ThinkingStartedEventSchema>;

/** Zod schema for the `thinking.content` event. */
export const ThinkingContentEventSchema = eventSchema(ThinkingContentDataSchema, z.literal("thinking.content"));
/** Inferred type of {@link ThinkingContentEventSchema}. */
export type ThinkingContentEvent = z.infer<typeof ThinkingContentEventSchema>;

/** Zod schema for the `thinking.completed` event. */
export const ThinkingCompletedEventSchema = eventSchema(ThinkingCompletedDataSchema, z.literal("thinking.completed"));
/** Inferred type of {@link ThinkingCompletedEventSchema}. */
export type ThinkingCompletedEvent = z.infer<typeof ThinkingCompletedEventSchema>;

/** Zod schema for the `context.compressed` event. */
export const ContextCompressedEventSchema = eventSchema(ContextCompressedDataSchema, z.literal("context.compressed"));
/** Inferred type of {@link ContextCompressedEventSchema}. */
export type ContextCompressedEvent = z.infer<typeof ContextCompressedEventSchema>;

/** Zod schema for the `token.counted` event. */
export const TokenCountedEventSchema = eventSchema(TokenCountedDataSchema, z.literal("token.counted"));
/** Inferred type of {@link TokenCountedEventSchema}. */
export type TokenCountedEvent = z.infer<typeof TokenCountedEventSchema>;

/** Zod schema for the `model.cost` event. */
export const ModelCostEventSchema = eventSchema(ModelCostDataSchema, z.literal("model.cost"));
/** Inferred type of {@link ModelCostEventSchema}. */
export type ModelCostEvent = z.infer<typeof ModelCostEventSchema>;

/** Zod schema for the `tool.invoked` event. */
export const ToolInvokedEventSchema = eventSchema(ToolInvokedDataSchema, z.literal("tool.invoked"));
/** Inferred type of {@link ToolInvokedEventSchema}. */
export type ToolInvokedEvent = z.infer<typeof ToolInvokedEventSchema>;

/** Zod schema for the `tool.completed` event. */
export const ToolCompletedEventSchema = eventSchema(ToolCompletedDataSchema, z.literal("tool.completed"));
/** Inferred type of {@link ToolCompletedEventSchema}. */
export type ToolCompletedEvent = z.infer<typeof ToolCompletedEventSchema>;

/** Zod schema for the `tool.failed` event. */
export const ToolFailedEventSchema = eventSchema(ToolFailedDataSchema, z.literal("tool.failed"));
/** Inferred type of {@link ToolFailedEventSchema}. */
export type ToolFailedEvent = z.infer<typeof ToolFailedEventSchema>;

/** Zod schema for the `tool.self_correcting` event. */
export const ToolSelfCorrectingEventSchema = eventSchema(ToolSelfCorrectingDataSchema, z.literal("tool.self_correcting"));
/** Inferred type of {@link ToolSelfCorrectingEventSchema}. */
export type ToolSelfCorrectingEvent = z.infer<typeof ToolSelfCorrectingEventSchema>;

/** Zod schema for the `step.completed` event. */
export const StepCompletedEventSchema = eventSchema(StepCompletedDataSchema, z.literal("step.completed"));
/** Inferred type of {@link StepCompletedEventSchema}. */
export type StepCompletedEvent = z.infer<typeof StepCompletedEventSchema>;

/** Zod schema for the `step.failed` event. */
export const StepFailedEventSchema = eventSchema(StepFailedDataSchema, z.literal("step.failed"));
/** Inferred type of {@link StepFailedEventSchema}. */
export type StepFailedEvent = z.infer<typeof StepFailedEventSchema>;

/** Zod schema for the `run.completed` event. */
export const RunCompletedEventSchema = eventSchema(RunCompletedDataSchema, z.literal("run.completed"));
/** Inferred type of {@link RunCompletedEventSchema}. */
export type RunCompletedEvent = z.infer<typeof RunCompletedEventSchema>;

/** Zod schema for the `permission.requested` event. */
export const PermissionRequestedEventSchema = eventSchema(PermissionRequestedDataSchema, z.literal("permission.requested"));
/** Inferred type of {@link PermissionRequestedEventSchema}. */
export type PermissionRequestedEvent = z.infer<typeof PermissionRequestedEventSchema>;

/** Zod schema for the `permission.replied` event. */
export const PermissionRepliedEventSchema = eventSchema(PermissionRepliedDataSchema, z.literal("permission.replied"));
/** Inferred type of {@link PermissionRepliedEventSchema}. */
export type PermissionRepliedEvent = z.infer<typeof PermissionRepliedEventSchema>;

/** Zod schema for the `step.type_changed` event. */
export const StepTypeChangedEventSchema = eventSchema(StepTypeChangedDataSchema, z.literal("step.type_changed"));
/** Inferred type of {@link StepTypeChangedEventSchema}. */
export type StepTypeChangedEvent = z.infer<typeof StepTypeChangedEventSchema>;

/** Zod schema for the `turn.started` event. */
export const TurnStartedEventSchema = eventSchema(TurnStartedDataSchema, z.literal("turn.started"));
/** Inferred type of {@link TurnStartedEventSchema}. */
export type TurnStartedEvent = z.infer<typeof TurnStartedEventSchema>;

/** Zod schema for the `turn.end` event. */
export const TurnEndEventSchema = eventSchema(TurnEndedDataSchema, z.literal("turn.end"));
/** Inferred type of {@link TurnEndEventSchema}. */
export type TurnEndEvent = z.infer<typeof TurnEndEventSchema>;

/** Zod schema for the `llm.retry` event. */
export const LlmRetryEventSchema = eventSchema(LlmRetryDataSchema, z.literal("llm.retry"));
/** Inferred type of {@link LlmRetryEventSchema}. */
export type LlmRetryEvent = z.infer<typeof LlmRetryEventSchema>;

/** Zod schema for the `llm.retry_started` event. */
export const LlmRetryStartedEventSchema = eventSchema(LlmRetryStartedDataSchema, z.literal("llm.retry_started"));
/** Inferred type of {@link LlmRetryStartedEventSchema}. */
export type LlmRetryStartedEvent = z.infer<typeof LlmRetryStartedEventSchema>;

/** Zod schema for the `approval.asked` event. */
export const ApprovalAskedEventSchema = eventSchema(ApprovalAskedDataSchema, z.literal("approval.asked"));
/** Inferred type of {@link ApprovalAskedEventSchema}. */
export type ApprovalAskedEvent = z.infer<typeof ApprovalAskedEventSchema>;

/** Zod schema for the `approval.decided` event. */
export const ApprovalDecidedEventSchema = eventSchema(ApprovalDecidedDataSchema, z.literal("approval.decided"));
/** Inferred type of {@link ApprovalDecidedEventSchema}. */
export type ApprovalDecidedEvent = z.infer<typeof ApprovalDecidedEventSchema>;

/** Zod schema for the `tool.cancelled` event. */
export const ToolCancelledEventSchema = eventSchema(ToolCancelledDataSchema, z.literal("tool.cancelled"));
/** Inferred type of {@link ToolCancelledEventSchema}. */
export type ToolCancelledEvent = z.infer<typeof ToolCancelledEventSchema>;

/* ── Discriminated union ── */

/** Zod schema for the KnownRun event. */
export const KnownRunEventSchema = z.discriminatedUnion("type", [
  RunStartedEventSchema,
  StepStartedEventSchema,
  TokenStreamedEventSchema,
  ThinkingStartedEventSchema,
  ThinkingContentEventSchema,
  ThinkingCompletedEventSchema,
  ContextCompressedEventSchema,
  TokenCountedEventSchema,
  ModelCostEventSchema,
  ToolInvokedEventSchema,
  ToolCompletedEventSchema,
  ToolFailedEventSchema,
  ToolCancelledEventSchema,
  ToolSelfCorrectingEventSchema,
  StepCompletedEventSchema,
  StepFailedEventSchema,
  RunCompletedEventSchema,
  PermissionRequestedEventSchema,
  PermissionRepliedEventSchema,
  StepTypeChangedEventSchema,
  TurnStartedEventSchema,
  TurnEndEventSchema,
  LlmRetryEventSchema,
  LlmRetryStartedEventSchema,
  ApprovalAskedEventSchema,
  ApprovalDecidedEventSchema,
]);
/** Inferred type of {@link KnownRunEventSchema}. */
export type KnownRunEvent = z.infer<typeof KnownRunEventSchema>;

/* ── Runtime parser ── */

/** Parse unknown data as a KnownRunEvent. Throws ZodError on mismatch. */
/** Inferred type of {@link parseRunEventSchema}. */
export function parseRunEvent(data: unknown): KnownRunEvent {
  return KnownRunEventSchema.parse(data);
}

/** Safe parse — returns { success, data } or { success, error } */
/** Inferred type of {@link safeParseRunEventSchema}. */
export function safeParseRunEvent(data: unknown) {
  return KnownRunEventSchema.safeParse(data);
}
