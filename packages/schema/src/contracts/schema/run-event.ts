import { z } from "zod";
import { isRunId, isTraceId } from "../branded.js";
import { RequestContextSchema } from "./request-context.js";

/* ── Data payload schemas ── */

/** Data payload for the `run.started` event. */
export const RunStartedDataSchema = z.object({
  prompt: z.string(),
  model: z.string().optional(),
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

/** Valid step type identifiers. */
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
  ToolSelfCorrectingEventSchema,
  StepCompletedEventSchema,
  StepFailedEventSchema,
  RunCompletedEventSchema,
PermissionRequestedEventSchema,
  PermissionRepliedEventSchema,
  StepTypeChangedEventSchema,
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
