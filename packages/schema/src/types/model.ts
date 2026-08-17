/**
 * Model types — core abstractions for LLM interaction.
 *
 * These types are shared across all packages that need to describe
 * model requests, responses, and providers.
 *
 * Aligned with OpenAI Chat Completion format for maximum compatibility
 * with OpenAI, Anthropic, Qwen, GLM, Kimi, Ollama, LM Studio, etc.
 */

// ── Known constants ──

/** Known finish reasons from OpenAI spec. Use as reference, not exhaustive. */
export const KNOWN_FINISH_REASONS = ["stop", "length", "tool_calls", "content_filter", "function_call", "error"] as const;

/** Known reasoning effort levels from OpenAI spec. Use as reference, not exhaustive. */
export const KNOWN_REASONING_EFFORTS = ["low", "medium", "high"] as const;

// ── Content parts (OpenAI-compatible) ──

/** Multimodal content part — matches OpenAI's content part format. */
export type ContentPart =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "image_url"; readonly image_url: { readonly url: string; readonly detail?: "auto" | "low" | "high" } }
  | { readonly type: "input_audio"; readonly input_audio: { readonly data: string; readonly format: "wav" | "mp3" } };

/**
 * Extract plain text from a ChatMessage.content value.
 * Works with both string and ContentPart[] formats.
 */
export function getTextContent(content: string | readonly ContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((p): p is { readonly type: "text"; readonly text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

// ── Usage ──

/** Token usage information — aligned with OpenAI format with backward-compatible aliases. */
export interface ModelUsage {
  /** OpenAI: prompt_tokens */
  readonly promptTokens: number;
  /** OpenAI: completion_tokens */
  readonly completionTokens: number;
  readonly totalTokens?: number;
  /** @deprecated Use promptTokens instead */
  readonly inputTokens?: number;
  /** @deprecated Use completionTokens instead */
  readonly outputTokens?: number;
  /** OpenAI: prompt_tokens_details.cached_tokens */
  readonly cachedTokens?: number;
  /** OpenAI: completion_tokens_details.reasoning_tokens */
  readonly reasoningTokens?: number;
  /** OpenAI: prompt_tokens_details.audio_tokens + completion_tokens_details.audio_tokens */
  readonly audioTokens?: number;
}

// ── Logprobs ──

/** Log probability for a single token. */
export interface TokenLogprob {
  readonly token: string;
  readonly logprob: number;
  readonly bytes?: readonly number[];
  readonly topLogprobs?: readonly TopLogprob[];
}

/** Top log probability alternative. */
export interface TopLogprob {
  readonly token: string;
  readonly logprob: number;
  readonly bytes?: readonly number[];
}

/** Log probabilities for a choice. */
export interface Logprobs {
  readonly content?: readonly TokenLogprob[] | null;
  readonly refusal?: readonly TokenLogprob[] | null;
}

// ── Response format (Structured Outputs) ──

/**
 * Response format specification — controls output format (JSON mode, JSON Schema).
 *
 * @example
 * ```ts
 * // JSON mode — model outputs valid JSON
 * const jsonMode: ResponseFormat = { type: "json_object" };
 *
 * // JSON Schema mode — model outputs structured data matching schema
 * const schemaMode: ResponseFormat = {
 *   type: "json_schema",
 *   jsonSchema: {
 *     name: "weather",
 *     schema: {
 *       type: "object",
 *       properties: { temp: { type: "number" } },
 *       required: ["temp"],
 *     },
 *     strict: true,
 *   },
 * };
 * ```
 */
export type ResponseFormat =
  | { readonly type: "json_object" }
  | { readonly type: "json_schema"; readonly jsonSchema: ResponseFormatJsonSchema };

/** JSON Schema configuration for structured outputs. */
export interface ResponseFormatJsonSchema {
  readonly name: string;
  readonly schema: unknown;
  readonly strict?: boolean;
}

// ── Tool choice ──

/**
 * Controls tool calling behavior — auto, required, none, or force specific tool.
 *
 * @example
 * ```ts
 * // Auto — model decides whether to call tools
 * const auto: ToolChoice = "auto";
 *
 * // Required — model must call at least one tool
 * const required: ToolChoice = "required";
 *
 * // None — model must not call any tools
 * const none: ToolChoice = "none";
 *
 * // Force specific tool
 * const force: ToolChoice = { type: "function", name: "get_weather" };
 * ```
 */
export type ToolChoice =
  | "auto"
  | "required"
  | "none"
  | { readonly type: "function"; readonly name: string };

// ── Stream options ──

/**
 * Options for streaming responses.
 *
 * @example
 * ```ts
 * // Include usage in final chunk
 * const opts: StreamOptions = { includeUsage: true };
 * ```
 */
export interface StreamOptions {
  /** Include token usage in the final stream chunk. */
  readonly includeUsage?: boolean;
}

// ── Tool types ──

/** Minimal tool definition for schema-level typing (avoids circular dep with core/tool). */
export interface ToolDefinitionLike {
  readonly id: string;
  readonly name?: string;
  readonly description: string;
  readonly risk: string;
  /** If true, tool prompts its own permission via `ctx.ask` (single approval path). */
  readonly selfApproving?: boolean;
  readonly inputSchema?: unknown;
  /** OpenAI tool format — for direct API passthrough (optional). */
  readonly type?: "function";
  readonly function?: {
    readonly name: string;
    readonly description: string;
    readonly parameters?: unknown;
    /** OpenAI Structured Outputs — ensures arguments match schema exactly. */
    readonly strict?: boolean;
  };
}

// ── Message types ──

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly args: Record<string, unknown>;
}

/** Tool call result in OpenAI format. */
export interface ToolCallResult {
  readonly id: string;
  readonly type: "function";
  readonly function: { readonly name: string; readonly arguments: string };
}

/** @deprecated Use ContentPart instead. Kept for backward compatibility. */
export type MessageContentPart =
  | { type: "text"; text: string }
  | { type: "image"; image: string; mimeType?: string };

/** Chat message roles — OpenAI-compatible union (incl. `developer` and `function`). */
export type ChatMessageRole =
  | "system"
  | "user"
  | "assistant"
  | "tool"
  | "developer"
  | "function";

export interface ChatMessage {
  readonly role: ChatMessageRole;
  readonly content: string | readonly ContentPart[];
  readonly toolCallId?: string;
  readonly toolCalls?: readonly ToolCall[];
  /** OpenAI: refusal message when Structured Outputs safety triggers. */
  readonly refusal?: string;
}

// ── Request / Response ──

/**
 * Model request — parameters for LLM generation.
 *
 * Aligned with OpenAI Chat Completion format. All fields are optional
 * except `messages` and `tools`.
 *
 * @example
 * ```ts
 * const request: ModelRequest = {
 *   messages: [{ role: "user", content: "What's the weather?" }],
 *   tools: [weatherTool],
 *   toolChoice: "auto",
 *   responseFormat: { type: "json_object" },
 *   maxCompletionTokens: 1024,
 *   temperature: 0.7,
 * };
 * ```
 */
export interface ModelRequest {
  readonly messages: readonly ChatMessage[];
  readonly tools: readonly ToolDefinitionLike[];
  readonly maxTokens?: number;
  /** OpenAI: max_completion_tokens — required for o-series models. Takes precedence over maxTokens. */
  readonly maxCompletionTokens?: number;
  readonly temperature?: number;
  readonly topP?: number;
  readonly stopSequences?: readonly string[];
  readonly thinkingBudget?: number;
  readonly thinkingPrompt?: string;
  readonly providerOptions?: Record<string, unknown>;
  /** System prompt — Anthropic-style top-level parameter (optional). */
  readonly system?: string;
  /** OpenAI: tool_choice — controls tool calling behavior. */
  readonly toolChoice?: ToolChoice;
  /** OpenAI: parallel_tool_calls — whether to allow parallel tool calls (default: true). */
  readonly parallelToolCalls?: boolean;
  /** OpenAI: response_format — controls output format (JSON mode, JSON Schema). */
  readonly responseFormat?: ResponseFormat;
  /** OpenAI: stream_options — options for streaming (e.g., include_usage). */
  readonly streamOptions?: StreamOptions;
  /** OpenAI: presence_penalty — penalizes tokens based on presence (-2 to 2). */
  readonly presencePenalty?: number;
  /** OpenAI: frequency_penalty — penalizes tokens based on frequency (-2 to 2). */
  readonly frequencyPenalty?: number;
  /** OpenAI: logit_bias — token-level logit biases (-100 to 100). */
  readonly logitBias?: Record<string, number>;
  /** OpenAI: seed — for reproducible outputs. */
  readonly seed?: number;
  /** OpenAI: user — end-user identifier for abuse monitoring. */
  readonly user?: string;
  /** OpenAI: logprobs — return log probabilities of output tokens. */
  readonly logprobs?: boolean;
  /** OpenAI: top_logprobs — number of top logprobs per token (0-20). */
  readonly topLogprobs?: number;
  /** OpenAI: reasoning_effort — controls reasoning token budget for o-series models. */
  readonly reasoningEffort?: string;
}

/**
 * Model response — result from LLM generation.
 *
 * Aligned with OpenAI Chat Completion response format.
 *
 * @example
 * ```ts
 * const response: ModelResponse = {
 *   content: "The weather is sunny.",
 *   finishReason: "stop",
 *   usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
 *   id: "chatcmpl-123",
 *   model: "gpt-4",
 *   created: 1234567890,
 * };
 * ```
 */
export interface ModelResponse {
  readonly content: string;
  readonly toolCalls?: readonly { id: string; name: string; args: unknown }[];
  readonly finishReason?: string;
  readonly usage?: ModelUsage;
  /** OpenAI passthrough fields (optional). */
  readonly id?: string;
  readonly model?: string;
  /** OpenAI: created — Unix timestamp of when the completion was created. */
  readonly created?: number;
  /** OpenAI: system_fingerprint — backend configuration fingerprint. */
  readonly systemFingerprint?: string;
  /** OpenAI: logprobs — token log probabilities (if requested). */
  readonly logprobs?: Logprobs | null;
  /** OpenAI: refusal — model's refusal message (Structured Outputs safety). */
  readonly refusal?: string;
}

export type ModelStreamEvent =
  | { type: "text"; content: string }
  | { type: "tool_call"; id: string; name: string; args: Record<string, unknown> }
  | { type: "usage"; inputTokens: number; outputTokens: number }
  | { type: "finish"; reason: string }
  | { type: "done" }
  | { type: "error"; error: string }
  | { type: "logprobs"; logprobs: Logprobs };

// ── Pricing ──

export interface ModelPricing {
  readonly input: number;
  readonly output: number;
  readonly cacheRead?: number;
  readonly cacheWrite?: number;
}

// ── Capabilities ──

export interface ModelCapabilities {
  readonly streaming: boolean;
  readonly toolCalling: boolean;
  readonly imageInput: boolean;
  readonly thinking: boolean;
  readonly structuredOutput: boolean;
}

// ── Provider ──

export interface ModelProvider {
  readonly provider: string;
  readonly model: string;
  readonly contextLimit: number | undefined;
  readonly capabilities: ModelCapabilities;
  readonly pricing?: ModelPricing;
  generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse>;
  /**
   * Streaming implementation — OPTIONAL. A provider that omits `stream`
   * is non-streaming: the kernel falls back to `generate`. This keeps the
   * contract honest — a provider never advertises streaming it can't do.
   */
  stream?(request: ModelRequest, signal?: AbortSignal): AsyncIterable<ModelStreamEvent>;
  countTokens?(text: string): number;
}

export interface ModelRegistry {
  register(id: string, provider: ModelProvider): void;
  get(id: string): ModelProvider | undefined;
  list(): readonly { id: string; provider: ModelProvider }[];
}
