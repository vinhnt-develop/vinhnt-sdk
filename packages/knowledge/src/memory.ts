import { randomUUID } from "node:crypto";
import type { MemoryItem, MemoryStore, MemoryTier } from "./types.js";

/** In-memory {@link MemoryStore} backed by an array. */
export class InMemoryMemoryStore implements MemoryStore {
  private items: MemoryItem[] = [];

  async get(key: string, sessionId: string): Promise<MemoryItem | undefined> {
    return this.items.find(
      (item) => item.key === key && item.sessionId === sessionId,
    );
  }

  async set(
    data: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">,
  ): Promise<MemoryItem> {
    const existing = this.items.find(
      (item) => item.key === data.key && item.sessionId === data.sessionId && item.tier === data.tier,
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
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(item);
    return item;
  }

  async delete(key: string, sessionId: string): Promise<void> {
    this.items = this.items.filter(
      (item) => !(item.key === key && item.sessionId === sessionId),
    );
  }

  async search(query: string, sessionId: string): Promise<MemoryItem[]> {
    const q = query.toLowerCase();
    return this.items.filter(
      (item) =>
        (!sessionId || item.sessionId === sessionId) &&
        (item.key.toLowerCase().includes(q) ||
          item.value.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))),
    );
  }

  async listByTier(tier: MemoryTier, sessionId: string): Promise<MemoryItem[]> {
    return this.items
      .filter((item) => item.tier === tier && (!sessionId || item.sessionId === sessionId))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }
}

/** Scoped memory accessor bound to a single session. */
export class SessionMemory {
  private store: MemoryStore;
  private sessionId: string;

  constructor(sessionId: string, store?: MemoryStore) {
    this.sessionId = sessionId;
    this.store = store ?? new InMemoryMemoryStore();
  }

  async remember(key: string, value: string, tags?: string[]): Promise<MemoryItem> {
    return this.store.set({
      key,
      value,
      sessionId: this.sessionId,
      tier: "session",
      tags: tags ?? [],
    });
  }

  async recall(key: string): Promise<string | undefined> {
    const item = await this.store.get(key, this.sessionId);
    return item?.value;
  }

  async forget(key: string): Promise<void> {
    return this.store.delete(key, this.sessionId);
  }

  async search(query: string): Promise<MemoryItem[]> {
    return this.store.search(query, this.sessionId);
  }

  async getWorkingMemory(): Promise<MemoryItem[]> {
    return this.store.listByTier("working", this.sessionId);
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
      });
      results.push(item);
    }
    return results;
  }
}
