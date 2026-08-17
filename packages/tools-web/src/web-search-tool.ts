import { z } from "zod";
import { defineTool } from "@vinhnt-sdk/tools";
import { NetworkError } from "@vinhnt-sdk/schema";

const WebSearchSchema = z.object({
  query: z.string().min(1),
  numResults: z.number().int().positive().optional(),
  searchDepth: z.enum(["basic", "advanced"]).optional(),
  livecrawl: z.enum(["fallback", "preferred"]).optional(),
  type: z.enum(["auto", "fast", "deep"]).optional(),
  contextMaxCharacters: z.number().int().positive().optional(),
});

/** A single web search result. */
export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

/** Response of a web search: ranked results plus an optional synthesized answer. */
export interface WebSearchResponse {
  results: SearchResult[];
  answer?: string;
}

/**
 * Web search provider interface — user tự implement.
 * Ví dụ: Tavily, Serper, Bing, Google Custom Search, DuckDuckGo...
 */
export interface WebSearchProvider {
  name: string;
  search(query: string, options?: {
    numResults?: number;
    searchDepth?: "basic" | "advanced";
  }): Promise<WebSearchResponse>;
}

/** Configuration for the {@link createWebSearchTool} tool. */
export interface WebSearchToolConfig {
  /**
   * Web search provider — injectable dependency.
   * User tự implement provider hoặc dùng built-in adapters.
   */
  provider: WebSearchProvider;
  /** Default number of search results (default: 5) */
  defaultNumResults?: number;
  /** Search timeout in ms (default: 15000) */
  timeout?: number;
}

/**
 * Default API URLs — exported for convenience.
 * User override được qua baseUrl option.
 */
export const DEFAULT_TAVILY_URL = "https://api.tavily.com/search";
/** Default Serper (Google Search) API URL. */
export const DEFAULT_SERPER_URL = "https://google.serper.dev/search";

/**
 * Tavily search provider adapter — convenience only.
 * User có thể tự implement provider khác: Serper, Bing, Google...
 */
export class TavilySearchProvider implements WebSearchProvider {
  name = "tavily";
  private apiKey: string;
  private defaultNumResults: number;
  private baseUrl: string;

  constructor(config: { apiKey: string; defaultNumResults?: number; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.defaultNumResults = config.defaultNumResults ?? 5;
    this.baseUrl = config.baseUrl ?? DEFAULT_TAVILY_URL;
  }

  async search(query: string, options?: {
    numResults?: number;
    searchDepth?: "basic" | "advanced";
  }): Promise<WebSearchResponse> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        search_depth: options?.searchDepth ?? "basic",
        max_results: options?.numResults ?? this.defaultNumResults,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new NetworkError(`Tavily API error: HTTP ${response.status}${text ? ` — ${text}` : ""}`);
    }

    return response.json() as Promise<WebSearchResponse>;
  }
}

/**
 * Serper (Google Search) provider adapter — convenience only.
 */
export class SerperSearchProvider implements WebSearchProvider {
  name = "serper";
  private apiKey: string;
  private defaultNumResults: number;
  private baseUrl: string;

  constructor(config: { apiKey: string; defaultNumResults?: number; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.defaultNumResults = config.defaultNumResults ?? 5;
    this.baseUrl = config.baseUrl ?? DEFAULT_SERPER_URL;
  }

  async search(query: string, options?: {
    numResults?: number;
  }): Promise<WebSearchResponse> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": this.apiKey,
      },
      body: JSON.stringify({
        q: query,
        num: options?.numResults ?? this.defaultNumResults,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new NetworkError(`Serper API error: HTTP ${response.status}${text ? ` — ${text}` : ""}`);
    }

    const data = (await response.json()) as { organic?: Array<{ title: string; link: string; snippet: string }> };
    return {
      results: (data.organic ?? []).map((r) => ({
        title: r.title,
        url: r.link,
        content: r.snippet,
        score: 1,
      })),
    };
  }
}

/** Create the `web_search` tool backed by a {@link WebSearchProvider}. */
export function createWebSearchTool(config: WebSearchToolConfig) {
  return defineTool<{ query: string; numResults?: number; searchDepth?: "basic" | "advanced" }, {
    results: SearchResult[];
    answer?: string;
    error?: string;
  }>({
    name: "web_search",
    description: `Search the web for information. Uses ${config.provider.name} search API. Returns a list of relevant results with titles, URLs, and content snippets.`,
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeout ?? 15000);

      try {
        const data = await config.provider.search(v.query, {
          numResults: v.numResults ?? config.defaultNumResults,
          searchDepth: v.searchDepth,
        });

        return {
          results: data.results.map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content,
            score: r.score,
          })),
          answer: data.answer ?? undefined,
        };
      } catch (error) {
        return {
          results: [],
          error: `Web search failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  }).toDefinition();
}
