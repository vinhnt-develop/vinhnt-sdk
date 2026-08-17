import { z } from "zod";
import { defineTool } from "@vinhnt-sdk/tools";
import type { ToolRegistry } from "@vinhnt-sdk/tools";

const ToolSearchSchema = z.object({
  query: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

/** Input for the `search_tools` tool. */
export interface ToolSearchInput {
  query: string;
  tags?: string[];
}

/** A found tool in `search_tools` results. */
export interface ToolSearchResult {
  id: string;
  description: string;
  tags: readonly string[];
}

/** Create the `search_tools` tool that searches registered tools by query or tags. */
export function createToolSearchTool(registry: ToolRegistry) {
  return defineTool<ToolSearchInput, { results: ToolSearchResult[] }>({
    name: "search_tools",
    description: "Search for available tools by query or tags. Returns matching tool definitions.",
    risk: "read",
    input: ToolSearchSchema,
    jsonSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query to match against tool names and descriptions" },
        tags: { type: "array", items: { type: "string" }, description: "Filter by tags" },
      },
      required: ["query"],
    },
    async execute(input) {
      const allTools = registry.list();
      const query = input.query.toLowerCase();

      const results = allTools
        .filter((tool) => {
          const matchesQuery =
            tool.id.toLowerCase().includes(query) ||
            tool.description.toLowerCase().includes(query);
          if (!matchesQuery) return false;
          if (input.tags && input.tags.length > 0) {
            const toolTags = tool.tags ?? [];
            return input.tags.some((tag) => toolTags.includes(tag));
          }
          return true;
        })
        .slice(0, 20)
        .map((tool) => ({
          id: tool.id,
          description: tool.description,
          tags: tool.tags ?? [],
        }));

      return { results };
    },
  }).toDefinition();
}
