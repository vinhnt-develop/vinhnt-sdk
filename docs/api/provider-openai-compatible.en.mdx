---
title: "@vinhnt-sdk/provider-openai-compatible"
description: "OpenAI-compatible provider + presets"
version: "0.1.3"
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
  PRESETS,
  buildRequest,
  convertStreamChunk,
  SSE,
} from "@vinhnt-sdk/provider-openai-compatible";
```

---

## OpenAICompatibleProvider

Model provider that implements the vinhnt-sdk LLM provider interface for OpenAI-compatible APIs.

### Constructor

```ts
new OpenAICompatibleProvider(config: OpenAICompatibleConfig)
```

### Configuration

```ts
const provider = new OpenAICompatibleProvider({
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: "deepseek-chat",
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

## PRESETS

Pre-configured settings for popular OpenAI-compatible providers.

### Available Presets

| Preset | Base URL | Notes |
|--------|----------|-------|
| `deepseek` | `https://api.deepseek.com/v1` | DeepSeek V2/V3 models |
| `anthropic` | Configured via proxy | Anthropic Claude via OpenAI-compatible proxy |
| `ollama` | `http://localhost:11434/v1` | Local Ollama instance |

### Usage

```ts
import { OpenAICompatibleProvider, PRESETS } from "@vinhnt-sdk/provider-openai-compatible";

// DeepSeek
const deepseek = new OpenAICompatibleProvider({
  ...PRESETS.deepseek,
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Ollama (local, no API key needed)
const ollama = new OpenAICompatibleProvider({
  ...PRESETS.ollama,
  model: "llama3",
});
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

## convertStreamChunk

Convert raw SSE chunks from the OpenAI completions stream into typed `StreamChunkEvent` objects.

```ts
const rawChunk = { choices: [{ delta: { content: "Hello" } }] };
const event = convertStreamChunk(rawChunk);
// { type: "content", content: "Hello" }
```

### Return Value

| Chunk Type | Event Type | Description |
|------------|------------|-------------|
| `delta.content` | `content` | Text content chunk |
| `delta.tool_calls` | `tool_call` | Tool call chunk |
| `[DONE]` | `done` | Stream finished |
| Error | `error` | Stream error |

---

## SSE

Server-Sent Events parser for handling streaming HTTP responses.

```ts
const sse = new SSE(response.body);

for await (const event of sse) {
  if (event.data === "[DONE]") break;
  const chunk = JSON.parse(event.data);
  console.log(chunk.choices[0]?.delta?.content);
}
```

### Methods

#### `static parse(text)`

Parse a raw SSE text string into events.

```ts
const events = SSE.parse("data: {\"hello\":\"world\"}\n\n");
```

---

## Types

### OpenAICompatibleConfig

```ts
interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey?: string;
  model?: string;
  headers?: Record<string, string>;
  timeout?: number;
  maxRetries?: number;
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

### StreamChunkEvent

```ts
type StreamChunkEvent =
  | { type: "content"; content: string }
  | { type: "tool_call"; toolCall: ToolCall }
  | { type: "done"; usage: TokenUsage }
  | { type: "error"; error: Error };
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
import {
  OpenAICompatibleProvider,
  PRESETS,
} from "@vinhnt-sdk/provider-openai-compatible";

const provider = new OpenAICompatibleProvider({
  ...PRESETS.deepseek,
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
