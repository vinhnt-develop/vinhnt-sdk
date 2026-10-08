import { z } from "zod";
import { isMessageId, isSessionId, isAgentId, isWorkspaceId } from "../branded.js";

/** Zod schema for message token counts. */
export const MessageTokensSchema = z.object({
  input: z.number(),
  output: z.number(),
  reasoning: z.number().optional(),
});
/** Inferred type of {@link MessageTokensSchema}. */
export type MessageTokens = z.infer<typeof MessageTokensSchema>;

/** Zod schema for a persisted assistant tool call (mirrors `ToolCall`). */
export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  args: z.record(z.string(), z.unknown()),
});

/** Zod schema for a structured content block (mirrors `ContentPart`). */
export const ContentPartSchema = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({
    type: z.literal("image_url"),
    image_url: z.object({
      url: z.string(),
      detail: z.enum(["auto", "low", "high"]).optional(),
    }),
  }),
  z.object({
    type: z.literal("input_audio"),
    input_audio: z.object({ data: z.string(), format: z.enum(["wav", "mp3"]) }),
  }),
]);

/** Zod schema for a stored message. */
export const MessageSchema = z.object({
  id: z.string().refine(isMessageId, "Invalid MessageId"),
  sessionId: z.string().refine(isSessionId, "Invalid SessionId").optional(),
  role: z.enum(["system", "user", "assistant", "tool", "developer", "function"]).or(z.string()),
  content: z.string(),
  toolCallId: z.string().optional(),
  toolName: z.string().optional(),
  /** Assistant tool calls persisted with the message (P1.2 round-trip). */
  toolCalls: z.array(ToolCallSchema).optional(),
  /** Structured content blocks persisted alongside `content` (P1.2 round-trip). */
  contentBlocks: z.array(ContentPartSchema).optional(),
  tokens: MessageTokensSchema.optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  cost: z.number().optional(),
  createdAt: z.string(),
  /** Admission order for pending user inputs (RV-21). */
  admittedSeq: z.number().optional(),
  /** Set once an admitted input has been drained into a run (RV-21). */
  promotedSeq: z.number().optional(),
  /** Extensible metadata bag for plugins/consumers. */
  metadata: z.record(z.string(), z.unknown()).optional(),
});
/** Inferred type of {@link MessageSchema}. */
export type Message = z.infer<typeof MessageSchema>;

/** Zod schema for a stored session. */
export const SessionSchema = z.object({
  id: z.string().refine(isSessionId, "Invalid SessionId"),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  parentSessionId: z.string().refine(isSessionId, "Invalid SessionId").optional(),
  agentId: z.string().refine(isAgentId, "Invalid AgentId").optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  cost: z.number().optional(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  location: z.object({
    directory: z.string(),
    workspaceId: z.string().refine(isWorkspaceId, "Invalid WorkspaceId").optional(),
  }).optional(),
  isActive: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
/** Inferred type of {@link SessionSchema}. */
export type Session = z.infer<typeof SessionSchema>;

export interface SessionStats {
  readonly totalSessions: number;
  readonly totalCost: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalMessages: number;
  readonly sessionsByDate: Array<{ date: string; count: number }>;
  readonly costByModel: Array<{ model: string; cost: number }>;
}
