# @vinhnt-sdk/plugin

> Plugin SDK for defining, activating, and loading plugins.

**npm:** `npm install @vinhnt-sdk/plugin`  
**Size:** ~6 KB  
**Dependencies:** `@vinhnt-sdk/core`

---

## Overview

`plugin` provides the SDK for creating and loading agent plugins.

## Installation

```bash
npm install @vinhnt-sdk/plugin
```

## Exports

### definePlugin

```typescript
import { definePlugin } from "@vinhnt-sdk/plugin";

const myPlugin = definePlugin(
  {
    name: "my-plugin",
    version: "1.0.0",
    description: "My custom plugin",
  },
  {
    hooks: {
      "tool:beforeExecute": async (ctx) => {
        console.log(`Tool: ${ctx.toolName}`);
        return ctx.input;
      },
      "tool:afterExecute": async (ctx) => {
        console.log(`Completed: ${ctx.toolName}`);
      },
    },
    activate: async (ctx) => {
      console.log("Plugin activated!");
    },
    deactivate: async () => {
      console.log("Plugin deactivated!");
    },
  }
);
```

### Available Hooks

| Hook | When |
|------|------|
| `tool:beforeExecute` | Before tool runs |
| `tool:afterExecute` | After tool succeeds |
| `tool:failed` | After tool fails |
| `run:started` | Run begins |
| `run:completed` | Run ends |
| `step:started` | Step begins |
| `step:completed` | Step ends |
| `context:compressed` | Context compacted |
| `permission:requested` | User approval needed |

### NPM Loader

```typescript
import { loadPluginFromNpm, loadNpmPlugins } from "@vinhnt-sdk/plugin/npm-loader";

// Load single plugin
const plugin = await loadPluginFromNpm("@vinhnt-sdk/otel");

// Load multiple
const plugins = await loadNpmPlugins([
  "@vinhnt-sdk/otel",
  "my-custom-plugin",
]);
```

### Publishing a Plugin

```json
{
  "name": "my-agent-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "peerDependencies": {
    "@vinhnt-sdk/core": ">=0.1.0"
  }
}
```

```typescript
export { myPlugin } from "./plugin";
```
