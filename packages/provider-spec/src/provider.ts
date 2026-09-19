/**
 * Provider V1 Specification.
 *
 * A provider is a factory that creates language model instances.
 * Inspired by Vercel AI SDK's ProviderV4 pattern.
 */

import type { LanguageModelV1 } from "./language-model.js";

/**
 * Provider interface that provider packages must implement.
 *
 * @example
 * ```typescript
 * const openaiProvider: ProviderV1 = {
 *   languageModel: (modelId) => new OpenAIModel(modelId),
 *   embeddingModel: (modelId) => new OpenAIEmbedding(modelId),
 * };
 * ```
 */
export interface ProviderV1 {
  /** Provider identifier (e.g., "openai", "anthropic"). */
  readonly provider: string;

  /**
   * Create a language model instance.
   * @param modelId - The model identifier (e.g., "gpt-4o", "claude-sonnet-4-5")
   */
  languageModel(modelId: string): LanguageModelV1;

  /**
   * Create an embedding model instance (optional).
   * @param modelId - The model identifier (e.g., "text-embedding-3-small")
   */
  embeddingModel?(modelId: string): unknown;

  /**
   * Create an image model instance (optional).
   * @param modelId - The model identifier
   */
  imageModel?(modelId: string): unknown;
}
