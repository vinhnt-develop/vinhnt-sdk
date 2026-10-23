import { randomUUID } from "node:crypto";
import type { MemoryItem, MemoryScope, MemoryScopeFilter, MemoryStore, MemoryTier } from "./types.js";

const SCOPE_RANK: Record<MemoryScope, number> = { session: 0, user: 1, app: 2 };

function scopeOf(item: MemoryItem): MemoryScope {
  return item.scope ?? "session";
}

function isVisible(item: MemoryItem, sessionId: string, filter?: MemoryScopeFilter): boolean {
  // Empty session id with no scope filter means "all sessions" (legacy API).
  if (!sessionId && !filter) return true;
  const scope = scopeOf(item);
  if (filter?.scopes && !filter.scopes.includes(scope)) return false;
  if (scope === "session") return item.sessionId === sessionId;
  if (scope === "user") return filter?.userId !== undefined && item.userId === filter.userId;
  return filter?.appId !== undefined && item.appId === filter.appId;
}

function ownerKey(item: MemoryItem): string {
  const scope = scopeOf(item);
  if (scope === "session") return item.sessionId;
  if (scope === "user") return item.userId ?? "";
  return item.appId ?? "";
}

function compareMemory(a: MemoryItem, b: MemoryItem): number {
  const rank = SCOPE_RANK[scopeOf(a)] - SCOPE_RANK[scopeOf(b)];
  if (rank !== 0) return rank;
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

/** In-memory {@link MemoryStore} backed by an array. */
export class InMemoryMemoryStore implements MemoryStore {
  private items: MemoryItem[] = [];

  async get(key: string, sessionId: string, scope?: MemoryScopeFilter): Promise<MemoryItem | undefined> {
    return this.items
      .filter((item) => item.key === key && isVisible(item, sessionId, scope))
      .sort(compareMemory)[0];
  }

  async set(
    data: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">,
  ): Promise<MemoryItem> {
    const scope = data.scope ?? "session";
    if (scope === "user" && data.userId === undefined) {
      throw new Error("user-scoped memory requires userId");
    }
    if (scope === "app" && data.appId === undefined) {
      throw new Error("app-scoped memory requires appId");
    }
    const owner = scope === "session" ? data.sessionId : scope === "user" ? data.userId : data.appId;
    const existing = this.items.find(
      (item) =>
        item.key === data.key &&
        item.tier === data.tier &&
        scopeOf(item) === scope &&
        ownerKey(item) === (owner ?? ""),
    );
    const now = new Date().toISOString();
    if (existing) {
      existing.value = data.value;
      existing.tags = data.tags;
      existing.updatedAt = now;
      return existing;
    }
    const item: MemoryItem = {
      id: randomUUID(),
      ...data,
      scope,
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(item);
    return item;
  }

  async delete(key: string, sessionId: string, scope?: MemoryScopeFilter): Promise<void> {
    this.items = this.items.filter(
      (item) => !(item.key === key && isVisible(item, sessionId, scope)),
    );
  }

  async deleteAll(sessionId: string): Promise<void> {
    this.items = this.items.filter(
      (item) => !(scopeOf(item) === "session" && item.sessionId === sessionId),
    );
  }

  async list(sessionId: string, options?: { tier?: MemoryTier; limit?: number; offset?: number; scope?: MemoryScopeFilter }): Promise<MemoryItem[]> {
    let filtered = this.items.filter((item) => isVisible(item, sessionId, options?.scope));
    if (options?.tier) {
      filtered = filtered.filter((item) => item.tier === options.tier);
    }
    filtered.sort(compareMemory);
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? filtered.length;
    return filtered.slice(offset, offset + limit);
  }

  async count(sessionId: string, tier?: MemoryTier, scope?: MemoryScopeFilter): Promise<number> {
    return this.items.filter(
      (item) =>
        isVisible(item, sessionId, scope) &&
        (!tier || item.tier === tier),
    ).length;
  }

  async search(query: string, sessionId: string, scope?: MemoryScopeFilter): Promise<MemoryItem[]> {
    const q = query.toLowerCase();
    return this.items
      .filter(
        (item) =>
          isVisible(item, sessionId, scope) &&
          (item.key.toLowerCase().includes(q) ||
            item.value.toLowerCase().includes(q) ||
            item.tags.some((t) => t.toLowerCase().includes(q))),
      )
      .sort(compareMemory);
  }

  async listByTier(tier: MemoryTier, sessionId: string, scope?: MemoryScopeFilter): Promise<MemoryItem[]> {
    return this.items
      .filter((item) => item.tier === tier && isVisible(item, sessionId, scope))
      .sort(compareMemory);
  }
}

/** Scoped memory accessor bound to a single session. */
export class SessionMemory {
  private store: MemoryStore;
  private sessionId: string;
  private scope: MemoryScopeFilter | undefined;

  constructor(sessionId: string, store?: MemoryStore, scope?: MemoryScopeFilter) {
    this.sessionId = sessionId;
    this.store = store ?? new InMemoryMemoryStore();
    this.scope = scope;
  }

  async remember(key: string, value: string, tags?: string[]): Promise<MemoryItem> {
    return this.store.set({
      key,
      value,
      sessionId: this.sessionId,
      tier: "session",
      tags: tags ?? [],
      ...(this.scope?.userId !== undefined ? { scope: "user" as const, userId: this.scope.userId } : {}),
      ...(this.scope?.appId !== undefined && this.scope.userId === undefined
        ? { scope: "app" as const, appId: this.scope.appId }
        : {}),
    });
  }

  async recall(key: string): Promise<string | undefined> {
    const item = await this.store.get(key, this.sessionId, this.scope);
    return item?.value;
  }

  async forget(key: string): Promise<void> {
    return this.store.delete(key, this.sessionId, this.scope);
  }

  async search(query: string): Promise<MemoryItem[]> {
    return this.store.search(query, this.sessionId, this.scope);
  }

  async getWorkingMemory(): Promise<MemoryItem[]> {
    return this.store.listByTier("working", this.sessionId, this.scope);
  }

  async setWorkingMemory(data: Record<string, string>): Promise<MemoryItem[]> {
    const results: MemoryItem[] = [];
    for (const [key, value] of Object.entries(data)) {
      const item = await this.store.set({
        key,
        value,
        sessionId: this.sessionId,
        tier: "working",
        tags: ["working"],
        ...(this.scope?.userId !== undefined ? { scope: "user" as const, userId: this.scope.userId } : {}),
        ...(this.scope?.appId !== undefined && this.scope.userId === undefined
          ? { scope: "app" as const, appId: this.scope.appId }
          : {}),
      });
      results.push(item);
    }
    return results;
  }
}
