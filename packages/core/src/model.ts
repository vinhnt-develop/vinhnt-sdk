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
  private readonly providersMap = new Map<string, ModelProvider>();

  register(id: string, provider: ModelProvider): void {
    this.providersMap.set(id, provider);
  }

  get(id: string): ModelProvider | undefined {
    return this.providersMap.get(id);
  }

  list(): readonly { id: string; provider: ModelProvider }[] {
    return [...this.providersMap.entries()].map(([id, provider]) => ({ id, provider }));
  }

  getByProvider(provider: string): readonly { id: string; provider: ModelProvider }[] {
    return [...this.providersMap.entries()]
      .filter(([, p]) => p.provider === provider)
      .map(([id, provider]) => ({ id, provider }));
  }

  providers(): readonly string[] {
    const seen = new Set<string>();
    for (const provider of this.providersMap.values()) {
      seen.add(provider.provider);
    }
    return [...seen];
  }
}
