/**
 * Memory tier — string type, NOT closed union.
 * Users can register custom tiers via MemoryStore adapter.
 */
export type MemoryTier = string;

/**
 * Default memory tiers — exported for convenience.
 */
export const KNOWN_MEMORY_TIERS = ["working", "session", "long-term"] as const;

export interface MemoryItem {
  id: string;
  sessionId: string;
  tier: MemoryTier;
  key: string;
  value: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  instruction: string;
  triggers: string[];
  createdAt: string;
}

export interface MemoryStore {
  get(key: string, sessionId: string): Promise<MemoryItem | undefined>;
  set(item: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">): Promise<MemoryItem>;
  delete(key: string, sessionId: string): Promise<void>;
  deleteAll(sessionId: string): Promise<void>;
  list(sessionId: string, options?: { tier?: MemoryTier; limit?: number; offset?: number }): Promise<MemoryItem[]>;
  count(sessionId: string, tier?: MemoryTier): Promise<number>;
  search(query: string, sessionId: string): Promise<MemoryItem[]>;
  searchSimilar?(embedding: number[], sessionId: string, options?: { topK?: number; tier?: MemoryTier }): Promise<MemoryItem[]>;
  listByTier(tier: MemoryTier, sessionId: string): Promise<MemoryItem[]>;
}
