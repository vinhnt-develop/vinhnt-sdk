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

export { applyPromptCacheShaping, CACHE_CONTROL_EPHEMERAL } from "./prompt-cache.js";
export type { PromptCacheShaping, PromptCacheControlOptions, ShapedPrompt } from "./prompt-cache.js";

export { createSSEStream, toModelStreamEvents } from "./sse.js";

export { fromOpenAIMessage, toOpenAIMessage, fromOpenAIResponse, toOpenAIResponse, fromOpenAIStreamChunk, fromOpenAIError } from "./convert.js";

export {
  UpstreamError,
  RETRYABLE_STATUSES,
  BILLING_ERROR_CODES,
  isBillingError,
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
export type { OpenAIMessage, OpenAIContentPart, OpenAIToolCall, OpenAIResponse, OpenAIChoice, OpenAIStreamChunk, OpenAIStreamChoice, OpenAIErrorResponse } from "@vinhnt-sdk/schema";

// ── Provider presets (generic) ──

export { createProviderFromPreset } from "./presets.js";
export type { ProviderPreset } from "./presets.js";