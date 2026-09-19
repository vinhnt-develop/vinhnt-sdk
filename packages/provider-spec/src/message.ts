/**
 * Chat message types.
 *
 * Messages are the primary input/output format for language models.
 * Uses discriminated union on `role` field.
 */

/**
 * Base message interface.
 */
export interface BaseMessage {
  /** Message content. */
  readonly content: string | readonly ContentPart[];
  /** Provider-specific metadata. */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Content part (for multi-modal messages).
 */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; data: string; mediaType: string } }
  | { type: "image-url"; url: string }
  | { type: "audio"; data: string; mediaType: string };

/**
 * System message.
 */
export interface SystemMessage extends BaseMessage {
  readonly role: "system";
}

/**
 * User message.
 */
export interface UserMessage extends BaseMessage {
  readonly role: "user";
  /** Optional user name. */
  readonly name?: string;
}

/**
 * Assistant message.
 */
export interface AssistantMessage extends BaseMessage {
  readonly role: "assistant";
  /** Tool calls made by the assistant. */
  readonly toolCalls?: readonly ToolCallPart[];
  /** Finish reason. */
  readonly finishReason?: string;
  /** Model used. */
  readonly model?: string;
  /** Provider used. */
  readonly provider?: string;
}

/**
 * Tool message (result of a tool call).
 */
export interface ToolMessage extends BaseMessage {
  readonly role: "tool";
  /** ID of the tool call this is responding to. */
  readonly toolCallId: string;
  /** Name of the tool. */
  readonly toolName?: string;
  /** Whether the tool call succeeded. */
  readonly status?: "success" | "error";
}

/**
 * Developer message (for multi-agent systems).
 */
export interface DeveloperMessage extends BaseMessage {
  readonly role: "developer";
}

/**
 * Tool call part within an assistant message.
 */
export interface ToolCallPart {
  /** Tool call ID. */
  readonly id: string;
  /** Tool name. */
  readonly name: string;
  /** Tool input as JSON string or parsed object. */
  readonly input: string | Record<string, unknown>;
}

/**
 * Union of all chat message types.
 */
export type ChatMessage =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolMessage
  | DeveloperMessage;

/**
 * Type guard for system messages.
 */
export function isSystemMessage(message: ChatMessage): message is SystemMessage {
  return message.role === "system";
}

/**
 * Type guard for user messages.
 */
export function isUserMessage(message: ChatMessage): message is UserMessage {
  return message.role === "user";
}

/**
 * Type guard for assistant messages.
 */
export function isAssistantMessage(message: ChatMessage): message is AssistantMessage {
  return message.role === "assistant";
}

/**
 * Type guard for tool messages.
 */
export function isToolMessage(message: ChatMessage): message is ToolMessage {
  return message.role === "tool";
}

/**
 * Type guard for developer messages.
 */
export function isDeveloperMessage(message: ChatMessage): message is DeveloperMessage {
  return message.role === "developer";
}

// Re-export ContentPart for convenience
import type { ContentPart as ContentPartType } from "./message.js";
