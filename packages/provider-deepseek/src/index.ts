import { OpenAICompatibleProvider } from "@vinhnt-sdk/provider-openai-compatible";
import type {
  OpenAICompatibleProviderOptions,
} from "@vinhnt-sdk/provider-openai-compatible";
import type { ModelCapabilities, ModelPricing, ModelProvider } from "@vinhnt-sdk/schema";
import type { RetryOptions } from "@vinhnt-sdk/provider-openai-compatible";

/** DeepSeek API base URL (OpenAI-compatible /v1 endpoint). */
export const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

/** Default chat model. */
export const DEEPSEEK_CHAT_MODEL = "deepseek-chat";

/** Reasoning model. */
export const DEEPSEEK_REASONER_MODEL = "deepseek-reasoner";

/** Default context window for `deepseek-chat` (64K tokens). */
export const DEEPSEEK_CONTEXT_LIMIT = 65536;

const DEEPSEEK_CAPABILITIES: ModelCapabilities = {
  streaming: true,
  toolCalling: true,
  imageInput: false,
  thinking: true,
  structuredOutput: true,
};

/** Options for {@link createDeepSeekProvider}. */
export interface DeepSeekProviderOptions {
  /** DeepSeek API key (`sk-...`). */
  readonly apiKey: string;
  /** Base URL override — defaults to {@link DEEPSEEK_BASE_URL}. */
  readonly baseUrl?: string;
  /** Model override — defaults to {@link DEEPSEEK_CHAT_MODEL}. */
  readonly model?: string;
  /** Context window override — defaults to {@link DEEPSEEK_CONTEXT_LIMIT}. */
  readonly contextLimit?: number;
  /** Capability flags override (defaults tuned for DeepSeek models). */
  readonly capabilities?: Partial<ModelCapabilities>;
  readonly pricing?: ModelPricing;
  readonly retry?: RetryOptions;
  readonly fetchImpl?: typeof fetch;
}

/**
 * Create a DeepSeek `ModelProvider` — a thin tip over the OpenAI-compatible
 * base provider: DeepSeek base URL, default model and capability flags only.
 *
 * @example
 * ```ts
 * const provider = createDeepSeekProvider({ apiKey: process.env.DEEPSEEK_API_KEY! });
 * ```
 */
export function createDeepSeekProvider(opts: DeepSeekProviderOptions): ModelProvider {
  const buildOpts: OpenAICompatibleProviderOptions = {
    providerName: "deepseek",
    baseUrl: opts.baseUrl ?? DEEPSEEK_BASE_URL,
    apiKey: opts.apiKey,
    defaultModel: opts.model ?? DEEPSEEK_CHAT_MODEL,
    contextLimit: opts.contextLimit ?? DEEPSEEK_CONTEXT_LIMIT,
    capabilities: { ...DEEPSEEK_CAPABILITIES, ...(opts.capabilities ?? {}) },
    pricing: opts.pricing,
    retry: opts.retry,
    fetchImpl: opts.fetchImpl,
  };
  return new OpenAICompatibleProvider(buildOpts);
}