/**
 * Cross-provider model catalog (models.dev api.json) used as a searchable
 * fallback when a provider's live /models list is empty or a provider isn't
 * configured at all. This mirrors how OpenCode sources its model picker:
 * fetch the community-maintained models.dev snapshot, cache it briefly and
 * filter it on demand — no provider API key required.
 *
 * We surface the catalog's RAW cost data and let callers (UI/API) decide how
 * to display it. We do NOT invent a boolean "free" flag here: models.dev has
 * no such field, and a model with no published per-token price (e.g. Ollama
 * Cloud, which bills by GPU-time usage allowance) is "no price published",
 * not "free" and not "paid".
 */

const MODELS_DEV_URL = "https://models.dev/api.json";
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Raw per-1M-token pricing (USD) as published by models.dev. A field is
 *  absent when the provider publishes no price for it — this is "unknown",
 *  never $0. */
export interface ExternalModelCost {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheCreation?: number;
  reasoning?: number;
  monthlyRequest?: number;
}

export interface ExternalModelInfo {
  id: string;
  provider: string;
  label: string;
  contextLength?: number;
  /** Published per-1M-token pricing. `undefined` = provider publishes none
   *  (billed by usage allowance / plan, e.g. Ollama Cloud). */
  cost?: ExternalModelCost;
  supportsTools?: boolean;
  openWeights?: boolean;
}

interface ModelsDevModel {
  id?: string;
  name?: string;
  cost?: { input?: number; output?: number; cache_read?: number; cache_creation?: number; reasoning?: number; monthly_request?: number };
  limit?: { context?: number; input?: number; output?: number };
  tool_call?: boolean;
  reasoning?: boolean;
  open_weights?: boolean;
}

interface ModelsDevProvider {
  id?: string;
  name?: string;
  models?: Record<string, ModelsDevModel>;
}

interface CatalogCache {
  entries: ExternalModelInfo[];
  timestamp: number;
}

let catalogCache: CatalogCache | null = null;

/** Flatten models.dev api.json into a single searchable list, keeping the raw
 *  cost data exactly as published (no derived free/paid classification). */
function flattenModelsDev(json: Record<string, ModelsDevProvider>): ExternalModelInfo[] {
  const entries: ExternalModelInfo[] = [];
  for (const [providerId, provider] of Object.entries(json)) {
    if (!provider?.models) continue;
    const providerName = providerId;
    const label = provider.name ?? providerName;
    for (const [modelId, model] of Object.entries(provider.models)) {
      if (!model) continue;
      const cost = model.cost;
      entries.push({
        id: model.id ?? modelId,
        provider: providerName,
        label,
        contextLength: model.limit?.context,
        cost: cost
          ? {
              input: cost.input,
              output: cost.output,
              cacheRead: cost.cache_read,
              cacheCreation: cost.cache_creation,
              reasoning: cost.reasoning,
              monthlyRequest: cost.monthly_request,
            }
          : undefined,
        supportsTools: model.tool_call,
        openWeights: model.open_weights,
      });
    }
  }
  return entries;
}

/**
 * Fetch and flatten the models.dev catalog. Cached for `cacheTtlMs` (24h by
 * default). On network failure returns the last known catalog, or an empty
 * array when nothing is cached yet — callers should treat that as "no fallback
 * available" rather than an error.
 */
export async function fetchExternalModelCatalog(cacheTtlMs?: number): Promise<ExternalModelInfo[]> {
  const ttl = cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const now = Date.now();
  if (catalogCache && now - catalogCache.timestamp < ttl) return catalogCache.entries;

  try {
    const res = await fetch(MODELS_DEV_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return catalogCache?.entries ?? [];
    const json = (await res.json()) as Record<string, ModelsDevProvider>;
    const entries = flattenModelsDev(json);
    if (entries.length > 0) {
      catalogCache = { entries, timestamp: now };
      return entries;
    }
    return catalogCache?.entries ?? [];
  } catch {
    return catalogCache?.entries ?? [];
  }
}

/** Clear the cached models.dev snapshot (mainly for tests). */
export function clearExternalModelCatalogCache(): void {
  catalogCache = null;
}

export interface SearchExternalModelsOptions {
  /** Case-insensitive substring matched against model id or provider name. */
  query: string;
  /** Restrict results to a single provider id/name. */
  provider?: string;
  /** Cap on returned rows (default 50). */
  limit?: number;
}

/** Search the external catalog. Empty result ≠ error: use when no fallback exists. */
export async function searchExternalModels(opts: SearchExternalModelsOptions): Promise<ExternalModelInfo[]> {
  const q = opts.query.trim().toLowerCase();
  if (!q) return [];
  const provider = opts.provider?.trim().toLowerCase();
  const limit = opts.limit ?? 50;

  const entries = await fetchExternalModelCatalog();
  const matches = entries.filter((m) => {
    if (provider && m.provider.toLowerCase() !== provider && !m.label.toLowerCase().includes(provider)) return false;
    return m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q);
  });

  const dedup = new Map<string, ExternalModelInfo>();
  for (const m of matches) {
    const key = `${m.provider}/${m.id}`;
    if (!dedup.has(key)) dedup.set(key, m);
  }
  return Array.from(dedup.values()).slice(0, limit);
}
