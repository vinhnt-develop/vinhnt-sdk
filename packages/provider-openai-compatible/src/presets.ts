/**
 * Provider presets — generic factory for OpenAI-compatible providers.
 *
 * This package is intentionally provider-agnostic. It only exports the thin
 * {@link OpenAICompatibleProvider} wrapper and a generic preset factory.
 * Provider-specific presets (DeepSeek, Anthropic, Google, Ollama, …) belong in
 * the application layer or a separate presets package so consumers can extend
 * without forking this library.
 *
 * @example
 * ```ts
 * import { createProviderFromPreset } from "@vinhnt-sdk/provider-openai-compatible";
 *
 * const google = createProviderFromPreset(
 *   {
 *     name: "google",
 *     baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
 *     defaultModel: "gemini-2.5-flash",
 *     contextLimit: 1048576,
 *     capabilities: { streaming: true, toolCalling: true, thinking: true },
 *   },
 *   { apiKey: process.env.GOOGLE_API_KEY }
 * );
 * ```
 */

import type { ModelCapabilities, ModelPricing, ModelProvider } from "@vinhnt-sdk/schema";
import type { RetryOptions } from "./error.js";
import { OpenAICompatibleProvider } from "./openai-compatible-provider.js";

// ── Generic factory ──

export interface ProviderPreset {
  name: string;
  baseUrl: string;
  defaultModel: string;
  contextLimit: number;
  capabilities: ModelCapabilities;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retry?: RetryOptions;
  authStyle?: 'bearer' | 'query' | 'header-x-goog' | 'header-x-api-key';
  nativeChatUrl?: string;
}

/**
 * Create a provider from a generic preset configuration.
 *
 * @example
 * ```ts
 * const custom = createProviderFromPreset({
 *   name: "my-llm",
 *   baseUrl: "https://my-llm.example.com/v1",
 *   defaultModel: "my-model",
 *   contextLimit: 32000,
 *   capabilities: { streaming: true, toolCalling: true },
 * }, { apiKey: "sk-..." });
 * ```
 */
export function createProviderFromPreset(
  preset: ProviderPreset,
  opts: { apiKey?: string; pricing?: ModelPricing; retry?: RetryOptions; timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): ModelProvider {
  return new OpenAICompatibleProvider({
    providerName: preset.name,
    baseUrl: preset.baseUrl,
    defaultModel: preset.defaultModel,
    contextLimit: preset.contextLimit,
    capabilities: preset.capabilities,
    ...(preset.headers !== undefined ? { headers: preset.headers } : {}),
    ...(preset.timeoutMs !== undefined ? { timeoutMs: preset.timeoutMs } : {}),
    ...(preset.authStyle !== undefined ? { authStyle: preset.authStyle } : {}),
    ...(preset.nativeChatUrl !== undefined ? { nativeChatUrl: preset.nativeChatUrl } : {}),
    ...(opts.apiKey !== undefined ? { apiKey: opts.apiKey } : {}),
    ...(opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
    ...(opts.pricing !== undefined ? { pricing: opts.pricing } : {}),
    ...(opts.retry !== undefined ? { retry: opts.retry } : {}),
    ...(opts.fetchImpl !== undefined ? { fetchImpl: opts.fetchImpl } : {}),
  });
}
