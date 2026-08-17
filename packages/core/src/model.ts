/**
 * @module model
 * Re-exports model types from @vinhnt-sdk/schema.
 * InMemoryModelRegistry stays here (class, not interface).
 */
export type {
  ContentPart,
  ModelUsage,
  ToolCallResult,
  ToolCall,
  MessageContentPart,
  ChatMessage,
  ModelRequest,
  ModelResponse,
  ModelStreamEvent,
  ModelPricing,
  ModelCapabilities,
  ModelProvider,
  ModelRegistry,
  ToolDefinitionLike,
} from "@vinhnt-sdk/schema";

export { getTextContent } from "@vinhnt-sdk/schema";

import type { ModelProvider, ModelRegistry } from "@vinhnt-sdk/schema";

/** In-memory {@link ModelRegistry} keyed by provider id. */
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
