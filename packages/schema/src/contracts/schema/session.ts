import { z } from "zod";
import { isMessageId, isSessionId } from "../branded.js";

/** Zod schema for message token counts. */
export const MessageTokensSchema = z.object({
  input: z.number(),
  output: z.number(),
  reasoning: z.number().optional(),
});

/** Zod schema for a stored message. */
export const MessageSchema = z.object({
  id: z.string().refine(isMessageId, "Invalid MessageId"),
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string(),
  toolCallId: z.string().optional(),
  toolName: z.string().optional(),
  tokens: MessageTokensSchema.optional(),
  model: z.string().optional(),
  cost: z.number().optional(),
  createdAt: z.string(),
});
/** Inferred type of {@link MessageSchema}. */
export type Message = z.infer<typeof MessageSchema>;

/** Zod schema for a stored session. */
export const SessionSchema = z.object({
  id: z.string().refine(isSessionId, "Invalid SessionId"),
  projectId: z.string(),
  title: z.string(),
  cost: z.number(),
  tokensInput: z.number(),
  tokensOutput: z.number().optional(),
  messages: z.array(MessageSchema).optional(),
  timeCreated: z.string(),
  timeUpdated: z.string(),
});
/** Inferred type of {@link SessionSchema}. */
export type Session = z.infer<typeof SessionSchema>;
