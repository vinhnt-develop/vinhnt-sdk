// @vinhnt-sdk/llm
// LLM capability seam — adapter abstraction, registry, retry, model caller

export {
  type GenerateOptions,
  type StreamChunk,
  type RetryPolicy,
  type ProviderInfo,
  type ResolvedModelInfo,
  LlmAdapter,
} from "./adapter.js";

export {
  type AdapterRegistrationHandle,
  LlmRegistry,
  AdapterRegistrationError,
} from "./registry.js";

export {
  shouldRetry,
  calculateDelay,
  sleep,
} from "./retry.js";

/**
 * @deprecated Use CostMeter from @vinhnt-sdk/trace instead.
 * TokenMeter is kept for backward compatibility only.
 */
export { TokenMeter } from "./token-meter.js";

// Re-export ModelCaller (previously in @vinhnt-sdk/model-caller)
export {
  ModelCaller,
  type ModelCallerDeps,
  type ModelCallerPluginHooks,
  type ModelCallerLogger,
} from "./model-caller.js";
