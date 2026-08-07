import { describe, expect, it, beforeEach } from "vitest";
import { MultiProviderRegistry, createDefaultRegistry } from "../src/multi-provider.js";

describe("MultiProviderRegistry", () => {
  let registry: MultiProviderRegistry;

  beforeEach(() => {
    registry = createDefaultRegistry();
  });

  it("lists built-in providers", () => {
    const providers = registry.listProviders();
    expect(providers.length).toBeGreaterThanOrEqual(10);
    expect(providers).toContain("openai");
    expect(providers).toContain("anthropic");
    expect(providers).toContain("gemini");
    expect(providers).toContain("groq");
    expect(providers).toContain("deepseek");
  });

  it("getProvider returns config for known provider", () => {
    const cfg = registry.getProvider("openai");
    expect(cfg).toBeDefined();
    expect(cfg!.type).toBe("openai");
    expect(cfg!.label).toBe("OpenAI");
  });

  it("getProvider returns undefined for unknown provider", () => {
    const cfg = registry.getProvider("nonexistent");
    expect(cfg).toBeUndefined();
  });

  it("registerProvider adds a custom provider", () => {
    registry.registerProvider("custom", {
      type: "openai-compatible",
      label: "Custom AI",
      baseUrl: "https://custom.ai/v1",
    });

    const cfg = registry.getProvider("custom");
    expect(cfg).toBeDefined();
    expect(cfg!.type).toBe("openai-compatible");
    expect(cfg!.baseUrl).toBe("https://custom.ai/v1");
    expect(registry.listProviders()).toContain("custom");
  });

  it("createModel returns null for unknown provider", async () => {
    const model = await registry.createModel("nonexistent");
    expect(model).toBeNull();
  });

  it("createModel returns a provider for known provider", async () => {
    const model = await registry.createModel("openai", "gpt-4o-mini", "sk-test");
    expect(model).not.toBeNull();
    expect(model!.model).toBe("gpt-4o-mini");
  });

  it("createModel returns null when no model is specified", async () => {
    // No hardcoded default model — a model must always be chosen explicitly.
    const model = await registry.createModel("openai", undefined, "sk-test");
    expect(model).toBeNull();
  });

  it("reports fetch errors for configured providers instead of phantom models", async () => {
    const { models, errors } = await registry.listAvailableModels({
      openai: "sk-test",
      anthropic: "sk-ant-test",
    });

    // Fake keys cannot reach the live model endpoints, so no phantom "gpt-4o"
    // entries should be emitted — instead a fetch error is surfaced per provider.
    expect(models.filter((m) => m.provider === "openai").length).toBe(0);
    expect(models.filter((m) => m.provider === "anthropic").length).toBe(0);
    expect(errors.openai).toBeTruthy();
    expect(errors.anthropic).toBeTruthy();
  });

  it("listAvailableModels without keys never fetches and emits no phantom models", async () => {
    const { models, errors } = await registry.listAvailableModels({});
    // No keys → no live model fetches, so no fetch errors.
    expect(Object.keys(errors).length).toBe(0);
    // Providers without keys emit NO phantom default-model entries at all.
    expect(models.find((m) => m.provider === "anthropic")).toBeUndefined();
    expect(models.find((m) => m.provider === "gemini")).toBeUndefined();
    expect(models.find((m) => m.provider === "openai")).toBeUndefined();
  });

  it("resolveBestProvider for known model ID", async () => {
    const provider = await registry.resolveBestProvider("gpt-4o");
    expect(provider).toBe("openai");
  });

  it("resolveBestProvider routes provider-prefixed models to that provider", async () => {
    const provider = await registry.resolveBestProvider("openai/gpt-4o");
    expect(provider).toBe("openai");
  });

  it("resolveBestProvider returns null for unknown model", async () => {
    const provider = await registry.resolveBestProvider("unknown/model/xyz");
    expect(provider).toBeNull();
  });

  // -------------------------------------------------------------------
  // Provider Capabilities
  // -------------------------------------------------------------------
  it("listProvidersWithCapabilities returns all providers with capability info", () => {
    const providers = registry.listProvidersWithCapabilities();
    expect(providers.length).toBeGreaterThanOrEqual(12);
    const openai = providers.find((p) => p.name === "openai");
    expect(openai).toBeDefined();
    expect(openai!.type).toBe("openai");
    expect(openai!.capabilities.streaming).toBe(true);
    expect(openai!.capabilities.tools).toBe(true);
    expect(openai!.configured).toBe(false);
    expect(openai!.features.length).toBeGreaterThan(0);
  });

  it("listProvidersWithCapabilities includes features list", () => {
    const providers = registry.listProvidersWithCapabilities();
    const anthropic = providers.find((p) => p.name === "anthropic")!;
    expect(anthropic.features.map((f) => f.name)).toContain("thinking");
    expect(anthropic.features.find((f) => f.name === "thinking")!.supported).toBe(true);
  });

  // -------------------------------------------------------------------
  // Config-Driven Provider Registration
  // -------------------------------------------------------------------
  it("registerProvidersFromConfig updates existing provider with apiKey", () => {
    registry.registerProvidersFromConfig({
      openai: { apiKey: "sk-proj-test-key" },
    });
    const cfg = registry.getProvider("openai");
    expect(cfg).toBeDefined();
    expect(cfg!.apiKey).toBe("sk-proj-test-key");
  });

  it("registerProvidersFromConfig adds new provider with baseUrl detection", () => {
    registry.registerProvidersFromConfig({
      myhost: { apiKey: "xai-test-key", baseUrl: "https://api.x.ai/v1" },
    });
    const cfg = registry.getProvider("myhost");
    expect(cfg).toBeDefined();
    expect(cfg!.type).toBe("openai-compatible");
    expect(cfg!.label).toBe("Myhost");
  });

  it("registerProvidersFromConfig detects Anthropic from apiKey pattern", () => {
    registry.registerProvidersFromConfig({
      customClaude: { apiKey: "sk-ant-test-key-abc123" },
    });
    const cfg = registry.getProvider("customClaude");
    expect(cfg).toBeDefined();
    expect(cfg!.type).toBe("anthropic");
  });

  it("registerProvidersFromConfig detects OpenAI from apiKey pattern", () => {
    registry.registerProvidersFromConfig({
      myOpenai: { apiKey: "sk-proj-my-real-key" },
    });
    const cfg = registry.getProvider("myOpenai");
    expect(cfg).toBeDefined();
    expect(cfg!.type).toBe("openai");
  });

  it("registerProvidersFromConfig skips entries without apiKey or baseUrl", () => {
    registry.registerProvidersFromConfig({
      empty: {},
    });
    expect(registry.getProvider("empty")).toBeUndefined();
  });

  it("registerProvidersFromConfig captures headers/body/blacklist/whitelist", () => {
    registry.registerProvidersFromConfig({
      myEdge: {
        apiKey: "sk-proj-edge-key",
        headers: { "X-Org": "acme" },
        body: { foo: "bar" },
        blacklist: ["model-a"],
        whitelist: ["model-a", "model-b"],
      },
    });
    const cfg = registry.getProvider("myEdge");
    expect(cfg).toBeDefined();
    expect(cfg!.headers).toEqual({ "X-Org": "acme" });
    expect(cfg!.body).toEqual({ foo: "bar" });
    expect(cfg!.blacklist).toEqual(["model-a"]);
    expect(cfg!.whitelist).toEqual(["model-a", "model-b"]);
  });

  it("applyModelFilters keeps only whitelisted ids and drops blacklisted ids", async () => {
    registry.registerProvidersFromConfig({
      filtered: {
        baseUrl: "http://127.0.0.1:9999/v1",
        whitelist: ["keep", "also-keep", "drop"],
        blacklist: ["drop"],
      },
    });
    const cfg = registry.getProvider("filtered")!;
    const filtered = (registry as unknown as { applyModelFilters(name: string, models: { id: string }[]): unknown[] });
    const result = filtered.applyModelFilters("filtered", [
      { id: "keep" },
      { id: "drop" },
      { id: "other" },
      { id: "also-keep" },
    ] as never) as { id: string }[];
    expect(result.map((m) => m.id)).toEqual(["keep", "also-keep"]);
    void cfg;
  });

  // -------------------------------------------------------------------
  // Smart Model Resolution
  // -------------------------------------------------------------------
  it("resolveBestProvider matches OpenAI models by pattern", async () => {
    const provider = await registry.resolveBestProvider("gpt-4o-mini");
    expect(provider).toBe("openai");
  });

  it("resolveBestProvider matches Anthropic models by pattern", async () => {
    const provider = await registry.resolveBestProvider("claude-sonnet-4");
    expect(provider).toBe("anthropic");
  });

  it("resolveBestProvider matches Gemini models by pattern", async () => {
    const provider = await registry.resolveBestProvider("gemini-2.5-pro");
    expect(provider).toBe("gemini");
  });

  it("resolveBestProvider matches Mistral models by pattern", async () => {
    const provider = await registry.resolveBestProvider("mistral-large-latest");
    expect(provider).toBe("mistral");
  });

  it("resolveBestProvider matches DeepSeek models by pattern", async () => {
    const provider = await registry.resolveBestProvider("deepseek-chat");
    expect(provider).toBe("deepseek");
  });

  it("resolveBestProvider matches Groq models by pattern (llama)", async () => {
    const provider = await registry.resolveBestProvider("llama-3.3-70b-versatile");
    expect(provider).toBe("groq");
  });

  it("resolveBestProvider matches Perplexity models by pattern", async () => {
    const provider = await registry.resolveBestProvider("sonar-pro");
    expect(provider).toBe("perplexity");
  });

  it("resolveBestProvider prefers exact defaultModel match over pattern", async () => {
    const provider = await registry.resolveBestProvider("claude-sonnet-4");
    expect(provider).toBe("anthropic");
  });

  it("resolveBestProvider handles provider/ prefix before fallback", async () => {
    const provider = await registry.resolveBestProvider("openrouter/anthropic/claude-3");
    // Should match openrouter prefix first
    expect(provider).toBe("openrouter");
  });

  // -------------------------------------------------------------------
  // resolveModelToProvider
  // -------------------------------------------------------------------
  it("resolveModelToProvider creates provider for known model ID", async () => {
    const provider = await registry.resolveModelToProvider("gpt-4o");
    expect(provider).not.toBeNull();
    expect(provider!.model).toBe("gpt-4o");
  });

  it("resolveModelToProvider handles provider/modelID format", async () => {
    const provider = await registry.resolveModelToProvider("openai/gpt-4o-mini");
    expect(provider).not.toBeNull();
    expect(provider!.model).toBe("gpt-4o-mini");
  });

  it("resolveModelToProvider returns null for unknown model", async () => {
    const provider = await registry.resolveModelToProvider("totally-fake-model-2025");
    expect(provider).toBeNull();
  });
});
