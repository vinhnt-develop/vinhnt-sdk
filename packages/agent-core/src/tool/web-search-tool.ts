import { z } from "zod";
import { defineTool } from "./define-tool.js";

const WebSearchSchema = z.object({
  query: z.string().min(1),
  numResults: z.number().int().positive().optional(),
  searchDepth: z.enum(["basic", "advanced"]).optional(),
  livecrawl: z.enum(["fallback", "preferred"]).optional(),
  type: z.enum(["auto", "fast", "deep"]).optional(),
  contextMaxCharacters: z.number().int().positive().optional(),
});

export interface WebSearchToolConfig {
  apiKey: string | (() => string);
  /** Default number of search results (default: 5) */
  defaultNumResults?: number;
  /** Search timeout in ms (default: 15000) */
  timeout?: number;
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyResult[];
  answer?: string;
}

export function createWebSearchTool(config: WebSearchToolConfig) {
  return defineTool<{ query: string; numResults?: number; searchDepth?: "basic" | "advanced" }, {
    results: TavilyResult[];
    answer?: string;
    error?: string;
  }>({
    name: "web_search",
    description: "Search the web for information. Uses Tavily search API. Returns a list of relevant results with titles, URLs, and content snippets.",
    risk: "read",
    input: WebSearchSchema,
    jsonSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        numResults: { type: "number", description: "Number of results to return (default: 5, max: 20)" },
        searchDepth: { type: "string", enum: ["basic", "advanced"], description: "Search depth (default: basic)" },
      },
      required: ["query"],
    },
    async execute(v, _ctx) {
      const apiKey = typeof config.apiKey === "function" ? config.apiKey() : config.apiKey;

      if (!apiKey) {
        return { results: [], error: "Web search API key not configured. Set webSearchApiKey in config." };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeout ?? 15000);

      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            query: v.query,
            search_depth: v.searchDepth ?? "basic",
            max_results: v.numResults ?? config.defaultNumResults ?? 5,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(`Tavily API error: HTTP ${response.status}${text ? ` — ${text}` : ""}`);
        }

        const data = (await response.json()) as TavilyResponse;

        return {
          results: data.results.map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content,
            score: r.score,
          })),
          answer: data.answer ?? undefined,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  }).toDefinition();
}
