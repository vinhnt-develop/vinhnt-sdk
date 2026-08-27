---
title: "Plugin Hooks"
description: "Tất cả plugin hooks và lifecycle"
lang: "vi"
type: "guide"
category: "Guides"
sidebarPosition: 4
sidebarLabel: "Plugin Hooks"
tags: [plugins, hooks, lifecycle]
version: "0.1.3"
lastUpdated: "2026-08-26"
---

# Plugin Hooks

Tham chiếu đầy đủ cho tất cả plugin hooks có sẵn.

## Phân Loại Hooks

### Observation Hooks (read-only)

Các hooks này quan sát events nhưng không thể sửa đổi data.

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

### Mutation Hooks (có thể sửa đổi data)

Các hooks này có thể sửa đổi data trong pipeline.

```typescript
const plugin = definePlugin(manifest, {
  hooks: {
    // Sửa đổi tool input trước khi thực hiện
    onToolInvoked: async ({ toolId, toolName, input }) => {
      console.log(`Tool ${toolName} called with:`, input);
      return { input };  // Trả về input đã sửa đổi
    },

    // Sửa đổi tool output sau khi thực hiện
    onAfterToolExecution: async ({ toolId, toolName, output }) => {
      console.log(`Tool ${toolName} returned:`, output);
      return { output };  // Trả về output đã sửa đổi
    },

    // Kiểm soát permissions
    onPermissionAsk: async ({ permission, resource, reason }) => {
      if (permission === "read") {
        return { reply: "always" };
      }
      return { reply: "once" };
    },

    // Sửa đổi LLM request trước khi gửi
    onChatParams: async ({ request }) => {
      // Thêm custom headers
      return { request };
    },

    // Sửa đổi shell environment
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

## Thứ Tự Thực Hiện Hooks

```
onRunStarted
  └─> onStepStarted
       ├─> onBeforeModelCall
       ├─> onAfterModelCall
       ├─> onTokenStreamed (nhiều lần)
       ├─> onBeforeToolExecution
       │    ├─> onToolInvoked
       │    ├─> onPermissionAsk
       │    └─> onAfterToolExecution
       ├─> onToolCompleted / onToolFailed
       └─> onStepCompleted / onStepFailed
onRunCompleted
```

## Ví Dụ Đầy Đủ: Logging Plugin

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

## Ví Dụ Đầy Đủ: Analytics Plugin

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

## Bước Tiếp Theo

- [Creating Plugins](/guides/creating-plugins) — Xây dựng plugins
- [Creating Tools](/guides/creating-tools) — Xây dựng tools
- [Observability](/guides/observability) — Tracing và logging
