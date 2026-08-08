import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { fetchExternalModelCatalog, searchExternalModels, clearExternalModelCatalogCache } from "../src/model-catalog.js";

const SAMPLE_JSON = {
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    models: {
      "deepseek-chat": {
        id: "deepseek-chat",
        cost: { input: 0.14, output: 0.28 },
        limit: { context: 64000 },
        tool_call: true,
      },
      "deepseek-free": {
        id: "deepseek-free",
        cost: { input: 0, output: 0 },
        limit: { context: 32000 },
        tool_call: true,
      },
    },
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    models: {
      "gpt-4o": {
        id: "gpt-4o",
        cost: { input: 2.5, output: 10 },
        limit: { context: 128000 },
        tool_call: true,
      },
      "gpt-4o-mini": {
        id: "gpt-4o-mini",
        cost: { input: 0.15, output: 0.6 },
        limit: { context: 128000 },
        tool_call: true,
      },
    },
  },
  free_provider: {
    id: "free_provider",
    name: "Free Provider",
    models: {
      "always-free": {
        id: "always-free",
        cost: { input: 0, output: 0 },
        tool_call: false,
      },
    },
  },
};

function mockFetchOk(): void {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => SAMPLE_JSON,
  })) as unknown as typeof fetch);
}

function mockFetchFail(): void {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: false,
  })) as unknown as typeof fetch);
}

beforeEach(() => {
  clearExternalModelCatalogCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchExternalModelCatalog", () => {
  it("flattens models.dev json into a searchable list with raw cost", async () => {
    mockFetchOk();
    const entries = await fetchExternalModelCatalog();
    expect(entries.length).toBe(5);
    const free = entries.find((e) => e.id === "always-free");
    expect(free).toBeDefined();
    expect(free!.cost).toEqual({ input: 0, output: 0 });
    const paid = entries.find((e) => e.id === "gpt-4o");
    expect(paid!.cost).toEqual({ input: 2.5, output: 10 });
    expect(paid!.contextLength).toBe(128000);
    expect(paid!.supportsTools).toBe(true);
    expect(paid!.label).toBe("OpenAI");
  });

  it("caches the catalog across calls", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => SAMPLE_JSON })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);
    await fetchExternalModelCatalog();
    await fetchExternalModelCatalog();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns empty array on network failure with nothing cached", async () => {
    mockFetchFail();
    const entries = await fetchExternalModelCatalog();
    expect(entries).toEqual([]);
  });
});

describe("searchExternalModels", () => {
  beforeEach(() => mockFetchOk());

  it("finds models by substring across providers", async () => {
    const res = await searchExternalModels({ query: "deepseek" });
    expect(res.some((m) => m.id === "deepseek-chat")).toBe(true);
    expect(res.some((m) => m.id === "deepseek-free")).toBe(true);
  });

  it("filters by provider", async () => {
    const res = await searchExternalModels({ query: "free", provider: "deepseek" });
    expect(res.every((m) => m.provider === "deepseek")).toBe(true);
  });

  it("empty query returns no matches", async () => {
    const res = await searchExternalModels({ query: "   " });
    expect(res).toEqual([]);
  });

  it("respects the limit", async () => {
    const res = await searchExternalModels({ query: "a", limit: 1 });
    expect(res.length).toBeLessThanOrEqual(1);
  });
});
