---
title: "@vinhnt-sdk/plugin"
description: "Plugin hooks and npm loader"
version: "0.1.3"
lang: "en"
type: "reference"
category: "API Reference"
sidebarLabel: "plugin"
---

# @vinhnt-sdk/plugin

Defines the plugin system for vinhnt-sdk. Provides utilities for creating plugins with lifecycle hooks and loading them from npm packages.

## Imports

```ts
import {
  definePlugin,
  loadPluginFromNpm,
  loadNpmPlugins,
} from "@vinhnt-sdk/plugin";
```

---

## definePlugin

Define a plugin with a manifest and setup function containing lifecycle hooks.

```ts
import { definePlugin } from "@vinhnt-sdk/plugin";

export default definePlugin(
  {
    name: "my-plugin",
    version: "1.0.0",
    description: "A custom plugin",
    author: "developer",
    dependencies: [],
  },
  (manifest) => ({
    async onInit(ctx) {
      console.log("Plugin initialized");
    },

    async onStart(ctx) {
      console.log("Plugin started");
    },

    async onStop(ctx) {
      console.log("Plugin stopped");
    },

    async onToolRegister(ctx) {
      return [
        {
          name: "my_tool",
          description: "Custom tool",
          parameters: { input: { type: "string" } },
        },
      ];
    },

    async onToolExecute(ctx, toolName, params) {
      if (toolName === "my_tool") {
        return { result: `Processed: ${params.input}` };
      }
    },

    async onModelCall(ctx, request) {
      return request;
    },

    async onPermissionCheck(ctx, permission) {
      return { allowed: true };
    },

    async onSessionCreate(ctx, session) {
      console.log("Session created:", session.id);
    },

    async onSessionDestroy(ctx, session) {
      console.log("Session destroyed:", session.id);
    },
  })
);
```

---

## loadPluginFromNpm

Load a single plugin from an npm package.

```ts
const plugin = await loadPluginFromNpm("@vinhnt-sdk/plugin-search", process.cwd());
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `spec` | `string` | npm package name or spec (e.g., `@scope/package@version`) |
| `cwd` | `string` | Working directory for resolution |

### Returns

Returns a `Plugin` instance ready for registration with `DefaultPluginManager`.

---

## loadNpmPlugins

Load multiple plugins from npm packages concurrently.

```ts
const plugins = await loadNpmPlugins(
  ["@vinhnt-sdk/plugin-search", "@vinhnt-sdk/plugin-analytics"],
  process.cwd()
);
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `specs` | `string[]` | Array of npm package specs |
| `cwd` | `string` | Working directory for resolution |

---

## Types

### Plugin

```ts
interface Plugin {
  manifest: PluginManifest;
  hooks: PluginHooks;
}
```

### PluginManifest

Metadata describing the plugin.

```ts
interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
}
```

### PluginHooks

Nine lifecycle hooks available to plugins:

```ts
interface PluginHooks {
  onInit?: (ctx: PluginContext) => Promise<void>;
  onStart?: (ctx: PluginContext) => Promise<void>;
  onStop?: (ctx: PluginContext) => Promise<void>;
  onToolRegister?: (ctx: PluginContext) => Promise<ToolDefinition[]>;
  onToolExecute?: (
    ctx: PluginContext,
    toolName: string,
    params: Record<string, unknown>
  ) => Promise<unknown>;
  onModelCall?: (
    ctx: PluginContext,
    request: ModelRequest
  ) => Promise<ModelRequest>;
  onPermissionCheck?: (
    ctx: PluginContext,
    permission: PermissionRequest
  ) => Promise<PermissionResult>;
  onSessionCreate?: (
    ctx: PluginContext,
    session: Session
  ) => Promise<void>;
  onSessionDestroy?: (
    ctx: PluginContext,
    session: Session
  ) => Promise<void>;
}
```

### Hook Descriptions

| Hook | When it fires | Use case |
|------|--------------|----------|
| `onInit` | Plugin loaded and validated | Setup configuration, connect to services |
| `onStart` | Agent kernel starts | Register event listeners, warm caches |
| `onStop` | Agent kernel shuts down | Cleanup resources, close connections |
| `onToolRegister` | During tool registration | Provide additional tools |
| `onToolExecute` | Before a tool executes | Intercept, modify, or handle tool calls |
| `onModelCall` | Before an LLM request | Modify prompts, add context, cache |
| `onPermissionCheck` | On permission request | Grant or deny permissions dynamically |
| `onSessionCreate` | New agent session created | Initialize session state |
| `onSessionDestroy` | Agent session ended | Persist session data, cleanup |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `@vinhnt-sdk/core` | Plugin context, tool registry, kernel integration |

---

## Example: Plugin with Custom Tool

```ts
import { definePlugin } from "@vinhnt-sdk/plugin";
import { defineTool } from "@vinhnt-sdk/core";

export default definePlugin(
  {
    name: "math-tools",
    version: "1.0.0",
  },
  () => ({
    async onToolRegister() {
      return [
        defineTool({
          name: "add",
          description: "Add two numbers",
          parameters: {
            a: { type: "number" },
            b: { type: "number" },
          },
          execute: async ({ a, b }) => ({ result: a + b }),
        }),
      ];
    },
  })
);
```

## Example: Loading Plugins

```ts
import { loadPluginFromNpm, loadNpmPlugins } from "@vinhnt-sdk/plugin";
import { AgentKernel, DefaultPluginManager } from "@vinhnt-sdk/core";

const manager = new DefaultPluginManager();

// Load single plugin
const searchPlugin = await loadPluginFromNpm(
  "@vinhnt-sdk/plugin-search",
  process.cwd()
);

// Or load multiple at once
const plugins = await loadNpmPlugins(
  ["@vinhnt-sdk/plugin-search", "@vinhnt-sdk/plugin-analytics"],
  process.cwd()
);

manager.register(searchPlugin);
manager.registerAll(plugins);

const kernel = new AgentKernel({
  plugins: manager.getAll(),
});
```
