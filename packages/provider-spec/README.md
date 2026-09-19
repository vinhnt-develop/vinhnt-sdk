# @vinhnt-sdk/provider-spec

> Version: 0.1.0 | Status: STABLE

Provider specification interfaces for vinhnt-sdk — pure TypeScript types with zero runtime dependencies. Providers implement these interfaces. Core consumes them.

## Install

```bash
# npm
npm install @vinhnt-sdk/provider-spec

# pnpm (monorepo)
pnpm add @vinhnt-sdk/provider-spec
```

## Features

- **LanguageModelV1** — Vercel AI SDK-compatible model interface
- **Tool** — Typed tool definitions (function + dynamic)
- **ChatMessage** — Message types (system, user, assistant, tool, developer)
- **ContentBlock** — Content types (text, tool-use, tool-result, thinking, image)
- **SdkError** — Structured error taxonomy with domain/category/isInstance
- **RunUsage** — Nested usage metrics (tokens, cost, duration)
- **DynamicArgument** — Static or per-request dynamic values

## Quick Start

```typescript
import type { LanguageModelV1, Tool, ChatMessage } from "@vinhnt-sdk/provider-spec";

// Implement the model interface
const model: LanguageModelV1 = {
  specificationVersion: "v1",
  providerId: "openai",
  modelId: "gpt-4o",
  async doGenerate(options) {
    // Generate a response
    return {
      response: { id: "resp-1", modelId: model.modelId },
      text: "Hello!",
      toolCalls: [],
      usage: { inputTokens: 10, outputTokens: 5 },
      finishReason: "stop",
    };
  },
  async *doStream(options) {
    // Stream a response
    yield { type: "text", text: "Hello" };
    yield { type: "finish", finishReason: "stop", usage: { inputTokens: 10, outputTokens: 5 } };
  },
};
```

## API Reference

### Model Types

| Export | Type | Description |
|--------|------|-------------|
| `LanguageModelV1` | Interface | Vercel AI SDK-compatible model contract |
| `LanguageModelV1CallOptions` | Interface | Options for model calls |
| `LanguageModelV1GenerateResult` | Interface | Result of `doGenerate()` |
| `LanguageModelV1StreamResult` | Interface | Result of `doStream()` |
| `LanguageModelStreamPart` | Type | Stream chunk type |
| `FinishReason` | Type | Stop reason (`stop`, `tool-calls`, `length`, etc.) |
| `ProviderV1` | Interface | Provider factory interface |

### Tool Types

| Export | Type | Description |
|--------|------|-------------|
| `Tool` | Type | Tool definition (function or dynamic) |
| `FunctionTool` | Interface | Static function tool |
| `DynamicTool` | Interface | Dynamic tool (resolved at runtime) |
| `ToolContext` | Interface | Execution context passed to tools |
| `ToolExecuteFunction` | Type | Tool execution function signature |

### Message Types

| Export | Type | Description |
|--------|------|-------------|
| `ChatMessage` | Union | Any chat message |
| `SystemMessage` | Interface | System prompt message |
| `UserMessage` | Interface | User input message |
| `AssistantMessage` | Interface | Model response message |
| `ToolMessage` | Interface | Tool result message |
| `DeveloperMessage` | Interface | Developer instruction message |
| `ContentPart` | Union | Message content part |
| `ToolCallPart` | Interface | Tool call in assistant message |

### Content Block Types

| Export | Type | Description |
|--------|------|-------------|
| `ContentBlock` | Union | Any content block |
| `TextContentBlock` | Interface | Text content |
| `ToolUseContentBlock` | Interface | Tool invocation |
| `ToolResultContentBlock` | Interface | Tool result |
| `ThinkingContentBlock` | Interface | Extended thinking |
| `ImageContentBlock` | Interface | Image content |

### Error Types

| Export | Type | Description |
|--------|------|-------------|
| `SdkError` | Interface | Base error type |
| `LlmError` | Interface | LLM-specific errors |
| `ToolError` | Interface | Tool-specific errors |
| `ValidationError` | Interface | Validation errors |
| `ConfigError` | Interface | Configuration errors |
| `ErrorDomain` | Type | Error origin subsystem |
| `ErrorCategory` | Type | Error responsibility |

### Usage Types

| Export | Type | Description |
|--------|------|-------------|
| `RunUsage` | Interface | Usage metrics for a run |
| `LanguageModelUsage` | Interface | Model-level usage |
| `UsageAggregator` | Interface | Aggregates usage across steps |
| `addRunUsage` | Function | Add usage to a run total |

### Utility Types

| Export | Type | Description |
|--------|------|-------------|
| `DynamicArgument` | Type | Static or per-request value |
| `resolveDynamicArgument` | Function | Resolve a DynamicArgument |
| `RunConfig` | Interface | Global run configuration |

## Type Guards

```typescript
import {
  isTextContentBlock, isToolUseContentBlock, isToolResultContentBlock,
  isThinkingContentBlock, isImageContentBlock,
  isSystemMessage, isUserMessage, isAssistantMessage, isToolMessage, isDeveloperMessage,
} from "@vinhnt-sdk/provider-spec";

// Content blocks
if (isTextContentBlock(block)) {
  console.log(block.text);
}

if (isToolUseContentBlock(block)) {
  console.log(block.toolName, block.input);
}

// Messages
if (isAssistantMessage(msg)) {
  console.log(msg.content);
}
```

## Error Handling

```typescript
import { SdkError, LlmError, ToolError } from "@vinhnt-sdk/provider-spec";

try {
  await model.doGenerate(options);
} catch (e) {
  if (LlmError.isInstance(e)) {
    console.error(`LLM error [${e.domain}/${e.category}]: ${e.code}`);
    if (e.isRetryable) {
      // Retry the request
    }
  } else if (ToolError.isInstance(e)) {
    console.error(`Tool error: ${e.code}`);
  } else if (SdkError.isInstance(e)) {
    console.error(`SDK error: ${e.domain}/${e.category} - ${e.code}`);
  }
}
```

## DynamicArgument Pattern

```typescript
import { resolveDynamicArgument } from "@vinhnt-sdk/provider-spec";

// Static value
const config1 = { maxSteps: 10 };

// Dynamic value (resolved per request)
const config2 = {
  maxSteps: (ctx: { user: { plan: string } }) =>
    ctx.user.plan === "pro" ? 50 : 10,
};

// Resolve at runtime
const resolved = await resolveDynamicArgument(config2.maxSteps, { user: { plan: "pro" } });
console.log(resolved); // 50
```

## Dependencies

None — pure TypeScript types with zero runtime dependencies.

## License

MIT
