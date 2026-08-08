import type { AiProvider } from "./ai-sdk-adapter.js";
import type { ProviderCapabilities } from "./capabilities.js";

/**
 * Default curated catalog of known LLM providers — CONVENIENCE ONLY.
 *
 * Export để user tham khảo và merge: `{ ...DEFAULT_PROVIDER_CATALOG, "my-provider": { ... } }`
 *
 * KHÔNG bắt buộc dùng catalog này. User có thể:
 * 1. Register provider mới qua MultiProviderRegistry
 * 2. Override entries bằng custom catalog
 * 3. Ignored entirely và tự cung cấp config
 *
 * NO model-specific info lives here: no default models, no pricing, no context
 * windows, no free-tier claims. Every model/pricing/context value is fetched
 * live from the provider's `/models` (or the models.dev catalog) at runtime —
 * providers change their catalogs, pricing and limits constantly.
 *
 * `verified` means the base URL was checked against the provider's docs / live
 * endpoint. `local` providers run on the developer's own machine and need no
 * API key.
 */
export interface ProviderCatalogEntry {
  id: string;
  label: string;
  type: AiProvider;
  /** Verified default OpenAI-compatible base URL (leave empty for native providers). */
  baseUrl?: string;
  /** Page where the developer can create an API key. */
  keyUrl: string;
  /** Provider documentation URL. */
  docsUrl?: string;
  /** Short hint for the key format, e.g. "sk-...". */
  keyHint?: string;
  /** Endpoint caveats worth showing in the UI. */
  notes?: string;
  /** Base URL verified against docs / a live probe. */
  verified?: boolean;
  /** Runs locally on the developer machine, no API key required. */
  local?: boolean;
  /** Gateway/aggregator that needs no provider registration. */
  gateway?: boolean;
  capabilities?: Partial<ProviderCapabilities>;
  /** URL for fetching model list (for model discovery). */
  modelListUrl?: string;
}

/**
 * Default provider catalog — convenience only.
 * User tự merge: `{ ...DEFAULT_PROVIDER_CATALOG, "my-provider": { ... } }`
 */
export const DEFAULT_PROVIDER_CATALOG: Record<string, ProviderCatalogEntry> = {
  openai: {
    id: "openai", label: "OpenAI", type: "openai",
    baseUrl: "https://api.openai.com/v1",
    keyUrl: "https://platform.openai.com/api-keys",
    docsUrl: "https://platform.openai.com/docs",
    keyHint: "sk-...",
    verified: true,
  },
  anthropic: {
    id: "anthropic", label: "Anthropic", type: "anthropic",
    keyUrl: "https://console.anthropic.com/settings/keys",
    docsUrl: "https://docs.anthropic.com",
    keyHint: "sk-ant-...",
    verified: true,
    capabilities: { thinking: true },
  },
  gemini: {
    id: "gemini", label: "Google Gemini", type: "gemini",
    keyUrl: "https://aistudio.google.com/apikey",
    docsUrl: "https://ai.google.dev/gemini-api/docs",
    keyHint: "AIza...",
    verified: true,
  },
  groq: {
    id: "groq", label: "Groq", type: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    keyUrl: "https://console.groq.com/keys",
    docsUrl: "https://console.groq.com/docs",
    keyHint: "gsk_...",
    verified: true,
    notes: "Base URL is /openai/v1 — NOT a bare /v1.",
  },
  mistral: {
    id: "mistral", label: "Mistral AI", type: "openai-compatible",
    baseUrl: "https://api.mistral.ai/v1",
    keyUrl: "https://console.mistral.ai/api-keys",
    docsUrl: "https://docs.mistral.ai",
    keyHint: "Mistral key",
    verified: true,
  },
  deepseek: {
    id: "deepseek", label: "DeepSeek", type: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    keyUrl: "https://platform.deepseek.com/api_keys",
    docsUrl: "https://api-docs.deepseek.com",
    keyHint: "sk-...",
    verified: true,
  },
  together: {
    id: "together", label: "Together AI", type: "openai-compatible",
    baseUrl: "https://api.together.xyz/v1",
    keyUrl: "https://api.together.ai/settings/api-keys",
    docsUrl: "https://docs.together.ai",
    keyHint: "Together key",
    verified: true,
  },
  perplexity: {
    id: "perplexity", label: "Perplexity", type: "openai-compatible",
    baseUrl: "https://api.perplexity.ai",
    keyUrl: "https://www.perplexity.ai/settings/api",
    docsUrl: "https://docs.perplexity.ai",
    keyHint: "pplx-...",
    verified: true,
    capabilities: { tools: false, vision: false },
  },
  xai: {
    id: "xai", label: "xAI (Grok)", type: "openai-compatible",
    baseUrl: "https://api.x.ai/v1",
    keyUrl: "https://console.x.ai/",
    keyHint: "xai-...",
    docsUrl: "https://docs.x.ai",
    verified: true,
    capabilities: { thinking: true },
  },
  fireworks: {
    id: "fireworks", label: "Fireworks AI", type: "openai-compatible",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    keyUrl: "https://fireworks.ai/api-keys",
    docsUrl: "https://docs.fireworks.ai",
    keyHint: "Fireworks key",
    verified: true,
  },
  cerebras: {
    id: "cerebras", label: "Cerebras", type: "openai-compatible",
    baseUrl: "https://api.cerebras.ai/v1",
    keyUrl: "https://cloud.cerebras.ai/platform/api-keys",
    docsUrl: "https://inference-docs.cerebras.ai",
    keyHint: "Cerebras key",
    verified: true,
  },
  sambanova: {
    id: "sambanova", label: "SambaNova", type: "openai-compatible",
    baseUrl: "https://api.sambanova.ai/v1",
    keyUrl: "https://cloud.sambanova.ai/apis",
    docsUrl: "https://docs.sambanova.ai",
    keyHint: "SambaNova key",
    verified: true,
  },
  deepinfra: {
    id: "deepinfra", label: "DeepInfra", type: "openai-compatible",
    baseUrl: "https://api.deepinfra.com/v1/openai",
    keyUrl: "https://deepinfra.com/dash/api_keys",
    docsUrl: "https://deepinfra.com/docs",
    keyHint: "DeepInfra key",
    verified: true,
  },
  hyper: {
    id: "hyper", label: "Hyperbolic", type: "openai-compatible",
    baseUrl: "https://api.hyperbolic.xyz/v1",
    keyUrl: "https://app.hyperbolic.xyz/settings",
    docsUrl: "https://docs.hyperbolic.xyz",
    keyHint: "Hyperbolic key",
    verified: true,
  },
  openrouter: {
    id: "openrouter", label: "OpenRouter", type: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    keyUrl: "https://openrouter.ai/keys",
    docsUrl: "https://openrouter.ai/docs",
    keyHint: "sk-or-...",
    verified: true,
    notes: "Aggregates hundreds of models behind one key. Use provider/model IDs like openai/gpt-4o.",
  },
  ollama: {
    id: "ollama", label: "Ollama (Cloud)", type: "ollama",
    baseUrl: "https://ollama.com/v1",
    keyUrl: "https://ollama.com/settings/keys",
    docsUrl: "https://docs.ollama.com",
    keyHint: "Ollama key",
    verified: true,
    notes: "Cloud: endpoint MUST be /v1 (OpenAI-compatible), NOT /api (native → 404). Model availability on your account varies by plan — the live /models list reflects what you can actually call.",
  },
  "ollama-local": {
    id: "ollama-local", label: "Ollama (Local)", type: "ollama",
    baseUrl: "http://localhost:11434/v1",
    keyUrl: "",
    docsUrl: "https://docs.ollama.com",
    keyHint: "",
    verified: true,
    local: true,
    notes: "Runs on your machine — no API key. Requires the Ollama app to be running (ollama serve).",
  },
  nvidia: {
    id: "nvidia", label: "NVIDIA NIM", type: "openai-compatible",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    keyUrl: "https://org.ngc.nvidia.com/setup/api-key",
    docsUrl: "https://build.nvidia.com/docs",
    keyHint: "nvapi-...",
    verified: true,
  },
  github: {
    id: "github", label: "GitHub Models", type: "openai-compatible",
    baseUrl: "https://models.inference.ai.azure.com",
    keyUrl: "https://github.com/settings/tokens",
    docsUrl: "https://docs.github.com/en/github-models",
    keyHint: "GitHub PAT (github_pat_...)",
    verified: true,
    notes: "Use a classic PAT (models scope) or fine-grained token.",
  },
  novita: {
    id: "novita", label: "Novita AI", type: "openai-compatible",
    baseUrl: "https://api.novita.ai/v3/openai",
    keyUrl: "https://novita.ai/settings/key-management",
    docsUrl: "https://docs.novita.ai",
    keyHint: "Novita key",
    verified: true,
  },
  cohere: {
    id: "cohere", label: "Cohere", type: "openai-compatible",
    baseUrl: "https://api.cohere.ai/v1",
    keyUrl: "https://dashboard.cohere.com/api-keys",
    docsUrl: "https://docs.cohere.com",
    keyHint: "Cohere key",
    verified: false,
    notes: "Confirm the OpenAI-compatible endpoint against the live /models list.",
  },
  replicate: {
    id: "replicate", label: "Replicate", type: "openai-compatible",
    baseUrl: "https://api.replicate.com/v1",
    keyUrl: "https://replicate.com/account/api-tokens",
    docsUrl: "https://replicate.com/docs",
    keyHint: "r8_...",
    verified: false,
    notes: "Confirm the OpenAI-compatible endpoint against the live /models list.",
  },
  lmstudio: {
    id: "lmstudio", label: "LM Studio", type: "openai-compatible",
    baseUrl: "http://localhost:1234/v1",
    keyUrl: "",
    docsUrl: "https://lmstudio.ai/docs",
    keyHint: "",
    verified: true,
    local: true,
    notes: "Local inference server. Enable the built-in server in LM Studio (default port 1234). No key.",
  },
  vllm: {
    id: "vllm", label: "vLLM", type: "openai-compatible",
    baseUrl: "http://localhost:8000/v1",
    keyUrl: "",
    docsUrl: "https://docs.vllm.ai",
    keyHint: "",
    verified: true,
    local: true,
    notes: "Self-hosted vLLM OpenAI-compatible server. No key by default.",
  },
  "llama-cpp": {
    id: "llama-cpp", label: "llama-cpp", type: "openai-compatible",
    baseUrl: "http://localhost:8080/v1",
    keyUrl: "",
    docsUrl: "https://github.com/ggml-org/llama.cpp",
    keyHint: "",
    verified: true,
    local: true,
    notes: "llama.cpp server (OpenAI-compatible). Default port 8080. No key.",
  },
  lite_llm: {
    id: "lite_llm", label: "LiteLLM", type: "openai-compatible",
    baseUrl: "http://localhost:4000/v1",
    keyUrl: "",
    docsUrl: "https://docs.litellm.ai",
    keyHint: "",
    verified: true,
    local: true,
    gateway: true,
    notes: "Self-hosted LLM gateway/proxy. Route any provider through one OpenAI-compatible endpoint.",
  },
  zhipu: {
    id: "zhipu", label: "Zhipu AI (GLM)", type: "openai-compatible",
    baseUrl: "https://api.z.ai/api/paas/v4",
    keyUrl: "https://z.ai/console",
    docsUrl: "https://docs.z.ai/",
    keyHint: "Zhipu key",
    verified: false,
    notes: "International z.ai console. CN users use https://open.bigmodel.cn/api/paas/v4. Verify against the live /models list.",
  },
  moonshot: {
    id: "moonshot", label: "Moonshot (Kimi)", type: "openai-compatible",
    baseUrl: "https://api.moonshot.ai/v1",
    keyUrl: "https://platform.moonshot.ai/",
    docsUrl: "https://platform.moonshot.ai/docs",
    keyHint: "Moonshot key",
    verified: false,
    notes: "International endpoint. CN users use https://api.moonshot.cn/v1. Verify against the live /models list.",
  },
  dashscope: {
    id: "dashscope", label: "Alibaba Qwen (DashScope)", type: "openai-compatible",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    keyUrl: "https://dashscope.console.aliyun.com/apiKey",
    docsUrl: "https://help.aliyun.com/zh/model-studio/",
    keyHint: "sk-...",
    verified: false,
    notes: "OpenAI-compatible mode of DashScope. Verify against the live /models list.",
  },
  siliconflow: {
    id: "siliconflow", label: "SiliconFlow", type: "openai-compatible",
    baseUrl: "https://api.siliconflow.cn/v1",
    keyUrl: "https://cloud.siliconflow.cn/account/ak",
    docsUrl: "https://docs.siliconflow.cn",
    keyHint: "sk-...",
    verified: false,
    notes: "Chinese model marketplace (DeepSeek, Qwen, GLM...). Verify against the live /models list.",
  },
  minimax: {
    id: "minimax", label: "MiniMax", type: "openai-compatible",
    baseUrl: "https://api.minimaxi.com/v1",
    keyUrl: "https://platform.minimaxi.com/",
    docsUrl: "https://platform.minimaxi.com/docs",
    keyHint: "MiniMax key",
    verified: false,
    notes: "International platform. Verify against the live /models list.",
  },
  portkey: {
    id: "portkey", label: "Portkey AI Gateway", type: "openai-compatible",
    baseUrl: "https://api.portkey.ai/v1",
    keyUrl: "https://portkey.ai/dashboard",
    docsUrl: "https://docs.portkey.ai",
    keyHint: "pk-...",
    verified: true,
    gateway: true,
    notes: "Unified gateway — bring your own keys, route via OpenAI-compatible endpoint.",
  },
  vercel: {
    id: "vercel", label: "Vercel AI Gateway", type: "openai-compatible",
    baseUrl: "https://ai-gateway.vercel.sh/v1",
    keyUrl: "https://vercel.com/ai-gateway",
    docsUrl: "https://vercel.com/docs/ai-gateway",
    keyHint: "",
    verified: true,
    gateway: true,
    notes: "Zero-markup gateway for the AI SDK ecosystem.",
  },
  custom: {
    id: "custom", label: "Other / Custom (OpenAI-compatible)", type: "openai-compatible",
    baseUrl: "",
    keyUrl: "",
    keyHint: "any",
    notes: "Any OpenAI-compatible endpoint (self-hosted, proxy, reseller, new provider...). Enter the base URL (must end with /v1 for most) and optionally an API key.",
  },
};

/**
 * @deprecated Use DEFAULT_PROVIDER_CATALOG instead. Will be removed in next major version.
 */
export const PROVIDER_CATALOG = DEFAULT_PROVIDER_CATALOG;

export function getCatalogEntry(id: string): ProviderCatalogEntry | undefined {
  return DEFAULT_PROVIDER_CATALOG[id];
}

export function listCatalogProviders(): ProviderCatalogEntry[] {
  return Object.values(DEFAULT_PROVIDER_CATALOG);
}
