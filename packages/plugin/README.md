# @vinhnt-sdk/plugin

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

export default definePlugin(
  { name: 'my-plugin', version: '1.0.0', description: 'My plugin' },
  {
    hooks: {
      'tool:beforeExecute': async (ctx) => { /* ... */ },
      'tool:afterExecute': async (ctx) => { /* ... */ },
    },
    activate: async (ctx) => { console.log('Plugin activated'); },
    deactivate: async () => { console.log('Plugin deactivated'); },
  }
);
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `definePlugin` | Function | Create a typed plugin with manifest + hooks |
| `PluginManifest` | Type | Plugin metadata (name, version, description) |
| `PluginContext` | Type | Runtime context provided during activation |
| `PluginHooks` | Type | Hook definitions (tool, session, permission events) |
| `Plugin` | Type | Complete plugin interface |

## Subpath Imports

```typescript
import { definePlugin } from '@vinhnt-sdk/plugin';         // main
import { loadPlugin } from '@vinhnt-sdk/plugin/npm-loader'; // deep import
```

## License

MIT
