import type { ToolDefinition } from "@vinhnt-sdk/core";
import type { Indexer } from "./indexer.js";

export function createRagSearchTool(getIndexer: () => Indexer | undefined): ToolDefinition {
  return {
    id: "rag_search",
    description: "Search indexed codebase by semantic query. Returns relevant code chunks with file paths and scores.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query (natural language or keywords)" },
        topK: { type: "number", description: "Number of results to return (default: 5)", default: 5 },
      },
      required: ["query"],
    },
    risk: "read",
    async execute(input: { query: string; topK?: number }) {
      const indexer = getIndexer();
      if (!indexer) return { error: "RAG index not initialized. Run /rag index first." };
      const results = indexer.hybridSearch(input.query, input.topK ?? 5);
      return results.map((r) => ({
        file: r.document.title,
        score: r.score.toFixed(3),
        snippet: r.chunk.text.slice(0, 500),
        heading: r.chunk.headingPath,
      }));
    },
  };
}
