import { describe, it, expect, vi } from "vitest";
import { createWebSearchTool, TavilySearchProvider } from "@vinhnt-sdk/core";
import type { WebSearchProvider } from "@vinhnt-sdk/core";

function makeProvider(overrides: Partial<WebSearchProvider> = {}): WebSearchProvider {
  return {
    name: "mock",
    search: vi.fn(async (query) => ({
      results: [{ title: "R1", url: "https://r1.com", content: "Result 1", score: 0.9 }],
    })),
    ...overrides,
  };
}

describe("createWebSearchTool", () => {
  it("returns a tool with correct id and risk", () => {
    const tool = createWebSearchTool({ provider: makeProvider() });
    expect(tool.id).toBe("web_search");
    expect(tool.risk).toBe("read");
  });

  it("searches and returns results", async () => {
    const provider = makeProvider();
    const tool = createWebSearchTool({ provider });
    const result = await tool.execute({ query: "hello world" }, {} as never);

    expect(provider.search).toHaveBeenCalledOnce();
    expect(provider.search).toHaveBeenCalledWith("hello world", { numResults: undefined, searchDepth: undefined });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe("R1");
    expect(result.results[0].url).toMatchInlineSnapshot(`"https://r1.com"`);
  });

  it("includes answer when present", async () => {
    const provider = makeProvider({
      search: vi.fn(async () => ({
        results: [{ title: "R1", url: "https://r1.com", content: "c", score: 0.9 }],
        answer: "Summary answer",
      })),
    });
    const tool = createWebSearchTool({ provider });
    const result = await tool.execute({ query: "test" }, {} as never);

    expect(result.answer).toBe("Summary answer");
  });

  it("uses defaultNumResults when numResults not provided", async () => {
    const provider = makeProvider();
    const tool = createWebSearchTool({ provider, defaultNumResults: 5 });
    await tool.execute({ query: "test" }, {} as never);

    expect(provider.search).toHaveBeenCalledWith("test", { numResults: 5, searchDepth: undefined });
  });

  it("passes numResults and searchDepth to provider", async () => {
    const provider = makeProvider();
    const tool = createWebSearchTool({ provider });
    await tool.execute({ query: "test", numResults: 10, searchDepth: "advanced" }, {} as never);

    expect(provider.search).toHaveBeenCalledWith("test", { numResults: 10, searchDepth: "advanced" });
  });

  it("returns error instead of throwing on provider failure", async () => {
    const provider = makeProvider({ search: vi.fn(async () => {
      throw new Error("Rate limited");
    }) });
    const tool = createWebSearchTool({ provider });
    const result = await tool.execute({ query: "test" }, {} as never);

    expect(result.error).toContain("Rate limited");
    expect(result.results).toHaveLength(0);
  });

  it("TavilySearchProvider sends api_key and query", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new TavilySearchProvider({ apiKey: "test-key" });
    await provider.search("hello");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(url).toBe("https://api.tavily.com/search");
    expect(JSON.parse(init.body)).toMatchObject({ api_key: "test-key", query: "hello" });
  });

  it("TavilySearchProvider throws on HTTP error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "Rate limited",
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new TavilySearchProvider({ apiKey: "test-key" });
    await expect(provider.search("test")).rejects.toThrow("HTTP 429");
  });
});