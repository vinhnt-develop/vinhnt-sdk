import { describe, it, expect } from "vitest";
import { createMemorySearchTool } from "@vinhnt-sdk/knowledge";
import type { SessionStore } from "@vinhnt-sdk/session";

function mockStore(overrides: Partial<SessionStore> = {}): SessionStore {
  return {
    load: async () => null,
    save: async () => {},
    getActiveSession: async () => null,
    setActiveSession: async () => {},
    getSession: async () => null,
    getOrCreateSession: async () => ({ id: "s1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), title: "", state: "active" } as never),
    addRunToSession: async () => "",
    searchMessages: undefined,
    find: async () => [],
    getSessionByRunId: async () => null,
    delete: async () => {},
    ...overrides,
  };
}

describe("createMemorySearchTool", () => {
  it("returns a tool with correct id and risk", () => {
    const tool = createMemorySearchTool(mockStore());
    expect(tool.id).toBe("memory_search");
    expect(tool.risk).toBe("read");
  });

  it("returns messages from searchMessages", async () => {
    const store = mockStore({
      searchMessages: async () => [
        { sessionId: "abc12345xyz", role: "user", content: "Hello world", createdAt: "2024-01-01T00:00:00Z" },
      ],
    });
    const tool = createMemorySearchTool(store);
    const result = await tool.execute({ query: "hello" });

    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe("abc12345");
    expect(result[0].role).toBe("user");
    expect(result[0].content).toBe("Hello world");
    expect(result[0].createdAt).toBe("2024-01-01T00:00:00Z");
  });

  it("returns empty array when store has no searchMessages", async () => {
    const store = mockStore();
    const tool = createMemorySearchTool(store);
    const result = await tool.execute({ query: "hello" });
    expect(result).toEqual([]);
  });

  it("returns empty array when no matches", async () => {
    const store = mockStore({
      searchMessages: async () => [],
    });
    const tool = createMemorySearchTool(store);
    const result = await tool.execute({ query: "nothing" });
    expect(result).toEqual([]);
  });

  it("truncates content to 500 chars", async () => {
    const long = "x".repeat(1000);
    const store = mockStore({
      searchMessages: async () => [
        { sessionId: "s1", role: "assistant", content: long, createdAt: "2024-01-01T00:00:00Z" },
      ],
    });
    const tool = createMemorySearchTool(store);
    const result = await tool.execute({ query: "test" });

    expect(result[0].content.length).toBe(500);
  });

  it("truncates sessionId to 8 chars", async () => {
    const store = mockStore({
      searchMessages: async () => [
        { sessionId: "very-long-session-id-12345", role: "user", content: "test", createdAt: "2024-01-01T00:00:00Z" },
      ],
    });
    const tool = createMemorySearchTool(store);
    const result = await tool.execute({ query: "test" });

    expect(result[0].sessionId).toBe("very-lon");
    expect(result[0].sessionId.length).toBe(8);
  });

  it("uses default limit of 10 when not specified", async () => {
    let capturedLimit = 0;
    const store = mockStore({
      searchMessages: async (_query: string, limit?: number) => {
        capturedLimit = limit ?? 0;
        return [];
      },
    });
    const tool = createMemorySearchTool(store);
    await tool.execute({ query: "test" });

    expect(capturedLimit).toBe(10);
  });

  it("passes custom limit to searchMessages", async () => {
    let capturedLimit = 0;
    const store = mockStore({
      searchMessages: async (_query: string, limit?: number) => {
        capturedLimit = limit ?? 0;
        return [];
      },
    });
    const tool = createMemorySearchTool(store);
    await tool.execute({ query: "test", limit: 5 });

    expect(capturedLimit).toBe(5);
  });
});
