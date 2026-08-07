# @vnt/plugin-sdk

Plugin SDK for VNT Agent — define plugins with TypeScript hooks and auto-install support.

## Install

```bash
# npm
npm install @vnt/plugin-sdk

# pnpm (monorepo)
pnpm add @vnt/plugin-sdk
```

## Quick Start

```typescript
import { definePlugin } from '@vnt/plugin-sdk';

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
import { definePlugin } from '@vnt/plugin-sdk';         // main
import { loadPlugin } from '@vnt/plugin-sdk/npm-loader'; // deep import
```

## License

MIT
