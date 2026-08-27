---
title: "Plugins"
description: "Build and use plugins"
lang: "en"
type: "guide"
category: "Guides"
sidebarPosition: 4
---

# Plugins

Plugins extend your agent's functionality without modifying core code. They hook into the agent lifecycle and provide reusable capabilities.

## What Are Plugins

A plugin is a self-contained module that:

- Registers hooks at specific lifecycle points
- Provides tools, middleware, or services
- Can be shared across projects via NPM

## Define a Plugin

Use `definePlugin` to create a plugin with typed hooks:

```typescript
import { definePlugin } from "vinhnt-sdk";

export const myPlugin = definePlugin({
  name: "my-plugin",
  version: "1.0.0",
  hooks: {
    onInit: async (kernel) => {
      console.log("Plugin initialized");
    },
    onMessage: async (message, next) => {
      // Pre-process message
      return next(message);
    },
  },
});
```

## Available Hooks

| Hook | Description | When Called |
|------|-------------|------------|
| `onInit` | Plugin initialization | Kernel startup |
| `onReady` | Kernel ready to process | After init complete |
| `onMessage` | Process incoming messages | Before LLM call |
| `onToolCall` | Intercept tool invocations | Before tool execution |
| `onToolResult` | Process tool results | After tool execution |
| `onResponse` | Modify LLM responses | After LLM generates |
| `onError` | Handle errors | On any error |
| `onShutdown` | Cleanup resources | Kernel shutdown |
| `onConfig` | Modify configuration | During config loading |

## Plugin Registration

Register plugins using `DefaultPluginManager`:

```typescript
import { Kernel, DefaultPluginManager } from "vinhnt-sdk";

const pluginManager = new DefaultPluginManager();
pluginManager.register(myPlugin);

const kernel = new Kernel({
  plugins: pluginManager.getPlugins(),
});
```

## NPM Loader for External Plugins

Load plugins from NPM packages automatically:

```typescript
import { NpmPluginLoader } from "vinhnt-sdk";

const loader = new NpmPluginLoader();
const plugins = await loader.load([
  "vinhnt-plugin-weather",
  "vinhnt-plugin-database",
]);

const kernel = new Kernel({ plugins });
```

## Publishing a Plugin

Export your plugin as the default export:

```typescript
// index.ts
import { definePlugin } from "vinhnt-sdk";

export default definePlugin({
  name: "my-awesome-plugin",
  version: "1.0.0",
  hooks: { /* ... */ },
});
```

Publish to NPM:

```bash
npm publish
```

## Plugin Lifecycle

Plugins follow a predictable lifecycle:

1. **Registration** — Plugin added to plugin manager
2. **Initialization** — `onInit` called during kernel startup
3. **Ready** — `onReady` signals plugin is active
4. **Processing** — Message and tool hooks execute in order
5. **Shutdown** — `onCleanup` releases resources

Plugins execute in registration order. Use the `next` function to control flow through the hook chain.
