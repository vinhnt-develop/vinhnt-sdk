import { LlmAdapter } from "../src/adapter.js";
import type { GenerateOptions, StreamChunk, RetryPolicy, ProviderInfo } from "../src/adapter.js";

export class MockAdapter extends LlmAdapter {
  private readonly providerId: string;
  private readonly retryPolicy: RetryPolicy | undefined;

  constructor(providerId = "mock", retryPolicy?: RetryPolicy) {
    super();
    this.providerId = providerId;
    this.retryPolicy = retryPolicy;
  }

  async *stream(_options: GenerateOptions, _signal?: AbortSignal): AsyncIterable<StreamChunk> {
    yield { type: "text", content: "Hello" };
    yield { type: "text", content: " world" };
    yield { type: "finish", reason: "stop" };
  }

  override providerInfo(_provider: string): ProviderInfo {
    return { id: this.providerId, name: `${this.providerId} adapter` };
  }

  override providerRetryPolicy(_provider: string): RetryPolicy | undefined {
    return this.retryPolicy;
  }
}
