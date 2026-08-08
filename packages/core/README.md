# @vnt/agent-core

Core agent engine for VNT Agent — kernel, tools, sessions, plugins, permissions, and knowledge.

## Install

```bash
# npm
npm install @vnt/agent-core

# pnpm (monorepo)
pnpm add @vnt/agent-core
```

## Quick Start

```typescript
import { AgentKernel, InMemoryToolRegistry, InMemorySessionState } from '@vnt/agent-core';

const kernel = new AgentKernel({
  modelProvider: myProvider,
  toolRegistry: new InMemoryToolRegistry(),
  sessionState: new InMemorySessionState(),
});

const handle = await kernel.startRun({ prompt: 'Refactor this function' });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `AgentKernel` | Class | Run loop orchestrator with circuit breaker |
| `ModelCaller` | Class | Model invocation with streaming |
| `PermissionGate` | Class | 4-phase permission evaluation |
| `ToolRegistry`, `InMemoryToolRegistry` | Class | Tool registration and lookup |
| `ToolRuntime` | Class | Tool execution with sandbox and hooks |
| `ToolSaga` | Class | Transactional tool rollback support |
| `SessionRunCoordinator` | Class | Session-aware run lifecycle management |
| `DefaultPluginManager` | Class | Plugin activation and lifecycle |
| `InMemoryEventBus` | Class | Typed pub/sub event bus |
| `createReadFileTool`, `createShellTool`, ... | Function | 36 built-in tool factories |
| `defineTool` | Function | Define custom tools with Zod schemas |
| `LearningEngine`, `ContextCompressor` | Class | Knowledge and memory management |
| `WorkspaceManager` | Class | Multi-workspace support |

## Subpath Imports

```typescript
import { AgentKernel } from '@vnt/agent-core';              // main
import { defineTool } from '@vnt/agent-core/tool/define';   // deep import
import { EventBus } from '@vnt/agent-core/event-bus';      // deep import
```

## License

MIT
