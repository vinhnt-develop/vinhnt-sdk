import type { ModelProvider } from "@vinhnt-sdk/core";
import { AiSdkModelProvider } from "./ai-sdk-adapter.js";
import type { AiProvider } from "./ai-sdk-adapter.js";

export type ProviderType = AiProvider;

export interface ModelConfig {
  readonly provider: ProviderType;
  readonly model: string;
  readonly apiKey?: string | undefined;
  readonly baseUrl?: string | undefined;
  readonly maxRetries?: number;
}

export function createModelProvider(config: ModelConfig): ModelProvider {
  return new AiSdkModelProvider(
    config.provider,
    config.model,
    config.apiKey,
    config.baseUrl,
    config.maxRetries,
  );
}
