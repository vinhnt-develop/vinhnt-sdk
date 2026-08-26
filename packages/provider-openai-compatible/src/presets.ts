/**
 * Provider presets — pre-configured providers for DeepSeek, Anthropic, Ollama.
 *
 * These are thin configuration wrappers around {@link OpenAICompatibleProvider}.
 * Each preset defines the base URL, default model, context limit, capabilities,
 * and any provider-specific headers.
 *
 * @example
 * ```ts
 * import { createDeepSeekProvider, createAnthropicProvider, createOllamaProvider } from "@vinhnt-sdk/provider-openai-compatible";
 *
 * const deepseek = createDeepSeekProvider({ apiKey: process.env.DEEPSEEK_API_KEY });
 * const claude = createAnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY });
 * const ollama = createOllamaProvider({ model: "llama3.2-vision" });
 * ```
 */

import type { ModelCapabilities, ModelPricing, ModelProvider } from "@vinhnt-sdk/schema";
import type { CredentialRef, EnvSnapshot } from "@vinhnt-sdk/config";
import { credentialRef, resolveEnv, resolveCredentialFromEnv } from "@vinhnt-sdk/config";
import { OpenAICompatibleProvider } from "./openai-compatible-provider.js";
import type { RetryOptions } from "./error.js";
import type { OpenAICompatibleProviderOptions } from "./openai-compatible-provider.js";

// ── DeepSeek ──

export const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
export const DEEPSEEK_CHAT_MODEL = "deepseek-chat";
export const DEEPSEEK_REASONER_MODEL = "deepseek-reasoner";
export const DEEPSEEK_CONTEXT_LIMIT = 65536;
export const DEEPSEEK_API_KEY_REF: CredentialRef = credentialRef("DEEPSEEK_API_KEY");
export const DEEPSEEK_BASE_URL_REF: CredentialRef = credentialRef("DEEPSEEK_BASE_URL");

const DEEPSEEK_CAPABILITIES: ModelCapabilities = {
  streaming: true,
  toolCalling: true,
  imageInput: false,
  thinking: true,
  structuredOutput: true,
};

export interface DeepSeekProviderOptions {
  readonly apiKey?: string;
  readonly apiKeyRef?: CredentialRef;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly contextLimit?: number;
  readonly capabilities?: Partial<ModelCapabilities>;
  readonly pricing?: ModelPricing;
  readonly retry?: RetryOptions;
  readonly fetchImpl?: typeof fetch;
}

export interface ResolvedDeepSeekConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly contextLimit: number;
  readonly capabilities: ModelCapabilities;
}

export function resolveDeepSeekOptions(
  opts: DeepSeekProviderOptions,
  env?: EnvSnapshot,
): ResolvedDeepSeekConfig {
  let apiKey = opts.apiKey;
  if (!apiKey && env) {
    const resolved = resolveCredentialFromEnv(env, opts.apiKeyRef ?? DEEPSEEK_API_KEY_REF);
    if (resolved) apiKey = resolved.value;
  }
  if (!apiKey) {
    throw new Error(
      `DeepSeek API key required. Provide \`apiKey\` or set the \`${opts.apiKeyRef ?? DEEPSEEK_API_KEY_REF}\` environment variable.`,
    );
  }
  return {
    apiKey,
    baseUrl: opts.baseUrl ?? DEEPSEEK_BASE_URL,
    model: opts.model ?? DEEPSEEK_CHAT_MODEL,
    contextLimit: opts.contextLimit ?? DEEPSEEK_CONTEXT_LIMIT,
    capabilities: { ...DEEPSEEK_CAPABILITIES, ...(opts.capabilities ?? {}) },
  };
}

export function createDeepSeekProvider(opts: DeepSeekProviderOptions): ModelProvider {
  const resolved = resolveDeepSeekOptions(opts, resolveEnv(process.env));
  const buildOpts: OpenAICompatibleProviderOptions = {
    providerName: "deepseek",
    baseUrl: resolved.baseUrl,
    apiKey: resolved.apiKey,
    defaultModel: resolved.model,
    contextLimit: resolved.contextLimit,
    capabilities: resolved.capabilities,
    ...(opts.pricing !== undefined ? { pricing: opts.pricing } : {}),
    ...(opts.retry !== undefined ? { retry: opts.retry } : {}),
    ...(opts.fetchImpl !== undefined ? { fetchImpl: opts.fetchImpl } : {}),
  };
  return new OpenAICompatibleProvider(buildOpts);
}

// ── Anthropic ──

export const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
export const ANTHROPIC_VERSION = "2023-06-01";
export const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-6";
export const ANTHROPIC_CONTEXT_LIMIT = 200000;

const ANTHROPIC_CAPABILITIES: ModelCapabilities = {
  streaming: true,
  toolCalling: true,
  imageInput: true,
  thinking: false,
  structuredOutput: false,
};

export interface AnthropicProviderOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly contextLimit?: number;
  readonly capabilities?: Partial<ModelCapabilities>;
  readonly pricing?: ModelPricing;
  readonly retry?: RetryOptions;
  readonly fetchImpl?: typeof fetch;
}

export function createAnthropicProvider(opts: AnthropicProviderOptions): ModelProvider {
  const buildOpts: OpenAICompatibleProviderOptions = {
    providerName: "anthropic",
    baseUrl: opts.baseUrl ?? ANTHROPIC_BASE_URL,
    apiKey: opts.apiKey,
    defaultModel: opts.model ?? ANTHROPIC_DEFAULT_MODEL,
    contextLimit: opts.contextLimit ?? ANTHROPIC_CONTEXT_LIMIT,
    headers: { "anthropic-version": ANTHROPIC_VERSION },
    capabilities: { ...ANTHROPIC_CAPABILITIES, ...(opts.capabilities ?? {}) },
    ...(opts.pricing !== undefined ? { pricing: opts.pricing } : {}),
    ...(opts.retry !== undefined ? { retry: opts.retry } : {}),
    ...(opts.fetchImpl !== undefined ? { fetchImpl: opts.fetchImpl } : {}),
  };
  return new OpenAICompatibleProvider(buildOpts);
}

// ── Ollama ──

export const OLLAMA_BASE_URL = "http://localhost:11434/v1";
export const OLLAMA_DEFAULT_MODEL = "llama3.2";
export const OLLAMA_CONTEXT_LIMIT = 128000;

const OLLAMA_CAPABILITIES: ModelCapabilities = {
  streaming: true,
  toolCalling: true,
  imageInput: false,
  thinking: false,
  structuredOutput: false,
};

export interface OllamaProviderOptions {
  readonly baseUrl?: string;
  readonly model?: string;
  readonly contextLimit?: number;
  readonly capabilities?: Partial<ModelCapabilities>;
  readonly pricing?: ModelPricing;
  readonly retry?: RetryOptions;
  readonly fetchImpl?: typeof fetch;
}

export function createOllamaProvider(opts: OllamaProviderOptions = {}): ModelProvider {
  const buildOpts: OpenAICompatibleProviderOptions = {
    providerName: "ollama",
    baseUrl: opts.baseUrl ?? OLLAMA_BASE_URL,
    defaultModel: opts.model ?? OLLAMA_DEFAULT_MODEL,
    contextLimit: opts.contextLimit ?? OLLAMA_CONTEXT_LIMIT,
    capabilities: { ...OLLAMA_CAPABILITIES, ...(opts.capabilities ?? {}) },
    ...(opts.pricing !== undefined ? { pricing: opts.pricing } : {}),
    ...(opts.retry !== undefined ? { retry: opts.retry } : {}),
    ...(opts.fetchImpl !== undefined ? { fetchImpl: opts.fetchImpl } : {}),
  };
  return new OpenAICompatibleProvider(buildOpts);
}

// ── Generic factory ──

export interface ProviderPreset {
  name: string;
  baseUrl: string;
  defaultModel: string;
  contextLimit: number;
  capabilities: ModelCapabilities;
  headers?: Record<string, string>;
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
  opts: { apiKey?: string; pricing?: ModelPricing; retry?: RetryOptions; fetchImpl?: typeof fetch } = {},
): ModelProvider {
  return new OpenAICompatibleProvider({
    providerName: preset.name,
    baseUrl: preset.baseUrl,
    defaultModel: preset.defaultModel,
    contextLimit: preset.contextLimit,
    capabilities: preset.capabilities,
    ...(preset.headers !== undefined ? { headers: preset.headers } : {}),
    ...(opts.apiKey !== undefined ? { apiKey: opts.apiKey } : {}),
    ...(opts.pricing !== undefined ? { pricing: opts.pricing } : {}),
    ...(opts.retry !== undefined ? { retry: opts.retry } : {}),
    ...(opts.fetchImpl !== undefined ? { fetchImpl: opts.fetchImpl } : {}),
  });
}
