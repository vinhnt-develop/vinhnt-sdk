# @vinhnt-sdk/adapters

> AI model provider adapters for OpenAI, Anthropic, Gemini, and more.

**npm:** `npm install @vinhnt-sdk/adapters`  
**Size:** ~31 KB  
**Dependencies:** `@vinhnt-sdk/core`, `@vinhnt-sdk/schema`  
**Peer deps:** `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`

---

## Overview

`adapters` bridges the VNT `ModelProvider` interface to the Vercel AI SDK, supporting multiple AI providers with a unified API.

## Installation

```bash
npm install @vinhnt-sdk/adapters ai @ai-sdk/openai
```

## Quick Start

```typescript
import { createModelProvider } from "@vinhnt-sdk/adapters";

// Create a provider
const model = createModelProvider("openai", "gpt-4o", {
  apiKey: process.env.OPENAI_API_KEY,
});

// Use in kernel
const kernel = new AgentKernel({ model, ... });
```

## Supported Providers

| Provider | Package | Models |
|----------|---------|--------|
| OpenAI | `@ai-sdk/openai` | gpt-4o, gpt-4-turbo, gpt-3.5-turbo |
| Anthropic | `@ai-sdk/anthropic` | claude-sonnet-4-20250514, claude-3-opus, claude-3-haiku |
| Google | `@ai-sdk/google` | gemini-1.5-pro, gemini-1.5-flash |
| Ollama | (built-in) | Any local model |
| OpenRouter | (built-in) | Any model via openrouter.ai |
| Custom | (built-in) | Any OpenAI-compatible API |

## Exports

### createModelProvider

```typescript
import { createModelProvider } from "@vinhnt-sdk/adapters";

// OpenAI
const openai = createModelProvider("openai", "gpt-4o", {
  apiKey: "sk-...",
});

// Anthropic
const anthropic = createModelProvider("anthropic", "claude-sonnet-4-20250514", {
  apiKey: "sk-ant-...",
});

// Gemini
const gemini = createModelProvider("gemini", "gemini-1.5-pro", {
  apiKey: "AIza...",
});

// Ollama (local)
const ollama = createModelProvider("ollama", "llama3", {
  baseUrl: "http://localhost:11434",
});

// OpenAI-compatible (e.g., vLLM, Together AI)
const custom = createModelProvider("openai-compatible", "my-model", {
  baseUrl: "https://my-api.example.com/v1",
  apiKey: "my-key",
});
```

### AiSdkModelProvider

Lower-level class for more control:

```typescript
import { AiSdkModelProvider } from "@vinhnt-sdk/adapters";

const provider = new AiSdkModelProvider({
  type: "openai",
  model: "gpt-4o",
  apiKey: "sk-...",
  temperature: 0.7,
  maxTokens: 4096,
});

// Stream a response
const stream = provider.stream({
  messages: [{ role: "user", content: "Hello" }],
  tools: toolDefinitions,
});
```

### Multi-Provider Registry

```typescript
import { MultiProviderRegistry, createDefaultRegistry } from "@vinhnt-sdk/adapters";

const registry = createDefaultRegistry({
  openai: { apiKey: "sk-..." },
  anthropic: { apiKey: "sk-ant-..." },
});

// Get provider by name
const model = registry.get("openai");

// List available models
const models = registry.listModels();
```

### Provider Catalog

```typescript
import { PROVIDER_CATALOG, listCatalogProviders } from "@vinhnt-sdk/adapters";

// List all known providers
const providers = listCatalogProviders();
// [{ id: "openai", name: "OpenAI", models: [...] }, ...]

// Get specific provider info
const openai = PROVIDER_CATALOG["openai"];
```

### Token Counting

```typescript
import { countTokens, countTokensSafe } from "@vinhnt-sdk/adapters";

const tokens = await countTokens("Hello, world!", "gpt-4o");
console.log(tokens); // ~4

// Safe version that never throws
const tokens = await countTokensSafe(text, model);
```

### Retry Logic

```typescript
import { withRetry, RetryExhaustedError } from "@vinhnt-sdk/adapters";

const result = await withRetry(
  () => provider.stream(request),
  { maxRetries: 3, backoffMs: 1000 }
);
```
