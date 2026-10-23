/**
 * Memory tier â€” string type, NOT closed union.
 * Users can register custom tiers via MemoryStore adapter.
 */
export type MemoryTier = string;

/**
 * Default memory tiers â€” exported for convenience.
 */
export const KNOWN_MEMORY_TIERS = ["working", "session", "long-term"] as const;

/**
 * Memory visibility scope.
 * - `session`: only the originating session.
 * - `user`: all sessions for the same user.
 * - `app`: every user of the same application/workspace.
 */
export type MemoryScope = "session" | "user" | "app";

export interface MemoryScopeFilter {
  readonly userId?: string;
  readonly appId?: string;
  /** Restrict resolution to these scopes. Defaults to every visible scope. */
  readonly scopes?: readonly MemoryScope[];
}

export interface MemoryItem {
  id: string;
  sessionId: string;
  tier: MemoryTier;
  key: string;
  value: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  scope?: MemoryScope;
  userId?: string;
  appId?: string;
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
  get(key: string, sessionId: string, scope?: MemoryScopeFilter): Promise<MemoryItem | undefined>;
  set(item: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">): Promise<MemoryItem>;
  delete(key: string, sessionId: string, scope?: MemoryScopeFilter): Promise<void>;
  deleteAll(sessionId: string): Promise<void>;
  list(sessionId: string, options?: { tier?: MemoryTier; limit?: number; offset?: number; scope?: MemoryScopeFilter }): Promise<MemoryItem[]>;
  count(sessionId: string, tier?: MemoryTier, scope?: MemoryScopeFilter): Promise<number>;
  search(query: string, sessionId: string, scope?: MemoryScopeFilter): Promise<MemoryItem[]>;
  searchSimilar?(embedding: number[], sessionId: string, options?: { topK?: number; tier?: MemoryTier; scope?: MemoryScopeFilter }): Promise<MemoryItem[]>;
  listByTier(tier: MemoryTier, sessionId: string, scope?: MemoryScopeFilter): Promise<MemoryItem[]>;
}
