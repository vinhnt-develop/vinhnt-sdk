import type { ModelProvider } from "@vinhnt-sdk/agent-core";
import { AiSdkModelProvider, type AiProvider } from "./ai-sdk-adapter.js";
import { getCapabilities, listFeatures, type ProviderCapabilities, type ProviderFeature } from "./capabilities.js";
import { matchProvider } from "./model-patterns.js";
import { PROVIDER_CATALOG, listCatalogProviders, type ProviderCatalogEntry } from "./provider-catalog.js";
import { searchExternalModels, fetchExternalModelCatalog, type ExternalModelInfo, type ExternalModelCost } from "./model-catalog.js";

/** models.dev catalog provider id → curated provider name merge (dedupe). */
const MODELS_DEV_PROVIDER_ALIASES: Record<string, string> = {
  "ollama-cloud": "ollama",
};

export interface ProviderConfig {
  type: AiProvider;
  label: string;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  /** Custom HTTP headers merged into every request (config `provider.headers`). */
  headers?: Record<string, string>;
  /** Extra JSON fields merged into every request body (config `provider.body`). */
  body?: Record<string, unknown>;
  /** Model IDs hidden from the picker (config `provider.blacklist`). */
  blacklist?: string[];
  /** Only these model IDs are shown; empty = show all (config `provider.whitelist`). */
  whitelist?: string[];
}

export interface ModelEntry {
  id: string;
  provider: string;
  /**
   * Live context length when the provider's /models reports it. `undefined` =
   * genuinely unknown — never fabricate a number here.
   */
  contextLength?: number;
  /**
   * Real per-model pricing (USD / 1M tokens) when the provider's /models (or
   * the models.dev catalog) reports it. `undefined` = genuinely unknown —
   * never fabricate {0,0} here, because that is indistinguishable from "free".
   */
  pricing?: { prompt: number; completion: number };
  /** Raw published cost from the models.dev catalog, enriched generically
   *  (see `ExternalModelCost`). `undefined` = provider publishes no per-token
   *  price (billed by usage/plan, e.g. Ollama Cloud) — that is "unknown",
   *  never free and never paid. */
  cost?: ExternalModelCost;
  supportsTools: boolean;
}

export interface ProviderWithCapabilities {
  name: string;
  type: AiProvider;
  label: string;
  baseUrl?: string;
  defaultModel?: string;
  configured: boolean;
  capabilities: ProviderCapabilities;
  features: ProviderFeature[];
  keyUrl?: string;
  docsUrl?: string;
  keyHint?: string;
  notes?: string;
  verified?: boolean;
  local?: boolean;
  gateway?: boolean;
}

interface ModelListCache {
  models: ModelEntry[];
  timestamp: number;
}

function catalogToProviderConfig(entry: ProviderCatalogEntry): ProviderConfig {
  return {
    type: entry.type,
    label: entry.label,
    baseUrl: entry.baseUrl,
  };
}

/** Built-in providers derived from the curated provider catalog. */
const BUILTIN_PROVIDERS: Record<string, ProviderConfig> = (() => {
  const map: Record<string, ProviderConfig> = {};
  for (const entry of Object.values(PROVIDER_CATALOG)) {
    map[entry.id] = catalogToProviderConfig(entry);
  }
  return map;
})();

const API_KEY_PATTERNS: Array<{ pattern: RegExp; type: AiProvider; label: string }> = [
  { pattern: /^sk-proj-/i,    type: "openai",            label: "OpenAI" },
  { pattern: /^sk-ant-/i,     type: "anthropic",         label: "Anthropic" },
  { pattern: /^gsk_/i,        type: "openai-compatible", label: "Groq" },
  { pattern: /^gpi_/i,        type: "openai-compatible", label: "Together AI" },
  { pattern: /^8x[A-Za-z0-9]{30,}$/, type: "openai-compatible", label: "Mistral AI" },
];

const BASE_URL_PROVIDER_MAP: Array<{ urlPattern: RegExp; name: string }> = [
  { urlPattern: /openai\.com/i,       name: "openai" },
  { urlPattern: /anthropic\.com/i,     name: "anthropic" },
  { urlPattern: /googleapis\.com/i,    name: "gemini" },
  { urlPattern: /groq\.com/i,          name: "groq" },
  { urlPattern: /mistral\.ai/i,        name: "mistral" },
  { urlPattern: /together\.xyz/i,      name: "together" },
  { urlPattern: /deepseek\.com/i,      name: "deepseek" },
  { urlPattern: /perplexity\.ai/i,     name: "perplexity" },
  { urlPattern: /replicate\.com/i,     name: "replicate" },
  { urlPattern: /cohere\.ai/i,         name: "cohere" },
  { urlPattern: /openrouter\.ai/i,     name: "openrouter" },
];

/** Attempt to fetch model list from OpenAI-compatible /models endpoint */
async function fetchCompatibleModels(baseUrl: string, apiKey: string): Promise<{ models: ModelEntry[]; error?: string }> {
  const url = `${baseUrl.replace(/\/+$/, "")}/models`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { models: [], error: `HTTP ${res.status} from ${url}` };
    const body = (await res.json()) as { data?: Array<Record<string, unknown>> };
    if (!body.data) return { models: [], error: `No "data" array in ${url}` };
    return {
      models: body.data.map((m) => {
        // Parse real per-1M-token pricing when the endpoint reports it (some
        // providers, e.g. OpenRouter, return it as strings). `undefined` = the
        // endpoint reports none — "unknown", never fabricated 0/free.
        const rawPricing = m.pricing as Record<string, unknown> | undefined;
        const promptRaw = rawPricing?.prompt;
        const completionRaw = rawPricing?.completion;
        const prompt = typeof promptRaw === "string" || typeof promptRaw === "number"
          ? Number.parseFloat(String(promptRaw))
          : undefined;
        const completion = typeof completionRaw === "string" || typeof completionRaw === "number"
          ? Number.parseFloat(String(completionRaw))
          : undefined;
        const pricing = prompt !== undefined && completion !== undefined && !isNaN(prompt) && !isNaN(completion)
          ? { prompt, completion }
          : undefined;
        // Tool capability: OpenAI-compatible endpoints may list a
        // `supported_parameters` array (OpenRouter style). Default to true —
        // OpenAI-compatible tools are the norm for /models endpoints.
        const supportedParams = m.supported_parameters;
        const supportsTools = Array.isArray(supportedParams)
          ? supportedParams.includes("tools")
          : true;
        return {
          id: m.id as string,
          provider: url,
          contextLength: (m.context_length as number | undefined) ?? undefined,
          pricing,
          supportsTools,
        };
      }),
    };
  } catch (err) {
    return { models: [], error: `Network error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** OpenAI-specific model list endpoint */
async function fetchOpenAiModels(apiKey: string): Promise<{ models: ModelEntry[]; error?: string }> {
  return fetchCompatibleModels("https://api.openai.com/v1", apiKey);
}

/** Anthropic-specific model list endpoint */
async function fetchAnthropicModels(apiKey: string): Promise<{ models: ModelEntry[]; error?: string }> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { models: [], error: `HTTP ${res.status} from https://api.anthropic.com/v1/models` };
    const body = (await res.json()) as { data?: Array<{ id: string }> };
    if (!body.data) return { models: [], error: "No \"data\" array in Anthropic model list" };
    return {
      models: body.data.map((m: { id: string }) => ({
        id: m.id,
        provider: "anthropic",
        supportsTools: true,
      })),
    };
  } catch (err) {
    return { models: [], error: `Network error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** Gemini model list endpoint */
async function fetchGeminiModels(apiKey: string): Promise<{ models: ModelEntry[]; error?: string }> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { models: [], error: `HTTP ${res.status} from ${url}` };
    const body = (await res.json()) as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> };
    if (!body.models) return { models: [], error: "No \"models\" array in Gemini model list" };
    return {
      models: body.models
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => {
          const shortId = m.name.split("/").pop() ?? m.name;
          return {
            id: shortId,
            provider: "gemini",
            supportsTools: true,
          };
        }),
    };
  } catch (err) {
    return { models: [], error: `Network error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

export class MultiProviderRegistry {
  private cacheTtlMs: number;
  private providers = new Map<string, ProviderConfig>(Object.entries(BUILTIN_PROVIDERS));
  private modelListCaches = new Map<string, ModelListCache>();

  constructor(cacheTtlMs?: number) {
    this.cacheTtlMs = cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  }

  /** Update cache TTL at runtime */
  setCacheTtlMs(ms: number): void {
    this.cacheTtlMs = ms;
  }

  registerProvider(name: string, config: ProviderConfig): void {
    this.providers.set(name, config);
  }

  getProvider(name: string): ProviderConfig | undefined {
    return this.providers.get(name);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  listProvidersWithCapabilities(): ProviderWithCapabilities[] {
    return Array.from(this.providers.entries()).map(([name, cfg]) => {
      const cat = PROVIDER_CATALOG[name];
      return {
        name,
        type: cfg.type,
        label: cfg.label,
        baseUrl: cfg.baseUrl,
        defaultModel: cfg.defaultModel,
        configured: !!cfg.apiKey,
        capabilities: getCapabilities(name),
        features: listFeatures(name),
        keyUrl: cat?.keyUrl,
        docsUrl: cat?.docsUrl,
        keyHint: cat?.keyHint,
        notes: cat?.notes,
        verified: cat?.verified,
        local: cat?.local,
        gateway: cat?.gateway,
      };
    });
  }

  /** Full curated provider catalog (Settings → Models picker). */
  listCatalog(): ProviderCatalogEntry[] {
    return listCatalogProviders();
  }

  /**
   * Auto-register providers from config `.providers` entries.
   * Detects provider type from base URL or API key pattern for unknown providers.
   */
  registerProvidersFromConfig(configProviders: Record<string, { apiKey?: string; baseUrl?: string; headers?: Record<string, string>; body?: Record<string, unknown>; blacklist?: string[]; whitelist?: string[] }>): void {
    for (const [rawName, cfg] of Object.entries(configProviders)) {
      // Merge models.dev catalog aliases into the curated provider name so a
      // config entry with an aliased id doesn't appear as a duplicate with no
      // models (e.g. models.dev calls the same service "ollama-cloud").
      const name = MODELS_DEV_PROVIDER_ALIASES[rawName] ?? rawName;
      const apiKey = cfg?.apiKey;
      // Normalize trailing slashes so cache keys always match regardless of how
      // the endpoint was written in config.
      const baseUrl = cfg?.baseUrl ? cfg.baseUrl.replace(/\/+$/, "") : undefined;
      if (!apiKey && !baseUrl && !cfg?.headers && !cfg?.body) continue;

      const existing = this.providers.get(name);
      if (existing) {
        if (apiKey) existing.apiKey = apiKey;
        if (baseUrl) {
          // baseUrl drives both the fetch endpoint and the model-list cache key —
          // changing it must invalidate any cached models for this provider.
          if (existing.baseUrl !== baseUrl) this.modelListCaches.delete(this.cacheKey(name, existing.baseUrl));
          existing.baseUrl = baseUrl;
        }
        if (cfg?.headers) existing.headers = cfg.headers;
        if (cfg?.body) existing.body = cfg.body;
        if (cfg?.blacklist) existing.blacklist = cfg.blacklist;
        if (cfg?.whitelist) existing.whitelist = cfg.whitelist;
        continue;
      }

      const type = this.detectProviderType(name, baseUrl, apiKey);
      const label = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
      this.providers.set(name, {
        type, label, apiKey, baseUrl,
        ...(cfg?.headers ? { headers: cfg.headers } : {}),
        ...(cfg?.body ? { body: cfg.body } : {}),
        ...(cfg?.blacklist ? { blacklist: cfg.blacklist } : {}),
        ...(cfg?.whitelist ? { whitelist: cfg.whitelist } : {}),
      });
    }
  }

  private detectProviderType(_name: string, baseUrl?: string, apiKey?: string): AiProvider {
    if (baseUrl) {
      const match = BASE_URL_PROVIDER_MAP.find((e) => e.urlPattern.test(baseUrl));
      if (match) {
        const existing = BUILTIN_PROVIDERS[match.name];
        if (existing) return existing.type;
      }
    }

    if (apiKey) {
      const match = API_KEY_PATTERNS.find((e) => e.pattern.test(apiKey));
      if (match) return match.type;
    }

    return "openai-compatible";
  }

  async createModel(providerName: string, model?: string, apiKey?: string): Promise<ModelProvider | null> {
    const cfg = this.providers.get(providerName);
    if (!cfg) return null;
    const modelName = model ?? cfg.defaultModel;
    if (!modelName) return null;
    const key = apiKey ?? cfg.apiKey;
    return new AiSdkModelProvider(cfg.type, modelName, key, cfg.baseUrl, undefined, cfg.headers, cfg.body);
  }

  /**
   * Discover the models an OpenAI-compatible endpoint ACTUALLY supports by
   * live-fetching its `/models` list (baseUrl + apiKey may be unsaved — e.g. a
   * provider being configured in Settings). Raw published cost from the
   * models.dev catalog is attached when the endpoint itself reports none —
   * never a derived free/paid flag. The static catalog is NOT the source here;
   * the endpoint itself is.
   */
  async discoverEndpointModels(
    baseUrl: string,
    apiKey: string,
    providerName: string,
  ): Promise<{ models: ModelEntry[]; error?: string }> {
    const fetched = await fetchCompatibleModels(baseUrl, apiKey);
    if (fetched.error) return { models: [], error: fetched.error };
    const catalogByKey = new Map((await fetchExternalModelCatalog()).map((e) => [`${e.provider}/${e.id}`, e]));
    const models = fetched.models.map((m) => {
      const ext = catalogByKey.get(`${providerName}/${m.id}`);
      // Attach the catalog's raw published cost when the live /models response
      // has none. Missing cost stays `undefined` (unknown) — never guessed.
      return { ...m, provider: providerName, cost: m.pricing ? undefined : ext?.cost };
    });
    return { models };
  }

  /**
   * Resolve a model ID to a provider and create a ModelProvider instance.
   * Uses smart pattern matching when provider prefix is not specified.
   */
  async resolveModelToProvider(modelId: string): Promise<ModelProvider | null> {
    const parts = modelId.split("/", 2);
    if (parts.length === 2 && this.providers.has(parts[0]!)) {
      return this.createModel(parts[0]!, parts[1]!);
    }

    const providerName = await this.resolveBestProvider(modelId);
    if (!providerName) return null;
    return this.createModel(providerName, modelId);
  }

  private async fetchProviderModels(name: string, apiKey: string): Promise<{ models: ModelEntry[]; error?: string }> {
    const cfg = this.providers.get(name);
    switch (name) {
      case "openai":
        return fetchOpenAiModels(apiKey);
      case "anthropic":
        return fetchAnthropicModels(apiKey);
      case "gemini":
        return fetchGeminiModels(apiKey);
      default:
        // Any provider with a configured baseUrl (ollama, openai-compatible,
        // custom registrations) exposes an OpenAI-compatible /models endpoint.
        if (cfg?.baseUrl) return fetchCompatibleModels(cfg.baseUrl, apiKey);
        return { models: [], error: `Provider "${name}" has no baseUrl configured` };
    }
  }

  /** Get known models for a provider (from cache or fetch) */
  async getProviderModels(name: string, apiKey?: string): Promise<{ models: ModelEntry[]; error?: string }> {
    const cfg = this.providers.get(name);
    if (!cfg) return { models: [], error: `Provider "${name}" not found` };
    const key = apiKey ?? cfg.apiKey;
    if (!key) return { models: [], error: `Provider "${name}" has no API key` };

    const now = Date.now();
    const cacheKey = this.cacheKey(name, cfg.baseUrl);
    const cached = this.modelListCaches.get(cacheKey);
    if (cached && (now - cached.timestamp) < this.cacheTtlMs) {
      return { models: this.applyModelFilters(name, cached.models) };
    }

    const fetched = await this.fetchProviderModels(name, key);
    if (fetched.models.length > 0) {
      this.modelListCaches.set(cacheKey, { models: fetched.models, timestamp: now });
    }
    const filtered = this.applyModelFilters(name, fetched.models.length > 0 ? fetched.models : (cached?.models ?? []));
    return filtered.length > 0 ? { models: filtered } : { models: filtered, error: fetched.error ?? "No models returned from provider" };
  }

  /**
   * Apply a provider's configured blacklist/whitelist to a fetched model list.
   * Whitelist (non-empty) keeps only matching ids; blacklist removes matching ids.
   */
  private applyModelFilters(name: string, models: ModelEntry[]): ModelEntry[] {
    const cfg = this.providers.get(name);
    if (!cfg) return models;
    let result = models;
    if (cfg.whitelist && cfg.whitelist.length > 0) {
      result = result.filter((m) => cfg.whitelist!.includes(m.id));
    }
    if (cfg.blacklist && cfg.blacklist.length > 0) {
      result = result.filter((m) => !cfg.blacklist!.includes(m.id));
    }
    return result;
  }

  /** Model-list cache key — includes baseUrl so an endpoint change never serves stale models. */
  private cacheKey(name: string, baseUrl?: string): string {
    return `${name}|${baseUrl ?? ""}`;
  }

  async listAvailableModels(apiKeys: Record<string, string>): Promise<{ models: ModelEntry[]; errors: Record<string, string> }> {
    const result: ModelEntry[] = [];
    const errors: Record<string, string> = {};

    for (const [name, cfg] of this.providers) {
      const key = apiKeys[name] ?? cfg.apiKey;

      if (!key && !cfg.baseUrl) continue;

      if (key) {
        const { models: live, error } = await this.getProviderModels(name, key);
        if (live.length > 0) {
          for (const m of live) {
            result.push({ ...m, provider: name });
          }
        } else {
          // Provider has a key but the model fetch failed — surface the reason
          // instead of emitting a phantom default model.
          errors[name] = error ?? "No models returned from provider";
        }
      } else if (cfg.baseUrl && /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(cfg.baseUrl)) {
        // Local OpenAI-compatible endpoint (Ollama /v1, LM Studio, vLLM) with no
        // saved key — best-effort live /models fetch; local servers accept an
        // empty bearer token. Failure is silent (server may simply not be running).
        const { models: live } = await fetchCompatibleModels(cfg.baseUrl, "");
        const filtered = this.applyModelFilters(name, live);
        if (filtered.length > 0) {
          for (const m of filtered) {
            result.push({ ...m, provider: name });
          }
        }
      }
    }

    // Generic cost enrichment — the ONLY place cost is attached, and it is
    // provider-agnostic: real per-model pricing (reported by the provider or
    // the static pricing table) wins; otherwise the models.dev catalog's raw
    // published cost is attached; otherwise `cost` stays undefined = unknown
    // (provider publishes no per-token price, e.g. Ollama Cloud). No derived
    // free/paid flag anywhere.
    const catalogByKey = new Map((await fetchExternalModelCatalog()).map((e) => [`${e.provider}/${e.id}`, e]));
    const enriched = result.map((m) => {
      const cost: ExternalModelCost | undefined = m.pricing
        ? { input: m.pricing.prompt, output: m.pricing.completion }
        : catalogByKey.get(`${m.provider}/${m.id}`)?.cost;
      return { ...m, cost };
    });

    return { models: enriched, errors };
  }

  async resolveBestProvider(modelId: string): Promise<string | null> {
    // Try exact defaultModel match
    for (const [name, cfg] of this.providers) {
      if (cfg.defaultModel === modelId) return name;
    }

    // Try provider/model prefix
    for (const [name] of this.providers) {
      if (modelId.startsWith(name + "/")) return name;
      const providerType = this.providers.get(name)?.type;
      if (providerType && modelId.startsWith(providerType + "/")) return name;
    }

    // Try smart pattern matching from model-patterns.ts
    const matchedProvider = matchProvider(modelId);
    if (matchedProvider && this.providers.has(matchedProvider)) return matchedProvider;

    return null;
  }

  searchModels(query: string, models: ModelEntry[]): ModelEntry[] {
    const q = query.toLowerCase();
    return models.filter((m) => m.id.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q));
  }

  /**
   * Search the cross-provider external catalog (models.dev) — works with NO
   * API key and covers far more providers than the live /models list. Used as
   * a fallback in the Settings → Models search box when a provider's live list
   * is empty/incomplete. Pricing stays raw (per-1M published cost or none).
   */
  searchExternalModels(query: string, provider?: string): Promise<ExternalModelInfo[]> {
    return searchExternalModels({ query, provider });
  }

  filterByProvider(providerName: string, models: ModelEntry[]): ModelEntry[] {
    return models.filter((m) => m.provider === providerName);
  }

  filterToolCapable(models: ModelEntry[]): ModelEntry[] {
    return models.filter((m) => m.supportsTools);
  }

  sortByContextLength(models: ModelEntry[], desc = true): ModelEntry[] {
    return [...models].sort((a, b) => {
      const ac = a.contextLength ?? 0;
      const bc = b.contextLength ?? 0;
      return desc ? bc - ac : ac - bc;
    });
  }

  clearAllCaches(): void {
    this.modelListCaches.clear();
  }
}

export function createDefaultRegistry(cacheTtlMs?: number): MultiProviderRegistry {
  return new MultiProviderRegistry(cacheTtlMs);
}
