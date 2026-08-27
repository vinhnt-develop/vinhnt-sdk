---
title: "Creating Providers"
description: "Implement custom model providers"
lang: "en"
type: "guide"
category: "Guides"
sidebarPosition: 2
---

# Creating Providers

Providers are the bridge between your agent and language models. This guide shows you how to implement custom model providers using `@vinhnt-sdk/core`.

## ModelProvider Interface

Every provider must implement the `ModelProvider` interface:

```typescript
import { ModelProvider } from "@vinhnt-sdk/core";

const myProvider: ModelProvider = {
  id: "my-provider",
  name: "My Custom Provider",

  async generate(request) {
    // Send request to model, return response
  },

  async *stream(request) {
    // Yield tokens as they arrive
  },
};
```

### Interface Methods

| Method | Description |
|--------|-------------|
| `generate(request)` | Send a prompt and receive a complete response |
| `stream(request)` | Send a prompt and yield tokens as they arrive |
| `listModels()` | Return available models from this provider |
| `getModel(id)` | Get a specific model by identifier |

## Basic Provider Example

A simple fetch-based provider:

```typescript
import { ModelProvider, ModelRequest, ModelResponse } from "@vinhnt-sdk/core";

function createHttpProvider(baseUrl: string, apiKey: string): ModelProvider {
  return {
    id: "http-provider",
    name: "HTTP Model Provider",

    async generate(request: ModelRequest): Promise<ModelResponse> {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 4096,
        }),
      });

      if (!response.ok) {
        throw new Error(`Provider error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        model: data.model,
      };
    },

    async *stream(request: ModelRequest) {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          stream: true,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;
            const parsed = JSON.parse(data);
            const token = parsed.choices[0]?.delta?.content;
            if (token) yield { type: "token", content: token };
          }
        }
      }
    },

    listModels() {
      return [
        { id: "model-a", name: "Model A", maxTokens: 4096 },
        { id: "model-b", name: "Model B", maxTokens: 8192 },
      ];
    },

    getModel(id) {
      const models = this.listModels();
      return models.find((m) => m.id === id) ?? null;
    },
  };
}
```

## Provider with Pricing

Add cost tracking to your provider:

```typescript
import { ModelProvider, ModelRequest, PricingConfig } from "@vinhnt-sdk/core";

function createPricedProvider(
  baseUrl: string,
  apiKey: string,
  pricing: PricingConfig
): ModelProvider {
  return {
    id: "priced-provider",
    name: "Priced Provider",
    pricing,

    async generate(request) {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
        }),
      });

      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        model: data.model,
      };
    },

    async *stream(request) {
      // Streaming implementation...
    },

    listModels() {
      return Object.keys(pricing).map((id) => ({
        id,
        name: id,
        maxTokens: 4096,
      }));
    },

    getModel(id) {
      if (!(id in pricing)) return null;
      return { id, name: id, maxTokens: 4096 };
    },
  };
}

// Usage
const provider = createPricedProvider(
  "https://api.example.com",
  "sk-xxx",
  {
    "model-a": { input: 0.001, output: 0.002 },
    "model-b": { input: 0.003, output: 0.006 },
  }
);
```

## InMemoryModelRegistry Registration

Register providers with the model registry:

```typescript
import { InMemoryModelRegistry, ModelProvider } from "@vinhnt-sdk/core";

const registry = new InMemoryModelRegistry();

// Register a provider
const provider = createHttpProvider("https://api.openai.com", "sk-xxx");
registry.register(provider);

// Register with alias
registry.register(provider, { alias: "openai" });

// Register multiple providers
const providers = [providerA, providerB];
registry.registerBatch(providers);

// Look up a provider
const resolved = registry.resolve("my-provider");

// List all registered providers
const allProviders = registry.list();
```

## Multi-Model Routing

Route requests to different providers based on model name:

```typescript
import { ModelProvider, ModelRequest } from "@vinhnt-sdk/core";

function createRoutingProvider(
  providers: Map<string, ModelProvider>
): ModelProvider {
  return {
    id: "routing-provider",
    name: "Routing Provider",

    async generate(request) {
      const provider = providers.get(request.model);
      if (!provider) {
        throw new Error(`No provider registered for model: ${request.model}`);
      }
      return provider.generate(request);
    },

    async *stream(request) {
      const provider = providers.get(request.model);
      if (!provider) {
        throw new Error(`No provider registered for model: ${request.model}`);
      }
      yield* provider.stream(request);
    },

    listModels() {
      return Array.from(providers.values()).flatMap((p) => p.listModels());
    },

    getModel(id) {
      for (const provider of providers.values()) {
        const model = provider.getModel(id);
        if (model) return model;
      }
      return null;
    },
  };
}

// Usage
const router = createRoutingProvider(
  new Map([
    ["gpt-4", openaiProvider],
    ["claude-3", anthropicProvider],
    ["gemini-pro", googleProvider],
  ])
);
```

## FakeModelProvider for Testing

Use a fake provider in tests:

```typescript
import { FakeModelProvider } from "@vinhnt-sdk/core/testing";

describe("agent integration", () => {
  it("should process user message", async () => {
    const fakeProvider = new FakeModelProvider({
      responses: ["Hello! How can I help?"],
    });

    const agent = createAgent({ provider: fakeProvider });
    const response = await agent.chat("Hi there");

    expect(response.content).toBe("Hello! How can I help?");
    expect(fakeProvider.requests).toHaveLength(1);
  });

  it("should handle streaming", async () => {
    const fakeProvider = new FakeModelProvider({
      streamingTokens: ["Hello", " ", "world"],
    });

    const tokens: string[] = [];
    for await (const token of fakeProvider.stream(request)) {
      tokens.push(token.content);
    }

    expect(tokens.join("")).toBe("Hello world");
  });
});
```

## Best Practices

### Error Handling

Always wrap provider calls in try-catch:

```typescript
async function safeGenerate(
  provider: ModelProvider,
  request: ModelRequest
): Promise<ModelResponse | null> {
  try {
    return await provider.generate(request);
  } catch (error) {
    if (error instanceof RateLimitError) {
      await delay(error.retryAfter ?? 1000);
      return provider.generate(request);
    }
    if (error instanceof AuthenticationError) {
      console.error("Invalid API key");
      return null;
    }
    throw error;
  }
}
```

### Cancellation Support

Handle abort signals for long-running requests:

```typescript
async function generateWithAbort(
  provider: ModelProvider,
  request: ModelRequest,
  signal?: AbortSignal
): Promise<ModelResponse> {
  signal?.throwIfAborted();
  return provider.generate({ ...request, signal });
}
```

### Streaming Best Practices

Always handle backpressure and errors in streams:

```typescript
async function* safeStream(
  provider: ModelProvider,
  request: ModelRequest
) {
  const iterator = provider.stream(request);

  try {
    for await (const chunk of iterator) {
      yield chunk;
    }
  } catch (error) {
    iterator.return?.();
    throw error;
  }
}
```

## Vercel AI SDK Integration

Integrate with the Vercel AI SDK for enhanced features:

```typescript
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4"),
    messages,
  });

  return result.toDataStreamResponse();
}
```

## Next Steps

- See the [Creating Tools](/guides/creating-tools) guide for adding tool support
- Review the full API reference for `ModelProvider`
- Explore advanced routing patterns in the examples
