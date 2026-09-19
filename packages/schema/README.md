# @vinhnt-sdk/schema

> Version: 0.5.0 | Status: STABLE

Shared types and contracts for vinhnt-sdk — branded IDs, event types, error classes, Zod schemas, and API contracts.

## Install

```bash
# npm
npm install @vinhnt-sdk/schema

# pnpm (monorepo)
pnpm add @vinhnt-sdk/schema
```

## Features

- **Branded IDs** — Type-safe identifiers (RunId, SessionId, AgentId, etc.)
- **Error Classes** — Structured errors with codes, retryable flags, and context
- **Event Types** — Full run lifecycle events (started, completed, tool events, etc.)
- **Core Types** — Sessions, messages, agent configs, model interfaces
- **Zod Schemas** — Runtime validation for all contract types
- **OpenAI Wire Types** — Chat Completion format for API integration

## Quick Start

```typescript
import type {
  RunId, SessionId, AgentId,
  RunEvent, Session, Message, AgentConfig,
} from "@vinhnt-sdk/schema";
import { VntError, ToolInputError, isAgentId } from "@vinhnt-sdk/schema";

// Type-safe IDs
const runId: RunId = "run_123" as RunId;
const sessionId: SessionId = "session_456" as SessionId;

// Type guard
if (isAgentId(id)) {
  // id is safely typed as AgentId
}

// Structured errors
try {
  throw new ToolInputError("Invalid input", { toolId: "my_tool" });
} catch (e) {
  if (e instanceof VntError) {
    console.log(e.code); // "tool_input_error"
    console.log(e.retryable); // false
  }
}
```

## API Reference

### Branded IDs

| Export | Type | Description |
|--------|------|-------------|
| `RunId` | Branded string | Run identifier |
| `SessionId` | Branded string | Session identifier |
| `AgentId` | Branded string | Agent identifier |
| `TraceId` | Branded string | Trace identifier |
| `RequestId` | Branded string | Request identifier |
| `ToolCallId` | Branded string | Tool call identifier |
| `MessageId` | Branded string | Message identifier |
| `WorkspaceId` | Branded string | Workspace identifier |
| `ModelId` | Branded string | Model identifier |

### Error Classes

| Export | Description |
|--------|-------------|
| `VntError` | Base error for all SDK errors |
| `AgentNotFoundError` | Agent not found in registry |
| `AgentValidationError` | Agent configuration validation failed |
| `AgentPermissionDenied` | Agent lacks required permission |
| `ToolNotFoundError` | Tool not found in registry |
| `ToolExecutionError` | Tool execution failed |
| `ToolPermissionDenied` | Tool requires permission |
| `RunNotFoundError` | Run not found in event store |
| `RunAbortedError` | Run was aborted |
| `RunTimeoutError` | Run exceeded time limit |
| `CircuitBreakerOpenError` | Circuit breaker is open |
| `ToolInputError` | Tool input validation failed |
| `PermissionDeniedError` | Permission check failed |
| `ValidationError` | Schema validation failed |
| `TimeoutError` | Operation timed out |
| `NetworkError` | Network request failed |
| `RateLimitError` | API rate limit exceeded |
| `AuthenticationError` | Authentication failed |
| `ConfigurationError` | Configuration invalid |
| `PluginError` | Plugin execution failed |

### Event Types

| Export | Description |
|--------|-------------|
| `AgentStartedEvent` | Agent run started |
| `AgentCompletedEvent` | Agent run completed |
| `AgentErrorEvent` | Agent run errored |
| `ToolStartEvent` | Tool execution started |
| `ToolEndEvent` | Tool execution completed |
| `ModelRequestEvent` | LLM request sent |
| `ModelResponseEvent` | LLM response received |
| `AgentThinkingEvent` | Extended thinking started |
| `PermissionEvent` | Permission requested |

### Core Types

| Export | Description |
|--------|-------------|
| `Session` | Session data |
| `Message` | Chat message |
| `AgentConfig` | Agent configuration |
| `AgentProfile` | Agent profile |
| `ModelProvider` | Model provider contract |
| `ModelRequest` | Model input request |
| `ModelResponse` | Model output response |
| `ToolCall` | Tool invocation |
| `ToolCallResult` | Tool execution result |

### Zod Schemas

```typescript
import {
  AgentConfigSchema, MessageSchema, SessionSchema,
  RunStartedDataSchema, ToolCompletedDataSchema,
} from "@vinhnt-sdk/schema";

// Validate runtime data
const result = AgentConfigSchema.safeParse(rawConfig);
if (result.success) {
  const config = result.data;
}
```

## Dependencies

- `zod` ^4.4.3

## License

MIT
