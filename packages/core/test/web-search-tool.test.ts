import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWebSearchTool } from "../src/tool/web-search-tool.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockTavilyResponse(overrides: Partial<{ results: unknown[]; answer: string }> = {}) {
  return {
    ok: true,
    json: async () => ({
      results: overrides.results ?? [{ title: "R1", url: "https://r1.com", content: "Result 1", score: 0.9 }],
      answer: overrides.answer,
    }),
  };
}

describe("createWebSearchTool", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns a tool with correct id and risk", () => {
    const tool = createWebSearchTool({ apiKey: "test-key" });
    expect(tool.id).toBe("web_search");
    expect(tool.risk).toBe("read");
  });

  it("searches and returns results", async () => {
    mockFetch.mockResolvedValue(mockTavilyResponse());
    const tool = createWebSearchTool({ apiKey: "test-key" });
    const result = await tool.execute({ query: "hello world" }, {} as never);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe("R1");
    expect(result.results[0].url).toBe("https://r1.com");
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("includes answer when present", async () => {
    mockFetch.mockResolvedValue(mockTavilyResponse({ answer: "Summary answer" }));
    const tool = createWebSearchTool({ apiKey: "test-key" });
    const result = await tool.execute({ query: "test" }, {} as never);

    expect(result.answer).toBe("Summary answer");
  });

  it("returns error when API key is empty", async () => {
    const tool = createWebSearchTool({ apiKey: "" });
    const result = await tool.execute({ query: "test" }, {} as never);

    expect(result.error).toContain("not configured");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns error when API key function returns empty", async () => {
    const tool = createWebSearchTool({ apiKey: () => "" });
    const result = await tool.execute({ query: "test" }, {} as never);

    expect(result.error).toContain("not configured");
  });

  it("resolves API key from function", async () => {
    mockFetch.mockResolvedValue(mockTavilyResponse());
    const tool = createWebSearchTool({ apiKey: () => "dynamic-key" });
    await tool.execute({ query: "test" }, {} as never);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.api_key).toBe("dynamic-key");
  });

  it("passes numResults and searchDepth to API", async () => {
    mockFetch.mockResolvedValue(mockTavilyResponse());
    const tool = createWebSearchTool({ apiKey: "test-key" });
    await tool.execute({ query: "test", numResults: 10, searchDepth: "advanced" }, {} as never);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.max_results).toBe(10);
    expect(body.search_depth).toBe("advanced");
  });

  it("throws on HTTP error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429, text: async () => "Rate limited" });
    const tool = createWebSearchTool({ apiKey: "test-key" });
    await expect(tool.execute({ query: "test" }, {} as never)).rejects.toThrow("HTTP 429");
  });
});
