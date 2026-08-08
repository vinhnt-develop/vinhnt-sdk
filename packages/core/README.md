# @vinhnt-sdk/core

Core agent engine for vinhnt-sdk — kernel, orchestration, workflows.

## Install

```bash
# npm
npm install @vinhnt-sdk/core

# pnpm (monorepo)
pnpm add @vinhnt-sdk/core
```

## Quick Start

```typescript
import { AgentKernel, NullRunEventStore } from '@vinhnt-sdk/core';

const kernel = new AgentKernel({
  model: yourModelProvider,
  store: new NullRunEventStore(),
  maxSteps: 50,
});

const handle = kernel.run('Refactor this function');
const result = await handle.completed;
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `AgentKernel` | Class | Run loop orchestrator with circuit breaker |
| `DefaultPluginManager` | Class | Plugin activation and lifecycle |
| `InMemoryEventBus` | Class | Typed pub/sub event bus |
| `NullRunEventStore` | Class | No-op store for development |
| `defineTool` | Function | Define custom tools with Zod schemas |
| `LearningEngine`, `ContextCompressor` | Class | Knowledge and memory management |

## Subpath Imports

```typescript
import { AgentKernel } from '@vinhnt-sdk/core';              // main
import { defineTool } from '@vinhnt-sdk/core/tool/define';   // deep import
```

## License

MIT
