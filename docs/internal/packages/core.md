# @vinhnt-sdk/core

> Version: 0.1.2-beta.0 | Status: BETA

Agent kernel, tool system, session management, permissions, and plugin system.

**npm:** `npm install @vinhnt-sdk/core`  
**Size:** ~254 KB  
**Dependencies:** `@vinhnt-sdk/schema`, `@vinhnt-sdk/security`, `@vinhnt-sdk/knowledge`, `@vinhnt-sdk/tools`

---

## Overview

`core` is the heart of vinhnt-sdk. It provides:

- **AgentKernel** — The central runtime that orchestrates the agent loop
- **Tool System** — Define, register, and execute tools
- **Session Management** — Track conversation state
- **Permission System** — Control tool access
- **Plugin System** — Extend agent behavior
- **Event Bus** — Typed event emission
- **Circuit Breaker** — Resilient execution with retry logic

## Installation

```bash
npm install @vinhnt-sdk/core
```

## Quick Start

```typescript
import { AgentKernel, NullRunEventStore, defineTool } from "@vinhnt-sdk/core";
import { z } from "zod";

const tool = defineTool({
  name: "greet",
  description: "Greet someone",
  risk: "low",
  input: z.object({ name: z.string() }),
  execute: async (input) => ({ message: `Hello, ${input.name}!` }),
});

const kernel = new AgentKernel({
  model: myModelProvider,
  tools: [tool],
  store: new NullRunEventStore(),
});

const result = await kernel.run("Greet the user");
```

## Key Exports

### AgentKernel

The central class that runs the agent loop:

```typescript
const kernel = new AgentKernel({
  model: modelProvider,        // ModelProvider instance
  tools: [tool1, tool2],      // Tool definitions
  store: runEventStore,        // RunEventStore implementation
  sessionStore: sessionStore,  // Optional: SessionStore
  agentStore: agentStore,      // Optional: AgentStore
  permissionStore: permStore,  // Optional: PermissionStore
  pluginManager: pluginMgr,    // Optional: PluginManager
  toolProviders: [provider],   // Optional: ToolProvider[]
  // Retry configuration
  maxRetries: 3,               // Optional: Max retry attempts (default: 3)
  retryBackoffMs: 1000,        // Optional: Base backoff delay (default: 1000ms)
  maxRetryBackoffMs: 30000,    // Optional: Max backoff delay (default: 30000ms)
});

// Simple run
const handle = kernel.run("Do something", ctx);
const result = await handle.completed;

// Run with lifecycle management
const runHandle = kernel.createRunHandle("Do something", ctx);

// Listen to events
runHandle.onEvent((event) => {
  if (event.type === "agent.completed") {
    console.log("Status:", event.status);
  }
});

// Or iterate over events
for await (const event of runHandle.events()) {
  console.log(event.type);
}

// Cancel if needed
runHandle.cancel();

// Wait for completion
const result = await runHandle.completed;
```

### defineTool

Create typed tool definitions:

```typescript
import { defineTool } from "@vinhnt-sdk/core";
import { z } from "zod";

const myTool = defineTool({
  name: "my_tool",
  description: "What this tool does",
  risk: "medium",  // "low" | "medium" | "high"
  input: z.object({
    param: z.string(),
  }),
  execute: async (input, context) => {
    // input: { param: string } — fully typed
    // context: ToolContext — session, agent, permissions
    return { result: "success" };
  },
});
```

### ToolRegistry

Mutable registry for tool management:

```typescript
import { ToolRegistry } from "@vinhnt-sdk/core";

const registry = new ToolRegistry();
registry.register(myTool);
registry.unregister("my_tool");

const tool = registry.get("my_tool");
const allTools = registry.list();
const domainTools = registry.listByDomain("file");
```

### Permission System

```typescript
import {
  PermissionGate,
  checkRiskAllowed,
  resolveEffectivePermissions,
} from "@vinhnt-sdk/core";

// Evaluate a permission decision
const gate = new PermissionGate({
  rules: permissionRules,
  approvalStore: approvalStore,
});

const decision = await gate.evaluate({
  toolName: "execute_command",
  risk: "high",
  agentId: createAgentId("my-agent"),
});

// decision: "allow" | "deny" | "ask"
```

### Session Management

```typescript
import {
  InMemorySessionState,
  InMemorySessionTree,
  SessionRunCoordinator,
} from "@vinhnt-sdk/core";

// In-memory session (for development)
const session = new InMemorySessionState();
const tree = new InMemorySessionTree();

// Session-run coordination
const coordinator = new SessionRunCoordinator(session, tree);
```

### Plugin Manager

```typescript
import { DefaultPluginManager } from "@vinhnt-sdk/core";

const manager = new DefaultPluginManager();
manager.register(myPlugin);
manager.unregister("my-plugin");

// Hooks are called automatically during tool execution
```

### Event Bus

```typescript
import { InMemoryEventBus } from "@vinhnt-sdk/core";

const bus = new InMemoryEventBus();

// Subscribe to events
const unsub = bus.subscribe(toolEvent, (event) => {
  console.log("Tool called:", event.data.toolName);
});

// Unsubscribe
unsub();

// Stream events as async iterable
const controller = new AbortController();
for await (const event of bus.stream(toolEvent, controller.signal)) {
  console.log(event);
}

// Stream with durable replay (historical + live)
for await (const event of bus.streamWithReplay(durableEvent, "run-123")) {
  console.log(event);
}
```

## Built-in Tools

| Tool | Risk | Description |
|------|------|-------------|
| `createReadFileTool` | low | Read file contents |
| `createWriteFileTool` | high | Write file contents |
| `createEditFileTool` | medium | Edit file with search/replace |
| `createApplyPatchTool` | medium | Apply unified diff |
| `createListDirectoryTool` | low | List directory contents |
| `createShellTool` | high | Execute shell command |
| `createGlobFilesTool` | low | Find files by pattern |
| `createGrepFilesTool` | low | Search file contents |
| `createWebFetchTool` | low | Fetch URL content |
| `createWebSearchTool` | low | Web search |
| `createQuestionTool` | low | Ask user a question |
| `createReadImageTool` | low | Read image file |
| `createTodoWriteTool` | low | Manage todo list |
| `createGitStatusTool` | low | Git status |
| `createGitDiffTool` | low | Git diff |
| `createGitLogTool` | low | Git log |
| `createGitCommitTool` | high | Git commit |

## Sub-exports

```typescript
import { AgentKernel } from "@vinhnt-sdk/core/kernel";
import { defineTool } from "@vinhnt-sdk/core/tool";
import { InMemorySessionState } from "@vinhnt-sdk/core/session";
import { InMemoryAgentRegistry } from "@vinhnt-sdk/core/agent";
import { PermissionGate } from "@vinhnt-sdk/core/permission";
import { DefaultPluginManager } from "@vinhnt-sdk/core/plugin";
import { InMemoryEventBus } from "@vinhnt-sdk/core/event-bus";
```
