# Provider SDK

> How to create custom model providers for vinhnt-sdk.

---

## Overview

Model providers connect vinhnt-sdk to AI models (OpenAI, Anthropic, local models, etc.). Each provider implements the `ModelProvider` interface.

## ModelProvider Interface

```typescript
interface ModelProvider {
  readonly provider: string;           // Provider name (e.g., "openai")
  readonly model: string;              // Model name (e.g., "gpt-4o")
  readonly contextLimit?: number;      // Max context window size
  readonly capabilities: ModelCapabilities;
  readonly pricing?: ModelPricing;
  
  // Generate a response (non-streaming)
  generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse>;
  
  // Stream a response
  stream(request: ModelRequest, signal?: AbortSignal): AsyncIterable<ModelStreamEvent>;
  
  // Optional: count tokens in text
  countTokens?(text: string): number;
}
```

## Creating a Provider

### Basic Provider

```typescript
import type { 
  ModelProvider, 
  ModelRequest, 
  ModelResponse, 
  ModelStreamEvent,
  ModelCapabilities 
} from "@vinhnt-sdk/schema";

class MyProvider implements ModelProvider {
  readonly provider = "my-provider";
  readonly model = "my-model";
  readonly contextLimit = 4096;
  readonly capabilities: ModelCapabilities = {
    streaming: true,
    toolCalling: true,
    imageInput: false,
    thinking: false,
    structuredOutput: false,
  };

  async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    // Call your AI API here
    const response = await fetch("https://api.example.com/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: request.messages,
        tools: request.tools,
      }),
      signal,
    });

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      toolCalls: data.choices[0].message.tool_calls?.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments),
      })),
      usage: {
        input: data.usage.prompt_tokens,
        output: data.usage.completion_tokens,
      },
    };
  }

  async *stream(request: ModelRequest, signal?: AbortSignal): AsyncIterable<ModelStreamEvent> {
    const response = await fetch("https://api.example.com/v1/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: request.messages,
        tools: request.tools,
        stream: true,
      }),
      signal,
    });

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
      
      for (const line of lines) {
        const data = JSON.parse(line.slice(6));
        const delta = data.choices[0]?.delta;
        
        if (delta?.content) {
          yield { type: "text", content: delta.content };
        }
        
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            yield { 
              type: "tool_call", 
              id: tc.id, 
              name: tc.function.name, 
              args: JSON.parse(tc.function.arguments) 
            };
          }
        }
      }
    }
  }
}
```

### Provider with Pricing

```typescript
class OpenAIProvider implements ModelProvider {
  readonly provider = "openai";
  readonly model = "gpt-4o";
  readonly pricing = {
    input: 2.50,   // $2.50 per 1M tokens
    output: 10.00,  // $10.00 per 1M tokens
  };
  
  // ... rest of implementation
}
```

## Registering Providers

```typescript
import { AgentKernel, InMemoryModelRegistry } from "@vinhnt-sdk/core";

// Create registry
const registry = new InMemoryModelRegistry();

// Register providers
registry.register("openai", new OpenAIProvider());
registry.register("anthropic", new AnthropicProvider());

// Use in kernel
const kernel = new AgentKernel({
  model: registry.get("openai")!,
  modelRegistry: registry,
  store: new NullRunEventStore(),
});
```

## Multi-Model Routing

Use agent config to specify which model to use:

```typescript
const agent = {
  id: "coder" as AgentId,
  profile: { 
    name: "Coder", 
    description: "Code generation agent",
    model: "anthropic"  // Use Anthropic for this agent
  },
  capabilities: { tools: ["*"] },
};

const kernel = new AgentKernel({
  model: registry.get("openai")!,  // Default model
  modelRegistry: registry,
  agentRegistry,
});
```

## Testing Providers

Use the built-in `FakeModelProvider` for testing:

```typescript
import { FakeModelProvider } from "@vinhnt-sdk/core";

const model = new FakeModelProvider([
  { content: "Hello!" },
  { content: "", toolCalls: [{ id: "1", name: "tool", args: {} }] },
  { content: "Done!" },
]);

// Each call returns the next response in the queue
```

## Best Practices

1. **Error Handling** — Wrap API calls in try/catch, throw meaningful errors
2. **Cancellation** — Support AbortSignal for request cancellation
3. **Rate Limiting** — Implement retry logic with backoff
4. **Token Counting** — Implement `countTokens()` for accurate context management
5. **Streaming** — Always implement `stream()` for better UX
6. **Pricing** — Include pricing for cost tracking

## Example: Vercel AI SDK Provider

```typescript
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

class VercelAIProvider implements ModelProvider {
  readonly provider = "vercel-ai";
  readonly model = "gpt-4o";
  readonly capabilities = {
    streaming: true,
    toolCalling: true,
    imageInput: true,
    thinking: false,
    structuredOutput: true,
  };

  async *stream(request: ModelRequest, signal?: AbortSignal) {
    const result = streamText({
      model: openai("gpt-4o"),
      messages: request.messages,
      tools: request.tools,
      abortSignal: signal,
    });

    for await (const chunk of result.textStream) {
      yield { type: "text", content: chunk };
    }
  }

  async generate(request: ModelRequest, signal?: AbortSignal) {
    const result = await generateText({
      model: openai("gpt-4o"),
      messages: request.messages,
      tools: request.tools,
      abortSignal: signal,
    });

    return {
      content: result.text,
      toolCalls: result.toolCalls,
      usage: result.usage,
    };
  }
}
```
