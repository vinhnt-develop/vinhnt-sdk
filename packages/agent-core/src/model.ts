import type { ToolDefinition } from "./tool/definitions.js";

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

export interface ModelRequest {
  readonly messages: readonly ChatMessage[];
  readonly tools: readonly ToolDefinition[];
  readonly maxTokens?: number;
  readonly thinkingBudget?: number;
  readonly thinkingPrompt?: string;
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

export interface ModelPricing {
  readonly input: number;
  readonly output: number;
  readonly cacheRead?: number;
  readonly cacheWrite?: number;
}

export interface ModelProvider {
  readonly model?: string;
  readonly contextLimit: number | undefined;
  generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse>;
  stream?(request: ModelRequest, signal?: AbortSignal): AsyncIterable<ModelStreamEvent>;
  countTokens?(text: string): number;
  readonly pricing?: ModelPricing;
}

export interface ModelRegistry {
  register(id: string, provider: ModelProvider): void;
  get(id: string): ModelProvider | undefined;
  list(): readonly { id: string; provider: ModelProvider }[];
}

export class InMemoryModelRegistry implements ModelRegistry {
  private readonly providers = new Map<string, ModelProvider>();

  register(id: string, provider: ModelProvider): void {
    this.providers.set(id, provider);
  }

  get(id: string): ModelProvider | undefined {
    return this.providers.get(id);
  }

  list(): readonly { id: string; provider: ModelProvider }[] {
    return [...this.providers.entries()].map(([id, provider]) => ({ id, provider }));
  }
}
