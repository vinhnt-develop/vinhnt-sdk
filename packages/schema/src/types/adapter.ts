/**
 * Adapter layer — OpenAI Chat Completion wire-format types.
 *
 * INTERFACE-ONLY. The conversion functions live in
 * `@vinhnt-sdk/provider-openai-compatible` (see `convert.ts`); this module
 * keeps the typing contract with zero logic so schema stays dependency-free.
 *
 * Compatible providers: OpenAI, Anthropic, Qwen, GLM, Kimi, Ollama,
 * LM Studio, etc.
 */

import type { Logprobs } from "./model.js";

// ── OpenAI message format ──

/** OpenAI Chat Completion message format. */
export interface OpenAIMessage {
  readonly role: "system" | "developer" | "user" | "assistant" | "tool";
  readonly content: string | readonly OpenAIContentPart[] | null;
  readonly name?: string;
  readonly tool_call_id?: string;
  readonly tool_calls?: readonly OpenAIToolCall[];
  readonly refusal?: string | null;
}

/** OpenAI content part. */
export interface OpenAIContentPart {
  readonly type: "text" | "image_url" | "input_audio";
  readonly text?: string;
  readonly image_url?: { readonly url: string; readonly detail?: string };
  readonly input_audio?: { readonly data: string; readonly format: string };
}

/** OpenAI tool call in message. */
export interface OpenAIToolCall {
  readonly id: string;
  readonly type: "function";
  readonly function: { readonly name: string; readonly arguments: string };
}

// ── OpenAI response format ──

/** OpenAI usage breakdown. */
export interface OpenAIUsage {
  readonly prompt_tokens: number;
  readonly completion_tokens: number;
  readonly total_tokens: number;
  readonly prompt_tokens_details?: {
    readonly cached_tokens?: number;
    readonly text_tokens?: number;
    readonly audio_tokens?: number;
  };
  readonly completion_tokens_details?: {
    readonly reasoning_tokens?: number;
    readonly audio_tokens?: number;
  };
}

/** OpenAI Chat Completion response format. */
export interface OpenAIResponse {
  readonly id: string;
  readonly object: "chat.completion";
  readonly created: number;
  readonly model: string;
  readonly choices: readonly OpenAIChoice[];
  readonly usage?: OpenAIUsage;
  readonly system_fingerprint?: string;
  readonly service_tier?: string;
}

/** OpenAI choice in response. */
export interface OpenAIChoice {
  readonly index: number;
  readonly message: {
    readonly role: "assistant";
    readonly content: string | null;
    readonly tool_calls?: readonly OpenAIToolCall[];
    readonly refusal?: string | null;
  };
  readonly finish_reason: string | null;
  readonly logprobs?: Logprobs | null;
}

// ── OpenAI streaming chunk format ──

/** OpenAI streaming chunk. */
export interface OpenAIStreamChunk {
  readonly id: string;
  readonly object: "chat.completion.chunk";
  readonly created: number;
  readonly model: string;
  readonly choices: readonly OpenAIStreamChoice[];
  readonly system_fingerprint?: string;
  readonly service_tier?: string;
  readonly usage?: OpenAIUsage | null;
}

/** OpenAI streaming choice. */
export interface OpenAIStreamChoice {
  readonly index: number;
  readonly delta: {
    readonly role?: "assistant";
    readonly content?: string | null;
    readonly tool_calls?: readonly OpenAIStreamToolCallDelta[];
    readonly refusal?: string | null;
  };
  readonly finish_reason: string | null;
  readonly logprobs?: Logprobs | null;
}

/** OpenAI streaming tool call delta. */
export interface OpenAIStreamToolCallDelta {
  readonly index: number;
  readonly id?: string;
  readonly type?: "function";
  readonly function?: {
    readonly name?: string;
    readonly arguments?: string;
  };
}

// ── OpenAI error format ──

/** OpenAI error response. */
export interface OpenAIErrorResponse {
  readonly error: {
    readonly message: string;
    readonly type: string;
    readonly param: string | null;
    readonly code: string | null;
  };
}