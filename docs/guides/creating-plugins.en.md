---
title: "Creating Plugins"
description: "Build plugins with TypeScript hooks"
lang: "en"
type: "guide"
category: "Guides"
sidebarPosition: 3
sidebarLabel: "Creating Plugins"
tags: [plugins, hooks, lifecycle]
version: "0.1.3"
lastUpdated: "2026-08-26"
---

# Creating Plugins

Plugins extend agent behavior with hooks. Here's how to build them.

## Basic Plugin

```typescript
import { definePlugin } from "@vinhnt-sdk/plugin";
import type { PluginManifest } from "@vinhnt-sdk/core";

const manifest: PluginManifest = {
  id: "logging-plugin",
  name: "Logging Plugin",
  version: "0.1.0",
};

const plugin = definePlugin(manifest, {
  activate: async (ctx) => {
    console.log("Plugin activated!");
  },

  hooks: {
    onRunStarted: async (data) => {
      console.log(`Run started: ${data.runId}`);
    },
    onRunCompleted: async (data) => {
      console.log(`Run completed: ${data.status}`);
    },
  },
});
```

## Available Hooks

### Observation Hooks (read-only)

| Hook | When | Data |
|------|------|------|
| `onRunStarted` | Run begins | `{ runId, prompt }` |
| `onStepStarted` | Step begins | `{ step }` |
| `onStepCompleted` | Step ends | `{ step, toolCallCount }` |
| `onStepFailed` | Step fails | `{ step, reason, error }` |
| `onRunCompleted` | Run ends | `{ status, output, error }` |
| `onToolCompleted` | Tool succeeds | `{ toolId, toolName, output }` |
| `onToolFailed` | Tool fails | `{ toolId, toolName, error }` |
| `onTokenStreamed` | Token received | `{ content, step }` |

### Mutation Hooks (can modify data)

| Hook | When | Can Modify |
|------|------|------------|
| `onToolInvoked` | Before tool execution | `input` |
| `onBeforeToolExecution` | Before tool runs | `input` |
| `onAfterToolExecution` | After tool runs | `output` |
| `onPermissionAsk` | Permission requested | `reply` |
| `onChatParams` | Before LLM call | `request` |
| `onBeforeModelCall` | Before model call | `request` |
| `onAfterModelCall` | After model call | `response` |
| `onShellEnv` | Shell command | `env` |

## Plugin with Logging

```typescript
const loggingPlugin = definePlugin(
  {
    id: "logging",
    name: "Logging",
    version: "0.1.0",
  },
  {
    hooks: {
      onRunStarted: async ({ runId, prompt }) => {
        console.log(`[${new Date().toISOString()}] Run ${runId} started`);
        console.log(`Prompt: ${prompt.substring(0, 100)}...`);
      },

      onStepCompleted: async ({ step, toolCallCount }) => {
        console.log(`Step ${step} completed (${toolCallCount} tool calls)`);
      },

      onRunCompleted: async ({ status, output }) => {
        console.log(`Run completed: ${status}`);
        if (output) {
          console.log(`Output: ${output.substring(0, 200)}...`);
        }
      },
    },
  }
);
```

## Plugin with Tool Modification

```typescript
const toolModifierPlugin = definePlugin(
  {
    id: "tool-modifier",
    name: "Tool Modifier",
    version: "0.1.0",
  },
  {
    hooks: {
      // Modify tool input before execution
      onToolInvoked: async ({ toolId, toolName, input }) => {
        console.log(`Tool "${toolName}" called with:`, input);
        return { input };  // Return modified input
      },

      // Modify tool output after execution
      onAfterToolExecution: async ({ toolName, output }) => {
        console.log(`Tool "${toolName}" returned:`, output);
        return { output };  // Return modified output
      },
    },
  }
);
```

## Plugin with Permission Control

```typescript
const permissionPlugin = definePlugin(
  {
    id: "permission",
    name: "Permission Control",
    version: "0.1.0",
  },
  {
    hooks: {
      onPermissionAsk: async ({ permission, resource, reason }) => {
        console.log(`Permission requested: ${permission} for ${resource}`);

        // Auto-approve read operations
        if (permission === "read") {
          return { reply: "always" };
        }

        // Ask for write operations
        return { reply: "once" };
      },
    },
  }
);
```

## Plugin with Activation Logic

```typescript
const analyticsPlugin = definePlugin(
  {
    id: "analytics",
    name: "Analytics",
    version: "0.1.0",
  },
  {
    activate: async (ctx) => {
      // Initialize analytics client
      console.log("Analytics plugin activated");
      console.log("Workspace:", ctx.workspaceRoot);
    },

    deactivate: async () => {
      // Cleanup
      console.log("Analytics plugin deactivated");
    },

    hooks: {
      onRunCompleted: async ({ status, output }) => {
        // Send analytics event
        await sendAnalytics({
          event: "run_completed",
          status,
          outputLength: output?.length ?? 0,
        });
      },
    },
  }
);
```

## Register Plugin with Kernel

```typescript
import { AgentKernel } from "@vinhnt-sdk/core";
import { NullRunEventStore } from "@vinhnt-sdk/session";
import { DefaultPluginManager } from "@vinhnt-sdk/core";

const pluginManager = new DefaultPluginManager();
await pluginManager.register(loggingPlugin);
await pluginManager.register(toolModifierPlugin);

const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  pluginManager,
});
```

## Next Steps

- [Plugin Hooks](/guides/plugin-hooks) — Complete hook reference
- [Creating Tools](/guides/creating-tools) — Build custom tools
- [Creating Agents](/guides/creating-agents) — Define agents
