/**
 * @vinhnt-sdk/provider-openai-compatible
 *
 * OpenAI-compatible model provider implemented on raw `fetch` — zero AI SDK.
 * Streaming via SSE, retry/backoff with `ERR_UPSTREAM_*` errors.
 *
 * @module provider-openai-compatible
 * @packageDocumentation
 */

export { OpenAICompatibleProvider } from "./openai-compatible-provider.js";
export type { OpenAICompatibleProviderOptions } from "./openai-compatible-provider.js";

export { buildRequest } from "./build-request.js";
export type { OpenAICompatibleRequestBody, BuildRequestOptions } from "./build-request.js";

export { createSSEStream, toModelStreamEvents } from "./sse.js";

export {
  fromOpenAIMessage,
  toOpenAIMessage,
  fromOpenAIResponse,
  toOpenAIResponse,
  fromOpenAIStreamChunk,
  fromOpenAIError,
  fromAnthropicMessage,
} from "./convert.js";

export {
  UpstreamError,
  RETRYABLE_STATUSES,
  DEFAULT_RETRY_OPTIONS,
  parseRetryAfterMs,
  computeBackoffMs,
  retryableStatusSet,
  extractErrorMessage,
  abortableSleep,
  waitForRetry,
  toUpstreamError,
} from "./error.js";
export type { RetryOptions } from "./error.js";

// Re-export the wire-format types for convenience (single import site).
export type {
  OpenAIMessage,
  OpenAIContentPart,
  OpenAIToolCall,
  OpenAIResponse,
  OpenAIChoice,
  OpenAIUsage,
  OpenAIStreamChunk,
  OpenAIStreamChoice,
  OpenAIStreamToolCallDelta,
  OpenAIErrorResponse,
} from "@vinhnt-sdk/schema";

// ── Provider presets (DeepSeek, Anthropic, Ollama) ──

export {
  createDeepSeekProvider,
  createAnthropicProvider,
  createOllamaProvider,
  createProviderFromPreset,
  resolveDeepSeekOptions,
  DEEPSEEK_BASE_URL,
  DEEPSEEK_CHAT_MODEL,
  DEEPSEEK_REASONER_MODEL,
  DEEPSEEK_CONTEXT_LIMIT,
  DEEPSEEK_API_KEY_REF,
  DEEPSEEK_BASE_URL_REF,
  ANTHROPIC_BASE_URL,
  ANTHROPIC_VERSION,
  ANTHROPIC_DEFAULT_MODEL,
  ANTHROPIC_CONTEXT_LIMIT,
  OLLAMA_BASE_URL,
  OLLAMA_DEFAULT_MODEL,
  OLLAMA_CONTEXT_LIMIT,
} from "./presets.js";
export type {
  DeepSeekProviderOptions,
  ResolvedDeepSeekConfig,
  AnthropicProviderOptions,
  OllamaProviderOptions,
  ProviderPreset,
} from "./presets.js";