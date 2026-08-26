# @vinhnt-sdk/schema

> Version: 0.1.2-beta.0 | Status: BETA

Shared types and contracts for vinhnt-sdk — model interfaces, event types, and API contracts.

## Install

```bash
# npm
npm install @vinhnt-sdk/schema

# pnpm (monorepo)
pnpm add @vinhnt-sdk/schema
```

## Quick Start

```typescript
import type {
  ModelProvider,
  ModelRequest,
  ModelResponse,
  RunEvent,
  Session,
  Message,
  AgentConfig,
  AgentContext,
  AgentRunResult,
} from '@vinhnt-sdk/schema';

// Implement ModelProvider interface
const model: ModelProvider = {
  provider: "openai",
  model: "gpt-4o",
  contextLimit: 128000,
  capabilities: {
    chat: true,
    completion: false,
    vision: true,
    audio: false,
    functionCall: true,
    streaming: true,
  },
  async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    // Implement generation
    return {
      id: "response-123",
      model: "gpt-4o",
      choices: [{ index: 0, message: { role: "assistant", content: "Hello!" }, finishReason: "stop" }],
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    };
  },
  async *stream(request: ModelRequest, signal?: AbortSignal): AsyncIterable<ModelStreamEvent> {
    // Implement streaming
    yield { id: "event-1", model: "gpt-4o", choices: [{ index: 0, delta: { content: "Hello" }, finishReason: null }] };
  },
};
```

## API Reference

### Model Types

| Export | Type | Description |
|--------|------|-------------|
| `ModelProvider` | Interface | AI model provider contract |
| `ModelRequest` | Interface | Model input request |
| `ModelResponse` | Interface | Model output response |
| `ModelStreamEvent` | Interface | Streaming event |
| `ModelCapabilities` | Interface | Model capabilities |
| `ModelPricing` | Interface | Token pricing |
| `ModelRegistry` | Interface | Model registry |

### Agent Types

| Export | Type | Description |
|--------|------|-------------|
| `AgentConfig` | Interface | Agent configuration |
| `AgentContext` | Interface | Agent execution context |
| `AgentRunResult` | Interface | Agent run result |
| `AgentId` | Type | Agent identifier |

### Session Types

| Export | Type | Description |
|--------|------|-------------|
| `Session` | Interface | Session data |
| `SessionId` | Type | Session identifier |
| `Message` | Interface | Chat message |
| `RunEvent` | Interface | Run lifecycle event |
| `SessionStore` | Interface | Session storage contract |
| `RunEventStore` | Interface | Event storage contract |

### Tool Types

| Export | Type | Description |
|--------|------|-------------|
| `ToolDefinitionLike` | Interface | Tool definition contract |
| `ToolCall` | Interface | Tool call |
| `ToolDefinition` | Interface | Tool definition |

### Event Types

| Export | Type | Description |
|--------|------|-------------|
| `AgentStartedEvent` | Interface | Agent started event |
| `AgentCompletedEvent` | Interface | Agent completed event |
| `AgentErrorEvent` | Interface | Agent error event |
| `ToolStartEvent` | Interface | Tool start event |
| `ToolEndEvent` | Interface | Tool end event |

## Dependencies

- `zod` ^4.4.3 - Schema validation

## Peer Dependencies

None

## Usage Examples

### Define a Model Provider

```typescript
import type { ModelProvider, ModelRequest, ModelResponse } from '@vinhnt-sdk/schema';

class MyModelProvider implements ModelProvider {
  readonly provider = "my-provider";
  readonly model = "my-model";
  readonly contextLimit = 4096;
  readonly capabilities = {
    chat: true,
    completion: false,
    vision: false,
    audio: false,
    functionCall: false,
    streaming: false,
  };

  async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    const userMessage = request.messages.find(m => m.role === "user");
    return {
      id: `resp-${Date.now()}`,
      model: this.model,
      choices: [{
        index: 0,
        message: { role: "assistant", content: `Response to: ${userMessage?.content}` },
        finishReason: "stop",
      }],
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    };
  }

  async *stream(request: ModelRequest, signal?: AbortSignal): AsyncIterable<ModelStreamEvent> {
    // Implement streaming
    yield { id: "evt-1", model: this.model, choices: [{ index: 0, delta: { content: "Hello" }, finishReason: null }] };
  }
}
```

### Define an Agent Config

```typescript
import type { AgentConfig } from '@vinhnt-sdk/schema';

const agentConfig: AgentConfig = {
  name: "my-agent",
  model: "gpt-4",
  systemPrompt: "You are a helpful assistant.",
  maxSteps: 10,
};
```

### Use Run Events

```typescript
import type { RunEvent, AgentStartedEvent, AgentCompletedEvent } from '@vinhnt-sdk/schema';

function handleEvent(event: RunEvent) {
  switch (event.type) {
    case "agent.started":
      console.log("Agent started:", (event as AgentStartedEvent).prompt);
      break;
    case "agent.completed":
      console.log("Agent completed:", (event as AgentCompletedEvent).status);
      break;
  }
}
```

## License

MIT
