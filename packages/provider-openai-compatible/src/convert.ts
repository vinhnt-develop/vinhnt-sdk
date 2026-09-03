/**
 * Conversion functions between OpenAI Chat Completion wire format and
 * vinhnt-sdk types. The wire-format *types* stay in
 * `@vinhnt-sdk/schema` (schema keeps the interface-only contract);
 * the logic lives here in the provider package.
 */

import type {
  ChatMessage,
  ContentPart,
  ModelResponse,
  ToolCall,
  ModelUsage,
  OpenAIMessage,
  OpenAIToolCall,
  OpenAIChoice,
  OpenAIResponse,
  OpenAIStreamChunk,
  Logprobs,
  OpenAIErrorResponse,
} from "@vinhnt-sdk/schema";
import { redactSecrets } from "@vinhnt-sdk/security";
import { getTextContent } from "@vinhnt-sdk/schema";
import type {
  VntError,
} from "@vinhnt-sdk/schema";
import {
  AuthenticationError,
  RateLimitError,
  ValidationError,
  PermissionDeniedError,
  NetworkError,
} from "@vinhnt-sdk/schema";

// ── Message conversion ──

/**
 * Convert OpenAI Chat Completion message to vinhnt-sdk ChatMessage.
 *
 * @example
 * ```ts
 * const vntMsg = fromOpenAIMessage({
 *   role: "user",
 *   content: [{ type: "text", text: "Hello" }],
 * });
 * ```
 */
export function fromOpenAIMessage(msg: OpenAIMessage): ChatMessage {
  let content: string | readonly ContentPart[];

  if (msg.content === null || msg.content === undefined) {
    content = "";
  } else if (typeof msg.content === "string") {
    content = msg.content;
  } else {
    content = msg.content.map((p): ContentPart => {
      switch (p.type) {
        case "text":
          return { type: "text", text: p.text ?? "" };
        case "image_url": {
          const url = p.image_url?.url ?? "";
          const detail = p.image_url?.detail as "auto" | "low" | "high" | undefined;
          return { type: "image_url", image_url: { url, ...(detail !== undefined ? { detail } : {}) } };
        }
        case "input_audio": {
          const data = p.input_audio?.data ?? "";
          const format = (p.input_audio?.format as "wav" | "mp3") ?? "wav";
          return { type: "input_audio", input_audio: { data, format } };
        }
        default:
          return { type: "text", text: "" };
      }
    });
  }

  const result: ChatMessage = {
    role: msg.role,
    content,
  };

  if (msg.tool_call_id) {
    (result as { toolCallId?: string }).toolCallId = msg.tool_call_id;
  }

  if (msg.tool_calls) {
    (result as { toolCalls?: readonly ToolCall[] }).toolCalls = msg.tool_calls.map((tc): ToolCall => ({
      id: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments || "{}"),
    }));
  }

  if (msg.refusal) {
    (result as { refusal?: string }).refusal = msg.refusal;
  }

  return result;
}

/**
 * Convert vinhnt-sdk ChatMessage to OpenAI Chat Completion message.
 *
 * @example
 * ```ts
 * const openaiMsg = toOpenAIMessage({
 *   role: "user",
 *   content: "Hello",
 * });
 * ```
 */
export function toOpenAIMessage(msg: ChatMessage): OpenAIMessage {
  const content = getTextContent(msg.content);

  const result: OpenAIMessage = {
    role: msg.role as OpenAIMessage["role"],
    content: content || null,
  };

  if (msg.toolCallId) {
    (result as { tool_call_id?: string }).tool_call_id = msg.toolCallId;
  }

  if (msg.toolCalls && msg.toolCalls.length > 0) {
    (result as { tool_calls?: readonly OpenAIToolCall[] }).tool_calls = msg.toolCalls.map((tc): OpenAIToolCall => ({
      id: tc.id,
      type: "function",
      function: {
        name: tc.name,
        arguments: JSON.stringify(tc.args ?? {}),
      },
    }));
  }

  if (msg.refusal) {
    (result as { refusal?: string | null }).refusal = msg.refusal;
  }

  return result;
}

// ── Response conversion ──

/**
 * Convert OpenAI Chat Completion response to vinhnt-sdk ModelResponse.
 *
 * @example
 * ```ts
 * const response = await fetch("https://api.openai.com/v1/chat/completions", ...);
 * const data = await response.json();
 * const vntResponse = fromOpenAIResponse(data);
 * ```
 */
export function fromOpenAIResponse(res: OpenAIResponse, provider?: string): ModelResponse {
  const choice: OpenAIChoice | undefined = Array.isArray(res.choices) ? res.choices[0] : undefined;
  if (!choice) {
    return { content: "", provider: provider ?? "unknown" };
  }

  const content = choice.message.content ?? "";
  const toolCalls = choice.message.tool_calls?.map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    args: JSON.parse(tc.function.arguments || "{}"),
  }));

  const usage: ModelUsage | undefined = res.usage ? {
    promptTokens: res.usage.prompt_tokens,
    completionTokens: res.usage.completion_tokens,
    totalTokens: res.usage.total_tokens,
    ...(res.usage.prompt_tokens_details?.cached_tokens !== undefined
      ? { cachedTokens: res.usage.prompt_tokens_details.cached_tokens }
      : {}),
    ...(res.usage.completion_tokens_details?.reasoning_tokens !== undefined
      ? { reasoningTokens: res.usage.completion_tokens_details.reasoning_tokens }
      : {}),
    audioTokens: (res.usage.prompt_tokens_details?.audio_tokens ?? 0) + (res.usage.completion_tokens_details?.audio_tokens ?? 0),
  } : undefined;

  return {
    content,
    ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : {}),
    ...(choice.finish_reason === null || choice.finish_reason === undefined
      ? {}
      : { finishReason: choice.finish_reason }),
    ...(usage !== undefined ? { usage } : {}),
    id: res.id,
    model: res.model,
    provider: provider ?? "unknown",
    created: res.created,
    ...(res.system_fingerprint !== undefined ? { systemFingerprint: res.system_fingerprint } : {}),
    ...(choice.logprobs !== undefined && choice.logprobs !== null ? { logprobs: choice.logprobs } : {}),
    ...(choice.message.refusal !== undefined && choice.message.refusal !== null ? { refusal: choice.message.refusal } : {}),
  };
}

/**
 * Convert vinhnt-sdk ModelResponse to OpenAI Chat Completion response format.
 *
 * @example
 * ```ts
 * const openaiRes = toOpenAIResponse({
 *   content: "Hello!",
 *   finishReason: "stop",
 *   usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
 * });
 * ```
 */
export function toOpenAIResponse(res: ModelResponse): OpenAIResponse {
  return {
    id: res.id ?? `gen-${Date.now()}`,
    object: "chat.completion",
    created: res.created ?? Math.floor(Date.now() / 1000),
    model: res.model ?? "unknown",
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: res.content || null,
        ...(res.toolCalls && res.toolCalls.length > 0
          ? {
              tool_calls: res.toolCalls.map((tc): OpenAIToolCall => ({
                id: tc.id,
                type: "function",
                function: {
                  name: tc.name,
                  arguments: typeof tc.args === "string" ? tc.args : JSON.stringify(tc.args),
                },
              })),
            }
          : {}),
        ...(res.refusal !== undefined && res.refusal !== null ? { refusal: res.refusal } : {}),
      },
      finish_reason: res.finishReason === "error" ? "stop" : (res.finishReason ?? "stop"),
      logprobs: res.logprobs ?? null,
    }],
...(res.usage ? {
        usage: {
          prompt_tokens: res.usage.promptTokens ?? res.usage.inputTokens ?? 0,
          completion_tokens: res.usage.completionTokens ?? res.usage.outputTokens ?? 0,
          total_tokens: res.usage.totalTokens ?? 0,
          ...(res.usage.cachedTokens !== undefined || res.usage.reasoningTokens !== undefined ? {
            prompt_tokens_details: {
              cached_tokens: res.usage.cachedTokens ?? 0,
            },
            completion_tokens_details: {
              reasoning_tokens: res.usage.reasoningTokens ?? 0,
            },
          } : {}),
        },
      } : {}),
      ...(res.systemFingerprint !== undefined ? { system_fingerprint: res.systemFingerprint } : {}),
    };
}

// ── Streaming chunk conversion ──

/** Individual event extracted from a streaming chunk. */
export interface StreamChunkEvent {
  readonly type: string;
  readonly content?: string;
  readonly id?: string;
  readonly name?: string;
  readonly args?: Record<string, unknown>;
  readonly logprobs?: Logprobs;
  readonly reason?: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly reasoningTokens?: number;
}

/**
 * Convert an OpenAI streaming chunk into an array of individual events.
 *
 * Each chunk can contain multiple choices, each with its own deltas. This
 * function extracts each chunk's individual deltas. Use
 * `toModelStreamEvents` (or the provider's `stream()`) for assembled output.
 *
 * @example
 * ```ts
 * for await (const chunk of stream) {
 *   const events = fromOpenAIStreamChunk(chunk);
 *   for (const event of events) { /* handle event *\/ }
 * }
 * ```
 */
export function fromOpenAIStreamChunk(chunk: OpenAIStreamChunk): StreamChunkEvent[] {
  const events: StreamChunkEvent[] = [];

  for (const choice of chunk.choices) {
    // Text content
    if (choice.delta.content !== null && choice.delta.content !== undefined) {
      events.push({ type: "text", content: choice.delta.content });
    }

    // DeepSeek reasoner chain-of-thought (RV-44)
    if (choice.delta.reasoning_content !== null && choice.delta.reasoning_content !== undefined) {
      events.push({ type: "thinking", content: choice.delta.reasoning_content });
    }

    // Tool call deltas
    if (choice.delta.tool_calls) {
      for (const tc of choice.delta.tool_calls) {
        if (tc.id) {
          // New tool call starting
          events.push({
            type: "tool_call",
            id: tc.id,
            ...(tc.function?.name !== undefined ? { name: tc.function.name } : {}),
            ...(tc.function?.arguments ? { args: JSON.parse(tc.function.arguments || "{}") } : {}),
          });
        } else if (tc.function?.arguments) {
          // Arguments delta — consumer needs to accumulate
          events.push({
            type: "tool_call",
            args: { __delta: tc.function.arguments, __index: tc.index },
          });
        }
      }
    }

    // Finish reason
    if (choice.finish_reason !== null) {
      events.push({ type: "finish", reason: choice.finish_reason });
    }

    // Logprobs
    if (choice.logprobs) {
      events.push({ type: "logprobs", logprobs: choice.logprobs });
    }
  }

  // Usage in final chunk
  if (chunk.usage) {
    events.push({
      type: "usage",
      inputTokens: chunk.usage.prompt_tokens,
      outputTokens: chunk.usage.completion_tokens,
      ...(chunk.usage.completion_tokens_details?.reasoning_tokens
        ? { reasoningTokens: chunk.usage.completion_tokens_details.reasoning_tokens }
        : {}),
    });
  }

  return events;
}

// ── Anthropic (helper for provider-anthropic parity) ──

/**
 * Convert Anthropic Messages API message to vinhnt-sdk ChatMessage.
 *
 * Note: Anthropic uses top-level `system` parameter, not role in messages.
 */
export function fromAnthropicMessage(msg: {
  role: "user" | "assistant";
  content: string | Array<{ type: string; text?: string }>;
}): ChatMessage {
  let content: string | readonly ContentPart[];

  if (typeof msg.content === "string") {
    content = msg.content;
  } else {
    content = msg.content.map((p): ContentPart => {
      if (p.type === "text") {
        return { type: "text", text: p.text ?? "" };
      }
      return { type: "text", text: "" };
    });
  }

  return {
    role: msg.role,
    content,
  };
}

// ── Error conversion ──

/**
 * Convert OpenAI error response to vinhnt-sdk VntError.
 *
 * @example
 * ```ts
 * const error = fromOpenAIError({
 *   error: {
 *     message: "Rate limit exceeded",
 *     type: "rate_limit_error",
 *     param: null,
 *     code: "rate_limit_exceeded",
 *   },
 * });
 * // error instanceof RateLimitError === true
 * ```
 */
export function fromOpenAIError(err: OpenAIErrorResponse): VntError {
  // RV-43: the upstream message may echo an API key (e.g. invalid-key errors),
  // so redact it here rather than letting it leak into the VntError/Emitter.
  const { message: rawMessage, type } = err.error;
  const message = redactSecrets(rawMessage);

  switch (type) {
    case "authentication_error":
      return new AuthenticationError(message);
    case "rate_limit_error":
      return new RateLimitError(message);
    case "invalid_request_error":
      return new ValidationError(message);
    case "permission_denied":
      return new PermissionDeniedError("openai", message);
    case "not_found":
      return new NetworkError(message);
    case "server_error":
      return new NetworkError(message);
    default:
      return new NetworkError(message);
  }
}