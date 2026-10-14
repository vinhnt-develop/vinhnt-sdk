---
title: "@vinhnt-sdk/provider-openai-compatible"
description: "OpenAI-compatible provider + presets"
version: "0.4.6"
lang: "en"
type: "reference"
category: "API Reference"
sidebarLabel: "provider-openai-compatible"
---

# @vinhnt-sdk/provider-openai-compatible

A model provider for any API compatible with the OpenAI chat completions format. Includes built-in presets for DeepSeek, Anthropic (via proxy), and Ollama.

## Imports

```ts
import {
  OpenAICompatibleProvider,
  createDeepSeekProvider,
  createOllamaProvider,
  buildRequest,
  fromOpenAIStreamChunk,
  createSSEStream,
} from "@vinhnt-sdk/provider-openai-compatible";
```

---

## OpenAICompatibleProvider

Model provider that implements the vinhnt-sdk LLM provider interface for OpenAI-compatible APIs.

### Constructor

```ts
new OpenAICompatibleProvider(config: OpenAICompatibleProviderOptions)
```

### Configuration

```ts
const provider = new OpenAICompatibleProvider({
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
  defaultModel: "deepseek-chat",
  headers: { "X-Custom": "value" },
});
```

### Methods

#### `chat(request)`

Send a chat completion request.

```ts
const response = await provider.chat({
  messages: [{ role: "user", content: "Hello" }],
  temperature: 0.7,
  maxTokens: 1024,
});
```

#### `chatStream(request)`

Send a streaming chat completion request.

```ts
const stream = await provider.chatStream({
  messages: [{ role: "user", content: "Write a story" }],
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

---

## Preset Helpers

Pre-configured factories for popular OpenAI-compatible providers.

### Available Presets

| Helper | Base URL | Notes |
|--------|----------|-------|
| `createDeepSeekProvider(opts)` | `https://api.deepseek.com/v1` | DeepSeek V2/V3 models (`DEEPSEEK_*` constants exported) |
| `createAnthropicProvider(opts)` | `https://api.anthropic.com/v1` | Anthropic Claude via OpenAI-compatible endpoint |
| `createOllamaProvider(opts?)` | `http://localhost:11434/v1` | Local Ollama instance |
| `createProviderFromPreset(preset, opts?)` | — | Build a provider from a custom `ProviderPreset` |

### Usage

```ts
import { createDeepSeekProvider, createOllamaProvider } from "@vinhnt-sdk/provider-openai-compatible";

// DeepSeek
const deepseek = createDeepSeekProvider({ apiKey: process.env.DEEPSEEK_API_KEY });

// Ollama (local, no API key needed)
const ollama = createOllamaProvider({ model: "llama3" });
```

---

## buildRequest

Build an OpenAI-compatible request body from options.

```ts
const body = buildRequest({
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
  temperature: 0.7,
  maxTokens: 1024,
  tools: [...],
  stream: true,
});
```

### Parameters

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | `string` | — | Model identifier |
| `messages` | `Message[]` | — | Conversation messages |
| `temperature` | `number` | `0.7` | Sampling temperature |
| `maxTokens` | `number` | `4096` | Maximum tokens to generate |
| `tools` | `Tool[]` | `[]` | Available tools for function calling |
| `stream` | `boolean` | `false` | Enable streaming |

---

## fromOpenAIStreamChunk

Convert raw OpenAI stream chunks into typed stream events.

```ts
const rawChunk = { choices: [{ delta: { content: "Hello" } }] };
const events = fromOpenAIStreamChunk(rawChunk);
// [{ type: "text", content: "Hello" }]
```

### Return Value

| Chunk Field | Event Type | Description |
|------------|------------|-------------|
| `delta.content` | `text` | Text content chunk |
| `delta.reasoning_content` | `thinking` | DeepSeek reasoner chain-of-thought |
| `delta.tool_calls` | `tool_call` | Tool call chunk (`id`, `name`, `args`; deltas use `__delta`) |
| `finish_reason` | `finish` | Stream finished |
| `logprobs` | `logprobs` | Token logprobs |
| `usage` | `usage` | Token usage (final chunk) |

---

## createSSEStream

Server-Sent Events parser for handling streaming HTTP responses. An async generator of parsed `OpenAIStreamChunk`s.

```ts
for await (const chunk of createSSEStream(response.body)) {
  console.log(chunk.choices[0]?.delta?.content);
}
```

### Signature

```ts
createSSEStream(body, signal?, state?): AsyncIterable<OpenAIStreamChunk>
```

- `body` — Response body (bytes/async iterable).
- `signal` — Optional `AbortSignal` to stop parsing.
- `state` — Optional parse state; lets the consumer distinguish a clean `[DONE]` completion from a truncated stream.

---

## Types

### OpenAICompatibleProviderOptions

```ts
interface OpenAICompatibleProviderOptions {
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  providerName?: string;
  headers?: Record<string, string>;
  contextLimit?: number;
  pricing?: ModelPricing;
  capabilities?: Partial<ModelCapabilities>;
  retry?: RetryOptions;
  timeoutMs?: number;
  includeUsage?: boolean;
}
```

### OpenAICompatibleRequestBody

```ts
interface OpenAICompatibleRequestBody {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string | null;
    tool_call_id?: string;
    tool_calls?: ToolCall[];
  }>;
  temperature?: number;
  max_tokens?: number;
  tools?: ToolDefinition[];
  stream?: boolean;
}
```

### Stream Events

Returned by `fromOpenAIStreamChunk`:

```ts
type StreamChunkEvent =
  | { type: "text"; content: string }
  | { type: "thinking"; content: string }
  | { type: "tool_call"; id?: string; name?: string; args?: Record<string, unknown> }
  | { type: "finish"; reason: string }
  | { type: "logprobs"; logprobs: unknown }
  | { type: "usage"; inputTokens: number; outputTokens: number; reasoningTokens?: number };
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `@vinhnt-sdk/schema` | Type definitions |
| `@vinhnt-sdk/config` | Configuration interfaces |
| `@vinhnt-sdk/llm` | Provider interface contract |

---

## Example: Full Provider Setup

```ts
import { createDeepSeekProvider } from "@vinhnt-sdk/provider-openai-compatible";

const provider = createDeepSeekProvider({
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: "deepseek-chat",
});

const response = await provider.chat({
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Explain quantum computing briefly." },
  ],
  temperature: 0.5,
  maxTokens: 512,
});

console.log(response.choices[0].message.content);
```
