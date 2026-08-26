import { describe, it, expect } from "vitest";
import { createMemorySearchTool } from "@vinhnt-sdk/knowledge";
import type { SessionStore } from "@vinhnt-sdk/session";
import type { Message } from "@vinhnt-sdk/schema";

type SearchResult = { sessionId: string; role: string; content: string; createdAt: string };

function mockStore(overrides: Partial<SessionStore> = {}): SessionStore {
  return {
    createSession: async () => ({ id: "s1" as never, title: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isActive: true }),
    forkSession: async () => ({ id: "s1" as never, title: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isActive: true }),
    getSession: async () => null,
    listSessions: async () => [],
    updateSession: async () => {},
    deleteSession: async () => {},
    addMessage: async () => ({ id: "m1" as never, sessionId: "s1" as never, role: "", content: "", createdAt: new Date().toISOString() }),
    listMessages: async () => [],
    searchMessages: undefined as unknown as SessionStore["searchMessages"],
    getSessionStats: async () => ({ totalSessions: 0, totalCost: 0, totalInputTokens: 0, totalOutputTokens: 0, totalMessages: 0, sessionsByDate: [], costByModel: [] }),
    ...overrides,
  };
}

function searchRows(rows: SearchResult[]): SessionStore["searchMessages"] {
  return async () => rows as unknown as readonly Message[];
}

async function executeTool(
  tool: ReturnType<typeof createMemorySearchTool>,
  input: { query: string; limit?: number },
): Promise<SearchResult[]> {
  return (await tool.execute(input, {} as never)) as unknown as SearchResult[];
}

describe("createMemorySearchTool", () => {
  it("returns a tool with correct id and risk", () => {
    const tool = createMemorySearchTool(mockStore());
    expect(tool.id).toBe("memory_search");
    expect(tool.risk).toBe("read");
  });

  it("returns messages from searchMessages", async () => {
    const store = mockStore({
      searchMessages: searchRows([
        { sessionId: "abc12345xyz", role: "user", content: "Hello world", createdAt: "2024-01-01T00:00:00Z" },
      ]),
    });
    const tool = createMemorySearchTool(store);
    const result = await executeTool(tool, { query: "hello" });

    expect(result).toHaveLength(1);
    expect(result[0]!.sessionId).toBe("abc12345");
    expect(result[0]!.role).toBe("user");
    expect(result[0]!.content).toBe("Hello world");
    expect(result[0]!.createdAt).toBe("2024-01-01T00:00:00Z");
  });

  it("returns empty array when store has no searchMessages", async () => {
    const store = mockStore();
    const tool = createMemorySearchTool(store);
    const result = await executeTool(tool, { query: "hello" });
    expect(result).toEqual([]);
  });

  it("returns empty array when no matches", async () => {
    const store = mockStore({
      searchMessages: async () => [],
    });
    const tool = createMemorySearchTool(store);
    const result = await executeTool(tool, { query: "nothing" });
    expect(result).toEqual([]);
  });

  it("truncates content to 500 chars", async () => {
    const long = "x".repeat(1000);
    const store = mockStore({
      searchMessages: searchRows([
        { sessionId: "s1", role: "assistant", content: long, createdAt: "2024-01-01T00:00:00Z" },
      ]),
    });
    const tool = createMemorySearchTool(store);
    const result = await executeTool(tool, { query: "test" });

    expect(result[0]!.content.length).toBe(500);
  });

  it("truncates sessionId to 8 chars", async () => {
    const store = mockStore({
      searchMessages: searchRows([
        { sessionId: "very-long-session-id-12345", role: "user", content: "test", createdAt: "2024-01-01T00:00:00Z" },
      ]),
    });
    const tool = createMemorySearchTool(store);
    const result = await executeTool(tool, { query: "test" });

    expect(result[0]!.sessionId).toBe("very-lon");
    expect(result[0]!.sessionId.length).toBe(8);
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
    await tool.execute({ query: "test" }, {} as never);

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
    await tool.execute({ query: "test", limit: 5 }, {} as never);

    expect(capturedLimit).toBe(5);
  });
});