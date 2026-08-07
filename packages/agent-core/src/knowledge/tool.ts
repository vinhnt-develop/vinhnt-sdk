import type { ToolDefinition } from "../tool/definitions.js";
import type { SessionStore } from "../session/store.js";

export function createMemorySearchTool(store: SessionStore): ToolDefinition {
  return {
    id: "memory_search",
    description: "Search past conversations by keyword. Returns messages from session history with relevance ranking.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query to find in past conversations" },
        limit: { type: "number", description: "Maximum results (default: 10)", default: 10 },
      },
      required: ["query"],
    },
    risk: "read",
    async execute(input: { query: string; limit?: number }) {
      if (!store.searchMessages) return [];
      const messages = await store.searchMessages(input.query, input.limit ?? 10);
      return messages.map((m) => ({
        sessionId: m.sessionId.slice(0, 8),
        role: m.role,
        content: m.content.slice(0, 500),
        createdAt: m.createdAt,
      }));
    },
  };
}
