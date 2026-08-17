import { OpenAICompatibleProvider } from "@vinhnt-sdk/provider-openai-compatible";
import type {
  OpenAICompatibleProviderOptions,
  RetryOptions,
} from "@vinhnt-sdk/provider-openai-compatible";
import type { ModelCapabilities, ModelPricing, ModelProvider } from "@vinhnt-sdk/schema";

/**
 * Claude OpenAI-compatible endpoint base URL. The compatibility layer targets
 * `POST /v1/chat/completions` and requires the `anthropic-version` header.
 */
export const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";

/** Anthropic API version header value. */
export const ANTHROPIC_VERSION = "2023-06-01";

/** Default Claude model for the OpenAI-compatible layer. */
export const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-6";

/** Default context window for the default Claude model (200K tokens). */
export const ANTHROPIC_CONTEXT_LIMIT = 200000;

const ANTHROPIC_CAPABILITIES: ModelCapabilities = {
  streaming: true,
  toolCalling: true,
  imageInput: true,
  thinking: false,
  structuredOutput: false,
};

/** Options for {@link createAnthropicProvider}. */
export interface AnthropicProviderOptions {
  /** Anthropic API key (`sk-ant-...`). */
  readonly apiKey: string;
  /** Base URL override — defaults to {@link ANTHROPIC_BASE_URL}. */
  readonly baseUrl?: string;
  /** Model override — defaults to {@link ANTHROPIC_DEFAULT_MODEL}. */
  readonly model?: string;
  /** Context window override — defaults to {@link ANTHROPIC_CONTEXT_LIMIT}. */
  readonly contextLimit?: number;
  /** Capability flags override (defaults tune the OpenAI-compat layer, which does not expose thinking or structured outputs). */
  readonly capabilities?: Partial<ModelCapabilities>;
  readonly pricing?: ModelPricing;
  readonly retry?: RetryOptions;
  readonly fetchImpl?: typeof fetch;
}

/**
 * Create an Anthropic (Claude) `ModelProvider` — a thin tip over the
 * OpenAI-compatible base provider, pointed at the Claude OpenAI-compatible
 * endpoint with the required `anthropic-version` header.
 *
 * @example
 * ```ts
 * const provider = createAnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY! });
 * ```
 */
export function createAnthropicProvider(opts: AnthropicProviderOptions): ModelProvider {
  const buildOpts: OpenAICompatibleProviderOptions = {
    providerName: "anthropic",
    baseUrl: opts.baseUrl ?? ANTHROPIC_BASE_URL,
    apiKey: opts.apiKey,
    defaultModel: opts.model ?? ANTHROPIC_DEFAULT_MODEL,
    contextLimit: opts.contextLimit ?? ANTHROPIC_CONTEXT_LIMIT,
    headers: { "anthropic-version": ANTHROPIC_VERSION },
    capabilities: { ...ANTHROPIC_CAPABILITIES, ...(opts.capabilities ?? {}) },
    pricing: opts.pricing,
    retry: opts.retry,
    fetchImpl: opts.fetchImpl,
  };
  return new OpenAICompatibleProvider(buildOpts);
}