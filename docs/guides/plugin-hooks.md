---
title: "Plugin Hooks"
description: "Available plugin hooks and lifecycle"
lang: "en"
type: "guide"
category: "Guides"
sidebarPosition: 4
sidebarLabel: "Plugin Hooks"
tags: [plugins, hooks, lifecycle]
version: "0.1.3"
lastUpdated: "2026-08-26"
---

# Plugin Hooks

Complete reference for all available plugin hooks.

## Hook Categories

### Observation Hooks (read-only)

These hooks observe events but cannot modify data.

```typescript
const plugin = definePlugin(manifest, {
  hooks: {
    onRunStarted: async ({ runId, prompt }) => {
      console.log(`Run started: ${runId}`);
    },

    onStepStarted: async ({ step }) => {
      console.log(`Step ${step} started`);
    },

    onStepCompleted: async ({ step, toolCallCount }) => {
      console.log(`Step ${step} completed (${toolCallCount} tools)`);
    },

    onStepFailed: async ({ step, reason, error }) => {
      console.error(`Step ${step} failed: ${reason}`);
    },

    onRunCompleted: async ({ status, output, error }) => {
      console.log(`Run completed: ${status}`);
    },

    onToolCompleted: async ({ toolId, toolName, output }) => {
      console.log(`Tool ${toolName} completed`);
    },

    onToolFailed: async ({ toolId, toolName, error }) => {
      console.error(`Tool ${toolName} failed: ${error}`);
    },

    onTokenStreamed: async ({ content, step }) => {
      process.stdout.write(content);
    },

    onContextCompressed: async ({ originalCount, compressedCount }) => {
      console.log(`Context compressed: ${originalCount} -> ${compressedCount}`);
    },
  },
});
```

### Mutation Hooks (can modify data)

These hooks can modify data flowing through the pipeline.

```typescript
const plugin = definePlugin(manifest, {
  hooks: {
    // Modify tool input before execution
    onToolInvoked: async ({ toolId, toolName, input }) => {
      console.log(`Tool ${toolName} called with:`, input);
      return { input };  // Return modified input
    },

    // Modify tool output after execution
    onAfterToolExecution: async ({ toolId, toolName, output }) => {
      console.log(`Tool ${toolName} returned:`, output);
      return { output };  // Return modified output
    },

    // Control permissions
    onPermissionAsk: async ({ permission, resource, reason }) => {
      if (permission === "read") {
        return { reply: "always" };
      }
      return { reply: "once" };
    },

    // Modify LLM request before sending
    onChatParams: async ({ request }) => {
      // Add custom headers
      return { request };
    },

    // Modify shell environment
    onShellEnv: async ({ env }) => {
      env.NODE_ENV = "production";
      return { env };
    },

    // Intercept model calls
    onBeforeModelCall: async ({ request }) => {
      console.log("Model call:", request.model);
      return { request };
    },

    onAfterModelCall: async ({ response }) => {
      console.log("Model response received");
      return { response };
    },

    // Intercept tool execution
    onBeforeToolExecution: async ({ toolId, toolName, input }) => {
      console.log(`Before ${toolName}:`, input);
      return { input };
    },

    onAfterToolExecution: async ({ toolId, toolName, output }) => {
      console.log(`After ${toolName}:`, output);
      return { output };
    },
  },
});
```

## Hook Execution Order

```
onRunStarted
  └─> onStepStarted
       ├─> onBeforeModelCall
       ├─> onAfterModelCall
       ├─> onTokenStreamed (multiple)
       ├─> onBeforeToolExecution
       │    ├─> onToolInvoked
       │    ├─> onPermissionAsk
       │    └─> onAfterToolExecution
       ├─> onToolCompleted / onToolFailed
       └─> onStepCompleted / onStepFailed
onRunCompleted
```

## Complete Example: Logging Plugin

```typescript
import { definePlugin } from "@vinhnt-sdk/plugin";

export const loggingPlugin = definePlugin(
  {
    id: "logging",
    name: "Logging",
    version: "0.1.0",
  },
  {
    hooks: {
      onRunStarted: async ({ runId, prompt }) => {
        console.log(`[${timestamp()}] RUN STARTED ${runId}`);
        console.log(`  Prompt: ${prompt.substring(0, 100)}`);
      },

      onStepStarted: async ({ step }) => {
        console.log(`[${timestamp()}] STEP ${step} STARTED`);
      },

      onToolCompleted: async ({ toolName, output }) => {
        console.log(`[${timestamp()}] TOOL ${toolName} OK`);
      },

      onToolFailed: async ({ toolName, error }) => {
        console.error(`[${timestamp()}] TOOL ${toolName} FAILED: ${error}`);
      },

      onRunCompleted: async ({ status, output }) => {
        console.log(`[${timestamp()}] RUN COMPLETED: ${status}`);
        if (output) {
          console.log(`  Output: ${output.substring(0, 200)}`);
        }
      },
    },
  }
);

function timestamp() {
  return new Date().toISOString();
}
```

## Complete Example: Analytics Plugin

```typescript
export const analyticsPlugin = definePlugin(
  {
    id: "analytics",
    name: "Analytics",
    version: "0.1.0",
  },
  {
    activate: async (ctx) => {
      await initAnalytics(ctx.workspaceRoot);
    },

    hooks: {
      onRunCompleted: async ({ status, output }) => {
        await trackEvent("run_completed", {
          status,
          outputLength: output?.length ?? 0,
        });
      },

      onToolCompleted: async ({ toolName }) => {
        await trackEvent("tool_used", { tool: toolName });
      },
    },
  }
);
```

## Next Steps

- [Creating Plugins](/guides/creating-plugins) — Build plugins
- [Creating Tools](/guides/creating-tools) — Build tools
- [Observability](/guides/observability) — Tracing and logging
