import type { MemoryItem, MemoryStore, MemoryTier } from "./types.js";
import type { ToolDefinition } from "@vinhnt-sdk/tools";

export interface MemoryServiceSearchOptions {
  readonly limit?: number;
  readonly tier?: MemoryTier;
  /** Optional vector query — used only when the backing store implements `searchSimilar`. */
  readonly embedding?: number[];
}

export interface MemoryServiceResult {
  readonly key: string;
  readonly value: string;
  readonly tier: MemoryTier;
  readonly sessionId: string;
}

export interface MemoryService {
  add(item: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">): Promise<MemoryItem>;
  /**
   * ADK `MemoryService.search` parity: keyword search over the session's
   * memories by default; when an `embedding` is supplied and the store
   * implements `searchSimilar`, vector search is used instead (the seam
   * apps swap to plug in a real embedding backend — none is hardcoded).
   */
  search(query: string, sessionId: string, options?: MemoryServiceSearchOptions): Promise<MemoryServiceResult[]>;
}

/**
 * ADK-style `MemoryService` facade over the SDK `MemoryStore`.
 * Keeps apps decoupled from the raw store API so search backends can be
 * replaced (keyword → vector) without touching call sites.
 */
export function createMemoryService(store: MemoryStore): MemoryService {
  return {
    add(item) {
      return store.set(item);
    },
    async search(query, sessionId, options) {
      const limit = options?.limit ?? 10;
      let items: MemoryItem[];
      if (options?.embedding !== undefined && store.searchSimilar !== undefined) {
        items = await store.searchSimilar(options.embedding, sessionId, {
          topK: limit,
          ...(options.tier !== undefined ? { tier: options.tier } : {}),
        });
      } else {
        items = await store.search(query, sessionId);
      }
      if (options?.tier !== undefined) items = items.filter((i) => i.tier === options.tier);
      return items.slice(0, limit).map((i) => ({ key: i.key, value: i.value, tier: i.tier, sessionId: i.sessionId }));
    },
  };
}

/** Agent-facing `memory_service_search` tool over a `MemoryService` (distinct id from `memory_search`). */
export function createMemoryServiceSearchTool(service: MemoryService, sessionId: string): ToolDefinition {
  return {
    id: "memory_service_search",
    description:
      "Search long-term memory (facts learned across sessions) by keyword. Returns key/value pairs with their memory tier.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query to find in long-term memory" },
        limit: { type: "number", description: "Maximum results (default: 10)", default: 10 },
      },
      required: ["query"],
    },
    risk: "read",
    metadata: { source: "knowledge" },
    async execute(input: { query: string; limit?: number }) {
      return service.search(input.query, sessionId, { limit: input.limit ?? 10 });
    },
  };
}
