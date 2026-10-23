import { describe, expect, it } from "vitest";
import { BoundedMemory, InMemoryMemoryStore, SessionMemory, createMemoryService } from "../src/index.js";

const BASE = { tier: "long-term", tags: [] as string[] };

describe("memory scopes (P1.2)", () => {
  it("recalls a user-scoped fact from a different session", async () => {
    const store = new InMemoryMemoryStore();
    await store.set({
      ...BASE,
      key: "timezone",
      value: "Asia/Ho_Chi_Minh",
      sessionId: "s1",
      scope: "user",
      userId: "u1",
    });

    const service = createMemoryService(store);
    const recalled = await service.search("timezone", "s2", { scope: { userId: "u1" } });
    expect(recalled).toEqual([
      { key: "timezone", value: "Asia/Ho_Chi_Minh", tier: "long-term", sessionId: "s1" },
    ]);
  });

  it("never leaks user or app scoped facts to another principal", async () => {
    const store = new InMemoryMemoryStore();
    await store.set({ ...BASE, key: "user-fact", value: "u1 only", sessionId: "s1", scope: "user", userId: "u1" });
    await store.set({ ...BASE, key: "app-fact", value: "app only", sessionId: "s1", scope: "app", appId: "app1" });

    const service = createMemoryService(store);
    expect(await service.search("fact", "s2", { scope: { userId: "u2" } })).toEqual([]);
    expect(await service.search("fact", "s2", { scope: { userId: "u2", appId: "app2" } })).toEqual([]);
    expect(await service.search("fact", "s2")).toEqual([]);
  });

  it("rejects scoped writes without their owner id", async () => {
    const store = new InMemoryMemoryStore();
    await expect(store.set({ ...BASE, key: "k", value: "v", sessionId: "s1", scope: "user" })).rejects.toThrow("userId");
    await expect(store.set({ ...BASE, key: "k", value: "v", sessionId: "s1", scope: "app" })).rejects.toThrow("appId");
  });

  it("keeps session-scoped facts isolated to their session", async () => {
    const store = new InMemoryMemoryStore();
    await store.set({ ...BASE, key: "session-fact", value: "s1 only", sessionId: "s1" });

    expect(await store.get("session-fact", "s1")).toBeDefined();
    expect(await store.get("session-fact", "s2", { userId: "u1" })).toBeUndefined();
  });

  it("resolves session > user > app for the same key and tier", async () => {
    const store = new InMemoryMemoryStore();
    await store.set({ ...BASE, key: "k", value: "app", sessionId: "s1", scope: "app", appId: "a1" });
    await store.set({ ...BASE, key: "k", value: "user", sessionId: "s1", scope: "user", userId: "u1" });
    await store.set({ ...BASE, key: "k", value: "session", sessionId: "s1" });

    const scope = { userId: "u1", appId: "a1" };
    expect((await store.get("k", "s1", scope))?.value).toBe("session");
    expect((await store.get("k", "s2", scope))?.value).toBe("user");
    expect((await store.get("k", "s2", { appId: "a1" }))?.value).toBe("app");
  });

  it("stores identical keys from different scopes independently", async () => {
    const store = new InMemoryMemoryStore();
    await store.set({ ...BASE, key: "k", value: "session", sessionId: "s1" });
    await store.set({ ...BASE, key: "k", value: "user", sessionId: "s1", scope: "user", userId: "u1" });
    await store.set({ ...BASE, key: "k", value: "app", sessionId: "s1", scope: "app", appId: "a1" });

    expect(await store.count("s1", "long-term", { userId: "u1", appId: "a1" })).toBe(3);
    await store.deleteAll("s1");
    expect(await store.count("s1", "long-term", { userId: "u1", appId: "a1" })).toBe(2);
  });

  it("writes bounded profile/working memory at the configured scope", async () => {
    const store = new InMemoryMemoryStore();
    const bounded = new BoundedMemory(store, {}, { userId: "u1" });
    await bounded.setProfile("prefers concise answers");
    await bounded.setWorkingFact("editor", "vim");

    expect((await store.get("_profile", "other", { userId: "u1" }))?.value).toBe("prefers concise answers");
    expect((await store.get("_working:editor", "other", { userId: "u1" }))?.value).toBe("vim");
    expect(await store.get("_profile", "other", { userId: "u2" })).toBeUndefined();
  });

  it("writes SessionMemory facts at the configured scope", async () => {
    const store = new InMemoryMemoryStore();
    const userMemory = new SessionMemory("s1", store, { userId: "u1" });
    await userMemory.remember("editor", "vim");

    expect(await userMemory.recall("editor")).toBe("vim");
    expect((await store.get("editor", "s2", { userId: "u1" }))?.value).toBe("vim");
    expect(await store.get("editor", "s2", { userId: "u2" })).toBeUndefined();
  });
});
