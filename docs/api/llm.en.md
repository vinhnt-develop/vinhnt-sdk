---
title: "@vinhnt-sdk/llm"
description: "LLM adapter abstraction, registry, retry"
lang: "en"
version: "0.1.3"
type: "reference"
category: "API Reference"
sidebarLabel: "llm"
---

## Installation

```bash
npm install @vinhnt-sdk/llm
```

## Exports

### Classes

#### `LlmAdapter` (abstract)

Abstract base class for LLM provider adapters.

```typescript
abstract class LlmAdapter {
  abstract providerInfo(): ProviderInfo;
  abstract stream(request: ModelRequest): AsyncIterable<StreamChunk>;
}
```

| Method | Returns | Description |
|--------|---------|-------------|
| `providerInfo()` | `ProviderInfo` | Returns metadata about the provider |
| `stream(request)` | `AsyncIterable<StreamChunk>` | Streams model response chunks |

#### `LlmRegistry`

Registry for managing LLM adapter instances.

```typescript
class LlmRegistry {
  register(provider: ModelProvider, adapter: LlmAdapter): void;
  get(provider: ModelProvider): LlmAdapter;
  has(provider: ModelProvider): boolean;
  list(): ModelProvider[];
}
```

| Method | Throws | Description |
|--------|--------|-------------|
| `register(provider, adapter)` | `ConfigError` | Registers adapter for a provider |
| `get(provider)` | `ModelNotFoundError` | Retrieves adapter by provider |
| `has(provider)` | — | Checks if provider is registered |
| `list()` | — | Returns all registered providers |

#### `TokenMeter`

Utility for estimating token counts for request sizing.

```typescript
class TokenMeter {
  estimateTokens(text: string): number;
  estimateMessages(messages: Message[]): number;
  fitsContext(text: string, maxTokens: number): boolean;
}
```

| Method | Returns | Description |
|--------|---------|-------------|
| `estimateTokens(text)` | `number` | Estimates token count for a string |
| `estimateMessages(messages)` | `number` | Estimates total tokens for messages |
| `fitsContext(text, maxTokens)` | `boolean` | Checks if text fits within token limit |

### Functions

#### `shouldRetry(error: Error, attempt: number, policy: RetryPolicy): boolean`

Determines if a request should be retried based on the error and attempt count.

```typescript
const retry = shouldRetry(new RateLimitError("Rate limited"), 1, {
  maxAttempts: 3,
  retryOn: ["RATE_LIMIT", "TIMEOUT"],
});
// true
```

#### `calculateDelay(attempt: number, policy: RetryPolicy): number`

Calculates the delay in milliseconds using exponential backoff with jitter.

```typescript
const delay = calculateDelay(2, {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitter: true,
});
// ~4000ms (with jitter)
```

### Types

```typescript
interface GenerateOptions {
  model: string;
  provider: ModelProvider;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  tools?: ToolSchema[];
  signal?: AbortSignal;
  onChunk?: (chunk: StreamChunk) => void;
}

interface StreamChunk {
  type: "text" | "tool_call" | "done" | "error";
  content?: string;
  toolCall?: ToolCall;
  usage?: TokenUsage;
  finishReason?: string;
}

interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
  retryOn?: string[];
}

interface ProviderInfo {
  provider: ModelProvider;
  name: string;
  version: string;
  capabilities: ModelCapabilities;
  maxContextLength: number;
  supportedModels: string[];
}
```

## Usage Examples

```typescript
import {
  LlmAdapter, LlmRegistry, TokenMeter,
  shouldRetry, calculateDelay,
} from "@vinhnt-sdk/llm";

// Implement a custom adapter
class OpenAIAdapter extends LlmAdapter {
  providerInfo(): ProviderInfo {
    return {
      provider: "openai",
      name: "OpenAI",
      version: "1.0.0",
      capabilities: {
        streaming: true,
        toolCalling: true,
        imageInput: false,
        thinking: false,
        structuredOutput: true,
      },
      maxContextLength: 128000,
      supportedModels: ["gpt-4o", "gpt-4o-mini"],
    };
  }

  async *stream(request: ModelRequest): AsyncIterable<StreamChunk> {
    // Implementation here
    yield { type: "done", finishReason: "stop" };
  }
}

// Register and use
const registry = new LlmRegistry();
registry.register("openai", new OpenAIAdapter());

const adapter = registry.get("openai");
const meter = new TokenMeter();

if (meter.fitsContext("Hello world", 4096)) {
  for await (const chunk of adapter.stream({
    model: "gpt-4o",
    provider: "openai",
    messages: [{ role: "user", content: "Hello" }],
  })) {
    process.stdout.write(chunk.content ?? "");
  }
}
```

## Error Handling

```typescript
import { RateLimitError, TimeoutError, ModelNotFoundError } from "@vinhnt-sdk/schema";

async function callWithRetry(request: GenerateOptions, policy: RetryPolicy) {
  let attempt = 0;
  while (attempt < policy.maxAttempts) {
    try {
      return await adapter.stream(request);
    } catch (e) {
      attempt++;
      if (!shouldRetry(e as Error, attempt, policy)) throw e;
      const delay = calculateDelay(attempt, policy);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new TimeoutError("Max retries exceeded");
}
```

## Dependencies

- `@vinhnt-sdk/schema` — model types, error classes, branded IDs
