/**
 * Model types — core abstractions for LLM interaction.
 *
 * These types are shared across all packages that need to describe
 * model requests, responses, and providers.
 */

// ── Tool types ──

/** Minimal tool definition for schema-level typing (avoids circular dep with core/tool). */
export interface ToolDefinitionLike {
  readonly id: string;
  readonly name?: string;
  readonly description: string;
  readonly risk: string;
  readonly inputSchema?: unknown;
}

// ── Message types ──

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly args: Record<string, unknown>;
}

export type MessageContentPart =
  | { type: "text"; text: string }
  | { type: "image"; image: string; mimeType?: string };

export interface ChatMessage {
  readonly role: string;
  readonly content: string;
  readonly contentParts?: readonly MessageContentPart[];
  readonly toolCallId?: string;
  readonly toolCalls?: readonly ToolCall[];
}

// ── Request / Response ──

export interface ModelRequest {
  readonly messages: readonly ChatMessage[];
  readonly tools: readonly ToolDefinitionLike[];
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly topP?: number;
  readonly stopSequences?: readonly string[];
  readonly thinkingBudget?: number;
  readonly thinkingPrompt?: string;
  readonly providerOptions?: Record<string, unknown>;
}

export interface ModelResponse {
  readonly content: string;
  readonly toolCalls?: readonly { id: string; name: string; args: unknown }[];
  readonly usage?: { inputTokens: number; outputTokens: number };
}

export type ModelStreamEvent =
  | { type: "text"; content: string }
  | { type: "tool_call"; id: string; name: string; args: Record<string, unknown> }
  | { type: "usage"; inputTokens: number; outputTokens: number }
  | { type: "done" }
  | { type: "error"; error: string };

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
  stream(request: ModelRequest, signal?: AbortSignal): AsyncIterable<ModelStreamEvent>;
  countTokens?(text: string): number;
}

export interface ModelRegistry {
  register(id: string, provider: ModelProvider): void;
  get(id: string): ModelProvider | undefined;
  list(): readonly { id: string; provider: ModelProvider }[];
}
