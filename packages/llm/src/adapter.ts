/**
 * LLM Adapter — the abstract contract every provider must implement.
 *
 * An adapter is the minimal interface for streaming model calls.
 * The only required method is `stream()`. Everything else has defaults.
 *
 * This is the "Service Definition" in the capability seam pattern:
 *   Service Definition (LlmAdapter) → Provider (concrete) → Consumer (agent loop)
 *
 * @example
 * ```ts
 * import type { LlmAdapter, GenerateOptions, StreamChunk } from "@vinhnt-sdk/llm";
 *
 * class MyAdapter implements LlmAdapter {
 *   async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
 *     // Call your LLM API here
 *     yield { type: "text", content: "Hello" };
 *     yield { type: "finish", reason: "stop" };
 *   }
 * }
 * ```
 */

import type {
  ModelRequest,
  ModelStreamEvent,
  ModelPricing,
  ModelCapabilities,
} from "@vinhnt-sdk/schema";

// ── Generate Options (what the adapter receives) ──

/**
 * Options for a model generation call.
 * This is the adapter's view of the request — provider-owned fields
 * (model, apiKey, baseUrl) are resolved before reaching the adapter.
 */
export interface GenerateOptions {
  /** The provider/model identifier (e.g., "deepseek-chat", "gpt-4o"). */
  readonly model: string;
  /** Conversation messages. */
  readonly messages: readonly { readonly role: string; readonly content: string | readonly unknown[]; readonly [key: string]: unknown }[];
  /** Tool definitions (OpenAI function calling format). */
  readonly tools?: readonly { readonly type: "function"; readonly function: { readonly name: string; readonly description: string; readonly parameters?: unknown; readonly strict?: boolean } }[];
  /** Tool choice control. */
  readonly toolChoice?: "auto" | "required" | "none" | { readonly type: "function"; readonly function: { readonly name: string } };
  /** Max completion tokens. */
  readonly maxTokens?: number;
  /** Temperature (0-2). */
  readonly temperature?: number;
  /** Top-p sampling. */
  readonly topP?: number;
  /** Stop sequences. */
  readonly stop?: readonly string[];
  /** Reasoning effort for o-series models. */
  readonly reasoningEffort?: string;
  /** Stream options (include_usage, etc.). */
  readonly streamOptions?: { readonly includeUsage?: boolean };
  /** Provider-specific options passthrough. */
  readonly providerOptions?: Record<string, unknown>;
}

// ── Stream Chunk Protocol ──

/**
 * Raw streaming chunk emitted by an adapter.
 * This is the adapter → runtime protocol.
 */
export type StreamChunk =
  | { readonly type: "text"; readonly content: string }
  | { readonly type: "reasoning"; readonly content: string }
  | { readonly type: "tool-call"; readonly id: string; readonly name: string; readonly arguments: string }
  | { readonly type: "usage"; readonly promptTokens: number; readonly completionTokens: number; readonly reasoningTokens?: number }
  | { readonly type: "finish"; readonly reason: "stop" | "tool-calls" | "max-tokens" | "error" | "aborted" }
  | { readonly type: "error"; readonly error: string };

// ── LlmAdapter Interface ──

/**
 * Provider retry policy — captured at registration time.
 */
export interface RetryPolicy {
  /** Maximum number of retries. Default: 2. */
  readonly maxRetries?: number;
  /** Base delay in ms for exponential backoff. Default: 1000. */
  readonly baseDelayMs?: number;
  /** Maximum delay cap in ms. Default: 30000. */
  readonly maxDelayMs?: number;
  /** HTTP status codes that are retryable. */
  readonly retryableStatuses?: readonly number[];
}

/**
 * Provider metadata — returned by `providerInfo()`.
 */
export interface ProviderInfo {
  /** Provider identifier (e.g., "deepseek", "openai", "anthropic"). */
  readonly id: string;
  /** Human-readable display name. */
  readonly name: string;
}

/**
 * Resolved model info — returned by `resolveModel()`.
 */
export interface ResolvedModelInfo {
  /** Provider identifier. */
  readonly provider: string;
  /** Model identifier. */
  readonly id: string;
  /** Human-readable model name. */
  readonly name: string;
  /** Context window in tokens. */
  readonly contextWindow?: number;
  /** Model capabilities. */
  readonly capabilities?: Partial<ModelCapabilities>;
}

/**
 * Abstract LLM adapter — the Service Definition for model providers.
 *
 * Every provider implements this interface. The only required method is `stream()`.
 * Everything else has sensible defaults.
 *
 * Adapters are stateless — all configuration is captured at registration time.
 * The adapter receives only the `GenerateOptions` per call.
 */
export abstract class LlmAdapter {
  /**
   * Stream one model call as raw chunks (token-level deltas).
   * This is the ONLY required method.
   */
  abstract stream(options: GenerateOptions, signal?: AbortSignal): AsyncIterable<StreamChunk>;

  /**
   * Provider metadata — used for display and logging.
   * Default: `{ id: "unknown", name: "Unknown Provider" }`.
   */
  providerInfo(provider: string): ProviderInfo {
    return { id: provider, name: provider };
  }

  /**
   * Provider-specific retry policy — captured at registration time.
   * Default: undefined (use global defaults).
   */
  providerRetryPolicy(provider: string): RetryPolicy | undefined {
    return undefined;
  }

  /**
   * List available models for a provider.
   * Default: empty array.
   */
  async listModels(provider: string): Promise<readonly ResolvedModelInfo[]> {
    return [];
  }

  /**
   * Resolve a model identifier to full info.
   * Default: returns the model id as-is.
   */
  async resolveModel(provider: string, model: string, signal?: AbortSignal): Promise<ResolvedModelInfo> {
    return { provider, id: model, name: model };
  }
}
