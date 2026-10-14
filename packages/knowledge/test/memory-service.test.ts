import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "@vinhnt-sdk/tools";
import { InMemoryMemoryStore, createMemoryService, createMemoryServiceSearchTool } from "../src/index.js";
import type { MemoryItem, MemoryService, MemoryServiceResult, MemoryServiceSearchOptions, MemoryStore } from "../src/index.js";

const SESSION = "ses_mem_1";

function service(): { service: MemoryService; store: InMemoryMemoryStore } {
  const store = new InMemoryMemoryStore();
  return { service: createMemoryService(store), store };
}

describe("createMemoryService (G6.1, ADK MemoryService parity)", () => {
  it("adds memories and keyword-searches them back", async () => {
    const { service: svc } = service();
    await svc.add({ key: "deploy", value: "uses github actions", sessionId: SESSION, tier: "long-term", tags: ["ci"] });
    await svc.add({ key: "style", value: "terse replies", sessionId: SESSION, tier: "long-term", tags: [] });
    const results = await svc.search("github", SESSION);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ key: "deploy", value: "uses github actions", tier: "long-term", sessionId: SESSION });
  });

  it("respects the limit and tier filters", async () => {
    const { service: svc } = service();
    for (let i = 0; i < 5; i++) {
      await svc.add({ key: `k${i}`, value: "shared token", sessionId: SESSION, tier: i < 3 ? "working" : "session", tags: [] });
    }
    expect(await svc.search("shared", SESSION, { limit: 2 })).toHaveLength(2);
    const working = await svc.search("shared", SESSION, { tier: "working" });
    expect(working).toHaveLength(3);
    expect(working.every((r) => r.tier === "working")).toBe(true);
  });

  it("falls back to keyword search when an embedding is given but the store has no searchSimilar", async () => {
    const { service: svc, store } = service();
    expect("searchSimilar" in store).toBe(false);
    await svc.add({ key: "a", value: "vector fallback", sessionId: SESSION, tier: "working", tags: [] });
    const options: MemoryServiceSearchOptions = { embedding: [0.1, 0.2], limit: 5 };
    const results = await svc.search("fallback", SESSION, options);
    expect(results).toHaveLength(1);
  });

  it("uses searchSimilar (vector path) when the store implements it", async () => {
    const base = new InMemoryMemoryStore();
    await base.set({ key: "v", value: "near", sessionId: SESSION, tier: "working", tags: [] });
    const vector = vi.fn(async () => [
      { id: "1", key: "v", value: "near", sessionId: SESSION, tier: "working", tags: [], createdAt: "", updatedAt: "" } as MemoryItem,
    ]);
    const store: MemoryStore = Object.assign(base, { searchSimilar: vector });
    const results = await createMemoryService(store).search("ignored", SESSION, { embedding: [1, 2] });
    expect(vector).toHaveBeenCalledWith([1, 2], SESSION, { topK: 10 });
    expect(results).toHaveLength(1);
    expect(results[0]?.key).toBe("v");
  });
});

describe("createMemoryServiceSearchTool (G6.1)", () => {
  it("exposes a read-only tool that forwards query + limit", async () => {
    const { service: svc } = service();
    await svc.add({ key: "fact", value: "needs search", sessionId: SESSION, tier: "session", tags: [] });
    const tool = createMemoryServiceSearchTool(svc, SESSION);
    expect(tool.id).toBe("memory_service_search");
    expect(tool.risk).toBe("read");
    expect(tool.metadata).toEqual({ source: "knowledge" });
    const results = (await tool.execute({ query: "search", limit: 3 }, {} as ToolContext)) as MemoryServiceResult[];
    expect(results).toHaveLength(1);
    expect(results[0]?.key).toBe("fact");
  });
});
