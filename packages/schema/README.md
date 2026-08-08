# @vinhnt-sdk/schema

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
import { ModelProvider, RunEvent, SessionStore } from '@vinhnt-sdk/schema';

// Implement ModelProvider interface
const model: ModelProvider = {
  id: "openai-gpt4o",
  provider: "openai",
  model: "gpt-4o",
  capabilities: { streaming: true, toolCalling: true, vision: false },
  async *stream(request) {
    // Implement streaming
  },
};
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `ModelProvider` | Interface | AI model provider contract |
| `ModelRequest`, `ModelResponse` | Interface | Model I/O types |
| `RunEvent` | Interface | Event types for run lifecycle |
| `SessionStore`, `RunEventStore` | Interface | Storage contracts |
| `ChatMessage` | Interface | Message types |
| `ToolDefinitionLike` | Interface | Tool definition contract |

## Subpath Imports

```typescript
import { ModelProvider } from '@vinhnt-sdk/schema';           // main
import type { AcpEvent } from '@vinhnt-sdk/schema/contracts'; // deep import
```

## License

MIT
