import { z } from "zod";

/** Webview `append` response message. */
export const WebviewAppendSchema = z.object({
  type: z.literal("append"),
  role: z.string().optional(),
  text: z.string().optional(),
});

/** Webview `done` response message. */
export const WebviewDoneSchema = z.object({
  type: z.literal("done"),
});

/** Webview `error` response message. */
export const WebviewErrorSchema = z.object({
  type: z.literal("error"),
  text: z.string().optional(),
});

/** Webview `setMessages` response message. */
export const WebviewSetMessagesSchema = z.object({
  type: z.literal("setMessages"),
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
});

/** Webview `event` response message. */
export const WebviewEventSchema = z.object({
  type: z.literal("event"),
  event: z.string().optional(),
});

/** Union of all webview response messages. */
export const WebviewResponseSchema = z.union([
  WebviewAppendSchema,
  WebviewDoneSchema,
  WebviewErrorSchema,
  WebviewSetMessagesSchema,
  WebviewEventSchema,
]);

/** Inferred type of {@link WebviewResponseSchema}. */
export type WebviewResponse = z.infer<typeof WebviewResponseSchema>;

/** Webview `chat` request message. */
export const WebviewChatSchema = z.object({
  type: z.literal("chat"),
  text: z.string().optional(),
});

/** Webview `ready` request message. */
export const WebviewReadySchema = z.object({
  type: z.literal("ready"),
});

/** Union of all webview request messages. */
export const WebviewMessageSchema = z.union([WebviewChatSchema, WebviewReadySchema]);

/** Inferred type of {@link WebviewMessageSchema}. */
export type WebviewMessage = z.infer<typeof WebviewMessageSchema>;
