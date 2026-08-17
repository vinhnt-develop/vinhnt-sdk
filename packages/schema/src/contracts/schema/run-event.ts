import { z } from "zod";
import { isRunId, isTraceId } from "../branded.js";
import { RequestContextSchema } from "./request-context.js";

/* ── Data payload schemas ── */

export const RunStartedDataSchema = z.object({
  prompt: z.string(),
  model: z.string().optional(),
  agentName: z.string().optional(),
  agentId: z.string().optional(),
  maxSteps: z.number().optional(),
  ctx: RequestContextSchema.optional(),
});
export type RunStartedData = z.infer<typeof RunStartedDataSchema>;

export const StepStartedDataSchema = z.object({
  step: z.number(),
});
export type StepStartedData = z.infer<typeof StepStartedDataSchema>;

export const TokenStreamedDataSchema = z.object({
  content: z.string(),
  step: z.number(),
});
export type TokenStreamedData = z.infer<typeof TokenStreamedDataSchema>;

export const ThinkingStartedDataSchema = z.object({
  step: z.number(),
});
export type ThinkingStartedData = z.infer<typeof ThinkingStartedDataSchema>;

export const ThinkingContentDataSchema = z.object({
  content: z.string(),
  step: z.number(),
});
export type ThinkingContentData = z.infer<typeof ThinkingContentDataSchema>;

export const ThinkingCompletedDataSchema = z.object({
  content: z.string(),
  step: z.number(),
});
export type ThinkingCompletedData = z.infer<typeof ThinkingCompletedDataSchema>;

export const ContextCompressedDataSchema = z.object({
  originalCount: z.number(),
  compressedCount: z.number(),
  step: z.number().optional(),
});
export type ContextCompressedData = z.infer<typeof ContextCompressedDataSchema>;

export const TokenCountedDataSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number().optional(),
  reasoningTokens: z.number().optional(),
  step: z.number(),
  source: z.enum(["local", "api"]).optional(),
});
export type TokenCountedData = z.infer<typeof TokenCountedDataSchema>;

export const ModelCostDataSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cost: z.number(),
  model: z.string(),
  durationMs: z.number(),
  step: z.number(),
});
export type ModelCostData = z.infer<typeof ModelCostDataSchema>;

export const ToolInvokedDataSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  input: z.unknown(),
  domain: z.string().optional(),
  decision: z.enum(["allow", "deny", "ask"]).optional(),
});
export type ToolInvokedData = z.infer<typeof ToolInvokedDataSchema>;

export const ToolCompletedDataSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  output: z.unknown(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  domain: z.string().optional(),
});
export type ToolCompletedData = z.infer<typeof ToolCompletedDataSchema>;

export const ToolFailedDataSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  error: z.string(),
  domain: z.string().optional(),
  decision: z.enum(["allow", "deny", "ask"]).optional(),
});
export type ToolFailedData = z.infer<typeof ToolFailedDataSchema>;

export const ToolSelfCorrectingDataSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  error: z.string(),
  attempt: z.number(),
});
export type ToolSelfCorrectingData = z.infer<typeof ToolSelfCorrectingDataSchema>;

export const PermissionRequestedDataSchema = z.object({
  requestId: z.string(),
  toolName: z.string(),
  resource: z.string(),
  reason: z.string(),
  prompt: z.string(),
});
export type PermissionRequestedData = z.infer<typeof PermissionRequestedDataSchema>;

export const PermissionRepliedDataSchema = z.object({
  requestId: z.string(),
  reply: z.enum(["once", "always", "reject"]),
});
export type PermissionRepliedData = z.infer<typeof PermissionRepliedDataSchema>;

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

export const StepTypeChangedDataSchema = z.object({
  stepType: z.enum(STEP_TYPES),
  stepNumber: z.number(),
  toolName: z.string().optional(),
  detail: z.string().optional(),
});
export type StepTypeChangedData = z.infer<typeof StepTypeChangedDataSchema>;

export const StepCompletedDataSchema = z.object({
  step: z.number(),
  toolCallCount: z.number(),
});
export type StepCompletedData = z.infer<typeof StepCompletedDataSchema>;

export const StepFailedDataSchema = z.object({
  step: z.number(),
  reason: z.string(),
  error: z.string().optional(),
});
export type StepFailedData = z.infer<typeof StepFailedDataSchema>;

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

export const RunStartedEventSchema = eventSchema(RunStartedDataSchema, z.literal("run.started"));
export type RunStartedEvent = z.infer<typeof RunStartedEventSchema>;

export const StepStartedEventSchema = eventSchema(StepStartedDataSchema, z.literal("step.started"));
export type StepStartedEvent = z.infer<typeof StepStartedEventSchema>;

export const TokenStreamedEventSchema = eventSchema(TokenStreamedDataSchema, z.literal("token.streamed"));
export type TokenStreamedEvent = z.infer<typeof TokenStreamedEventSchema>;

export const ThinkingStartedEventSchema = eventSchema(ThinkingStartedDataSchema, z.literal("thinking.started"));
export type ThinkingStartedEvent = z.infer<typeof ThinkingStartedEventSchema>;

export const ThinkingContentEventSchema = eventSchema(ThinkingContentDataSchema, z.literal("thinking.content"));
export type ThinkingContentEvent = z.infer<typeof ThinkingContentEventSchema>;

export const ThinkingCompletedEventSchema = eventSchema(ThinkingCompletedDataSchema, z.literal("thinking.completed"));
export type ThinkingCompletedEvent = z.infer<typeof ThinkingCompletedEventSchema>;

export const ContextCompressedEventSchema = eventSchema(ContextCompressedDataSchema, z.literal("context.compressed"));
export type ContextCompressedEvent = z.infer<typeof ContextCompressedEventSchema>;

export const TokenCountedEventSchema = eventSchema(TokenCountedDataSchema, z.literal("token.counted"));
export type TokenCountedEvent = z.infer<typeof TokenCountedEventSchema>;

export const ModelCostEventSchema = eventSchema(ModelCostDataSchema, z.literal("model.cost"));
export type ModelCostEvent = z.infer<typeof ModelCostEventSchema>;

export const ToolInvokedEventSchema = eventSchema(ToolInvokedDataSchema, z.literal("tool.invoked"));
export type ToolInvokedEvent = z.infer<typeof ToolInvokedEventSchema>;

export const ToolCompletedEventSchema = eventSchema(ToolCompletedDataSchema, z.literal("tool.completed"));
export type ToolCompletedEvent = z.infer<typeof ToolCompletedEventSchema>;

export const ToolFailedEventSchema = eventSchema(ToolFailedDataSchema, z.literal("tool.failed"));
export type ToolFailedEvent = z.infer<typeof ToolFailedEventSchema>;

export const ToolSelfCorrectingEventSchema = eventSchema(ToolSelfCorrectingDataSchema, z.literal("tool.self_correcting"));
export type ToolSelfCorrectingEvent = z.infer<typeof ToolSelfCorrectingEventSchema>;

export const StepCompletedEventSchema = eventSchema(StepCompletedDataSchema, z.literal("step.completed"));
export type StepCompletedEvent = z.infer<typeof StepCompletedEventSchema>;

export const StepFailedEventSchema = eventSchema(StepFailedDataSchema, z.literal("step.failed"));
export type StepFailedEvent = z.infer<typeof StepFailedEventSchema>;

export const RunCompletedEventSchema = eventSchema(RunCompletedDataSchema, z.literal("run.completed"));
export type RunCompletedEvent = z.infer<typeof RunCompletedEventSchema>;

export const PermissionRequestedEventSchema = eventSchema(PermissionRequestedDataSchema, z.literal("permission.requested"));
export type PermissionRequestedEvent = z.infer<typeof PermissionRequestedEventSchema>;

export const PermissionRepliedEventSchema = eventSchema(PermissionRepliedDataSchema, z.literal("permission.replied"));
export type PermissionRepliedEvent = z.infer<typeof PermissionRepliedEventSchema>;

export const StepTypeChangedEventSchema = eventSchema(StepTypeChangedDataSchema, z.literal("step.type_changed"));
export type StepTypeChangedEvent = z.infer<typeof StepTypeChangedEventSchema>;

/* ── Discriminated union ── */

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
export type KnownRunEvent = z.infer<typeof KnownRunEventSchema>;

/* ── Runtime parser ── */

/** Parse unknown data as a KnownRunEvent. Throws ZodError on mismatch. */
export function parseRunEvent(data: unknown): KnownRunEvent {
  return KnownRunEventSchema.parse(data);
}

/** Safe parse — returns { success, data } or { success, error } */
export function safeParseRunEvent(data: unknown) {
  return KnownRunEventSchema.safeParse(data);
}
