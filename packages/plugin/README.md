# @vinhnt-sdk/plugin

> Version: 0.1.2-beta.0 | Status: BETA

Plugin SDK for vinhnt-sdk — define plugins with TypeScript hooks and auto-install support.

## Install

```bash
# npm
npm install @vinhnt-sdk/plugin

# pnpm (monorepo)
pnpm add @vinhnt-sdk/plugin
```

## Quick Start

```typescript
import { definePlugin } from '@vinhnt-sdk/plugin';
import type { PluginContext, PluginHooks } from '@vinhnt-sdk/plugin';

// Define a plugin
const loggerPlugin = definePlugin(
  {
    name: "logger",
    version: "1.0.0",
    description: "Logs all events for debugging",
  },
  {
    hooks: {
      "agent:start": async (ctx) => {
        console.log("[Logger] Agent started:", ctx.agentId);
      },
      "agent:complete": async (ctx) => {
        console.log("[Logger] Agent completed:", ctx.status);
      },
      "tool:execute": async (ctx) => {
        console.log("[Logger] Tool executed:", ctx.toolName);
      },
    },
    activate: async (ctx: PluginContext) => {
      console.log("[Logger] Plugin activated");
    },
    deactivate: async () => {
      console.log("[Logger] Plugin deactivated");
    },
  }
);

export default loggerPlugin;
```

## API Reference

### definePlugin

```typescript
import { definePlugin } from '@vinhnt-sdk/plugin';

const plugin = definePlugin(manifest, implementation);
```

**PluginManifest:**
```typescript
interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
}
```

**PluginImplementation:**
```typescript
interface PluginImplementation {
  hooks: PluginHooks;
  activate: (ctx: PluginContext) => Promise<void>;
  deactivate: () => Promise<void>;
}
```

### Plugin Hooks

| Hook | Description |
|------|-------------|
| `agent:start` | Called when agent starts |
| `agent:complete` | Called when agent completes |
| `agent:error` | Called on agent error |
| `tool:beforeExecute` | Before tool execution |
| `tool:afterExecute` | After tool execution |
| `session:create` | When session is created |
| `session:delete` | When session is deleted |
| `permission:request` | When permission is requested |

### PluginContext

```typescript
interface PluginContext {
  agentId: string;
  sessionId: string;
  userId: string;
  toolName?: string;
  status?: string;
  // ... more context
}
```

## Dependencies

- `@vinhnt-sdk/core` workspace:*

## Peer Dependencies

None

## Usage Examples

### Logger Plugin

```typescript
import { definePlugin } from '@vinhnt-sdk/plugin';

export default definePlugin(
  {
    name: "logger",
    version: "1.0.0",
    description: "Logs all events",
  },
  {
    hooks: {
      "agent:start": async (ctx) => {
        console.log(`[${new Date().toISOString()}] Agent started: ${ctx.agentId}`);
      },
      "agent:complete": async (ctx) => {
        console.log(`[${new Date().toISOString()}] Agent completed: ${ctx.status}`);
      },
    },
    activate: async () => {
      console.log("Logger plugin activated");
    },
    deactivate: async () => {
      console.log("Logger plugin deactivated");
    },
  }
);
```

### Metrics Plugin

```typescript
import { definePlugin } from '@vinhnt-sdk/plugin';

const metrics = {
  totalRuns: 0,
  totalTokens: 0,
  totalErrors: 0,
};

export default definePlugin(
  {
    name: "metrics",
    version: "1.0.0",
    description: "Collects metrics",
  },
  {
    hooks: {
      "agent:start": async () => {
        metrics.totalRuns++;
      },
      "agent:complete": async (ctx) => {
        if (ctx.tokenUsage) {
          metrics.totalTokens += ctx.tokenUsage.total;
        }
      },
      "agent:error": async () => {
        metrics.totalErrors++;
      },
    },
    activate: async () => {
      console.log("Metrics plugin activated");
    },
    deactivate: async () => {
      console.log("Metrics:", metrics);
    },
  }
);
```

### Cache Plugin

```typescript
import { definePlugin } from '@vinhnt-sdk/plugin';

const cache = new Map<string, unknown>();

export default definePlugin(
  {
    name: "cache",
    version: "1.0.0",
    description: "Caches responses",
  },
  {
    hooks: {
      "tool:beforeExecute": async (ctx) => {
        const key = `${ctx.toolName}:${JSON.stringify(ctx.args)}`;
        if (cache.has(key)) {
          ctx.cached = cache.get(key);
          ctx.skipExecution = true;
        }
      },
      "tool:afterExecute": async (ctx) => {
        if (!ctx.skipExecution) {
          const key = `${ctx.toolName}:${JSON.stringify(ctx.args)}`;
          cache.set(key, ctx.result);
        }
      },
    },
    activate: async () => {
      console.log("Cache plugin activated");
    },
    deactivate: async () => {
      console.log("Cache size:", cache.size);
    },
  }
);
```

## License

MIT
