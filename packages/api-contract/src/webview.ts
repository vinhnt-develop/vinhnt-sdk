import { z } from "zod";

export const WebviewAppendSchema = z.object({
  type: z.literal("append"),
  role: z.string().optional(),
  text: z.string().optional(),
});

export const WebviewDoneSchema = z.object({
  type: z.literal("done"),
});

export const WebviewErrorSchema = z.object({
  type: z.literal("error"),
  text: z.string().optional(),
});

export const WebviewSetMessagesSchema = z.object({
  type: z.literal("setMessages"),
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
});

export const WebviewEventSchema = z.object({
  type: z.literal("event"),
  event: z.string().optional(),
});

export const WebviewResponseSchema = z.union([
  WebviewAppendSchema,
  WebviewDoneSchema,
  WebviewErrorSchema,
  WebviewSetMessagesSchema,
  WebviewEventSchema,
]);

export type WebviewResponse = z.infer<typeof WebviewResponseSchema>;

export const WebviewChatSchema = z.object({
  type: z.literal("chat"),
  text: z.string().optional(),
});

export const WebviewReadySchema = z.object({
  type: z.literal("ready"),
});

export const WebviewMessageSchema = z.union([WebviewChatSchema, WebviewReadySchema]);

export type WebviewMessage = z.infer<typeof WebviewMessageSchema>;
