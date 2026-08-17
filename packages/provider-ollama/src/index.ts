import { OpenAICompatibleProvider } from "@vinhnt-sdk/provider-openai-compatible";
import type {
  OpenAICompatibleProviderOptions,
  RetryOptions,
} from "@vinhnt-sdk/provider-openai-compatible";
import type { ModelCapabilities, ModelPricing, ModelProvider } from "@vinhnt-sdk/schema";

/** Ollama OpenAI-compatible endpoint base URL (local server). */
export const OLLAMA_BASE_URL = "http://localhost:11434/v1";

/** Default model — require the user to `ollama pull` it first. */
export const OLLAMA_DEFAULT_MODEL = "llama3.2";

/** Default context window for the default model. */
export const OLLAMA_CONTEXT_LIMIT = 128000;

const OLLAMA_CAPABILITIES: ModelCapabilities = {
  streaming: true,
  toolCalling: true,
  imageInput: true,
  thinking: true,
  structuredOutput: true,
};

/** Options for {@link createOllamaProvider}. */
export interface OllamaProviderOptions {
  /** Base URL override — defaults to {@link OLLAMA_BASE_URL}. */
  readonly baseUrl?: string;
  /** Model override — defaults to {@link OLLAMA_DEFAULT_MODEL}. */
  readonly model?: string;
  /** Context window override — defaults to {@link OLLAMA_CONTEXT_LIMIT}. */
  readonly contextLimit?: number;
  /** Capability flags override (defaults assume a modern multimodal Ollama model). */
  readonly capabilities?: Partial<ModelCapabilities>;
  readonly pricing?: ModelPricing;
  readonly retry?: RetryOptions;
  readonly fetchImpl?: typeof fetch;
}

/**
 * Create an Ollama `ModelProvider` — a thin tip over the OpenAI-compatible
 * base provider pointed at a local Ollama server (no API key).
 *
 * @example
 * ```ts
 * const provider = createOllamaProvider({ model: "llama3.2-vision" });
 * ```
 */
export function createOllamaProvider(opts: OllamaProviderOptions = {}): ModelProvider {
  const buildOpts: OpenAICompatibleProviderOptions = {
    providerName: "ollama",
    baseUrl: opts.baseUrl ?? OLLAMA_BASE_URL,
    defaultModel: opts.model ?? OLLAMA_DEFAULT_MODEL,
    contextLimit: opts.contextLimit ?? OLLAMA_CONTEXT_LIMIT,
    capabilities: { ...OLLAMA_CAPABILITIES, ...(opts.capabilities ?? {}) },
    pricing: opts.pricing,
    retry: opts.retry,
    fetchImpl: opts.fetchImpl,
  };
  return new OpenAICompatibleProvider(buildOpts);
}