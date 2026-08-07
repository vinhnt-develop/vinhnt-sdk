import type { VntConfig } from "../schema.js";

/**
 * Config source priority (lower number = higher priority override).
 */
export enum ConfigPriority {
  Global = 1,
  Project = 2,
  Local = 3,
  EnvVar = 4,
  CliFlag = 5,
}

export interface ConfigSource {
  readonly priority: ConfigPriority;
  readonly name: string;
  load(): Partial<VntConfig> | null;
}

type EnvMapping = {
  envVar: string;
  configKey: string;
  transform?: (value: string) => unknown;
};

/**
 * Env vars that end in `_API_KEY` but are NOT provider credentials.
 * They are handled by ENV_MAPPINGS instead of the generic provider scan.
 */
const NON_PROVIDER_API_KEY_ENV_VARS = new Set([
  "VNT_WEB_SEARCH_API_KEY",
  "VNT_API_TOKEN",
]);

const ENV_MAPPINGS: EnvMapping[] = [
  { envVar: "VNT_DEFAULT_PROVIDER", configKey: "defaultProvider" },
  { envVar: "VNT_DEFAULT_MODEL", configKey: "defaultModel" },
  { envVar: "VNT_AUTO", configKey: "auto", transform: (v) => v === "1" || v === "true" },
  { envVar: "VNT_LOG_LEVEL", configKey: "logLevel" },
  { envVar: "VNT_SHELL", configKey: "shell" },
  { envVar: "VNT_MAX_STEPS", configKey: "maxSteps", transform: parseInt },
  { envVar: "VNT_MAX_TOKENS", configKey: "maxTokens", transform: parseInt },
  { envVar: "VNT_STEP_TIMEOUT", configKey: "stepTimeout", transform: parseInt },
  { envVar: "VNT_THINKING_BUDGET", configKey: "thinkingBudget", transform: parseInt },
  { envVar: "VNT_MAX_SELF_CORRECT", configKey: "maxSelfCorrectAttempts", transform: parseInt },
  { envVar: "VNT_DOOM_LOOP_THRESHOLD", configKey: "doomLoopThreshold", transform: parseInt },
  { envVar: "VNT_NO_STORE", configKey: "noStore", transform: (v) => v === "1" || v === "true" },
  { envVar: "VNT_EXTERNAL_DIRECTORY_ACCESS", configKey: "externalDirectoryAccess", transform: (v) => v === "1" || v === "true" },
  { envVar: "VNT_LOG_MAX_SIZE", configKey: "logMaxSize", transform: parseInt },
  { envVar: "VNT_LOG_MAX_FILES", configKey: "logMaxFiles", transform: parseInt },
  { envVar: "VNT_MODEL_CACHE_TTL", configKey: "modelCacheTtlMs", transform: parseInt },
  { envVar: "VNT_SHELL_DEFAULT_TIMEOUT", configKey: "shellDefaultTimeout", transform: parseInt },
  { envVar: "VNT_SHELL_MAX_TIMEOUT", configKey: "shellMaxTimeout", transform: parseInt },
  { envVar: "VNT_MAX_FILE_SIZE", configKey: "maxFileSize", transform: parseInt },
  { envVar: "VNT_MAX_CONCURRENT_TOOL_CALLS", configKey: "maxConcurrentToolCalls", transform: parseInt },
  { envVar: "VNT_MAX_TOOL_CALLS_PER_STEP", configKey: "maxToolCallsPerStep", transform: parseInt },
  { envVar: "VNT_SUBAGENT_DEPTH", configKey: "subagentDepth", transform: parseInt },
  { envVar: "VNT_WEB_SEARCH_API_KEY", configKey: "webSearchApiKey" },
  { envVar: "VNT_NETWORK_TIMEOUT", configKey: "network.timeout", transform: parseInt },
  { envVar: "VNT_NETWORK_MAX_RETRIES", configKey: "network.maxRetries", transform: parseInt },
  { envVar: "VNT_NETWORK_PROXY_URL", configKey: "network.proxyUrl" },
  { envVar: "VNT_NETWORK_PROXY_ENABLED", configKey: "network.proxyEnabled", transform: (v) => v === "1" || v === "true" },
  { envVar: "VNT_WEB_SEARCH_NUM_RESULTS", configKey: "network.webSearchNumResults", transform: parseInt },
  { envVar: "VNT_WEB_FETCH_MAX_RESPONSE_SIZE", configKey: "network.webFetchMaxResponseSize", transform: parseInt },
  { envVar: "VNT_LSP_AUTO_DETECT", configKey: "lsp.autoDetect", transform: (v) => v === "1" || v === "true" },
  { envVar: "VNT_LSP_DIAGNOSTICS", configKey: "lsp.diagnostics", transform: (v) => v === "1" || v === "true" },
  { envVar: "VNT_MCP_RECONNECT_MAX_RETRIES", configKey: "mcpReconnectMaxRetries", transform: parseInt },
  { envVar: "VNT_MCP_RECONNECT_BASE_DELAY", configKey: "mcpReconnectBaseDelayMs", transform: parseInt },
  { envVar: "VNT_MCP_RECONNECT_MAX_DELAY", configKey: "mcpReconnectMaxDelayMs", transform: parseInt },
  { envVar: "VNT_COMPACTION_STRATEGY", configKey: "compaction.strategy" },
  { envVar: "VNT_COMPACTION_TOKEN_BUDGET", configKey: "compaction.tokenBudget", transform: parseInt },
  { envVar: "VNT_COMPACTION_HEAD_COUNT", configKey: "compaction.headCount", transform: parseInt },
  { envVar: "VNT_COMPACTION_TAIL_COUNT", configKey: "compaction.tailCount", transform: parseInt },
  { envVar: "VNT_LEARNING_ENABLED", configKey: "learning.enabled", transform: (v) => v === "1" || v === "true" },
  { envVar: "VNT_LEARNING_MEMORY_CHAR_LIMIT", configKey: "learning.memoryCharLimit", transform: parseInt },
  { envVar: "VNT_LEARNING_USER_CHAR_LIMIT", configKey: "learning.userCharLimit", transform: parseInt },
  { envVar: "VNT_THEME_MODE", configKey: "theme.mode" },
  { envVar: "VNT_POLICY_DEFAULT_ACTION", configKey: "policies.defaultAction" },
  { envVar: "VNT_NOTIFICATIONS_ENABLED", configKey: "notifications.enabled", transform: (v) => v === "1" || v === "true" },
  { envVar: "VNT_NOTIFICATIONS_ON_FAILURE", configKey: "notifications.onFailure", transform: (v) => v === "1" || v === "true" },
  { envVar: "VNT_NOTIFICATIONS_ON_APPROVAL", configKey: "notifications.onApproval", transform: (v) => v === "1" || v === "true" },
  { envVar: "VNT_NOTIFICATIONS_ON_SUCCESS", configKey: "notifications.onSuccess", transform: (v) => v === "1" || v === "true" },
];

/**
 * Derive a provider id from a `VNT_<PROVIDER>_API_KEY` env var name.
 * Convention-based (no hardcoded provider list): the suffix between `VNT_`
 * and `_API_KEY`, lowercased, is the provider id. This supports ANY provider
 * without code changes — known provider ids (openai, ollama, ...) work because
 * their env vars already follow the convention.
 */
function providerIdFromEnvVar(envVar: string): string | null {
  const m = /^VNT_([A-Z0-9]+)_API_KEY$/i.exec(envVar);
  if (!m) return null;
  const name = m[1]!.toLowerCase();
  if (!name || name === "api") return null;
  return name;
}

function setNested(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    if (!(key in current) || typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]!] = value;
}

/**
 * Env config source — reads well-known environment variables and maps
 * them to corresponding VntConfig keys. Handles provider API keys as
 * nested `providers.<name>.apiKey` entries via the convention
 * `VNT_<PROVIDER>_API_KEY` (no hardcoded provider list).
 *
 * Priority: EnvVar (overrides file config, overridden by CLI flags).
 */
export class EnvConfigSource implements ConfigSource {
  readonly name = "env";
  readonly priority = ConfigPriority.EnvVar;

  load(): Partial<VntConfig> | null {
    const result: Record<string, unknown> = {};

    for (const { envVar, configKey, transform } of ENV_MAPPINGS) {
      const raw = process.env[envVar];
      if (raw === undefined || raw === "") continue;
      const value = transform ? transform(raw) : raw;
      setNested(result, configKey, value);
    }

    // Provider API keys → providers.<name>.apiKey
    // Convention-based: ANY VNT_<PROVIDER>_API_KEY maps to a provider of that
    // name (e.g. VNT_OPENAI_API_KEY → providers.openai.apiKey). No hardcoded
    // provider list — new providers work without code changes.
    for (const envVar of Object.keys(process.env)) {
      if (NON_PROVIDER_API_KEY_ENV_VARS.has(envVar)) continue;
      const provider = providerIdFromEnvVar(envVar);
      if (!provider) continue;
      const raw = process.env[envVar];
      if (raw === undefined || raw === "") continue;
      setNested(result, `providers.${provider}.apiKey`, raw);
    }

    return Object.keys(result).length > 0 ? (result as Partial<VntConfig>) : null;
  }
}
