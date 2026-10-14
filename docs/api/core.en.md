---
title: "@vinhnt-sdk/core"
description: "AgentKernel, plugin manager, orchestration"
version: "0.10.9"
lang: "en"
type: "reference"
category: "API Reference"
sidebarLabel: "core"
---

# @vinhnt-sdk/core

The core orchestration module of vinhnt-sdk. Provides the `AgentKernel` entry point, plugin management, event bus, model registry, and essential tools for agent workflows.

> **Note:** As of v0.4.0, core exports are slimmed down. Import from specific packages for full access.

## Imports

```ts
import {
  AgentKernel,
  defineTool,
  ToolRegistry,
  DefaultPluginManager,
  InMemoryEventBus,
  InMemoryModelRegistry,
  ContextRegistry,
} from "@vinhnt-sdk/core";
```

---

## AgentKernel

Main entry point for configuring and running an agent.

### Constructor

```ts
new AgentKernel(config: AgentKernelConfig)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `AgentKernelConfig` | Kernel configuration including plugins, models, tools, and permissions |

### Methods

#### `run(prompt, ctx, sessionId?)`

Start a new agent run and return a `RunHandle` (`runId`, `completed` promise, `abort()`). The second argument is the request context (`requestId`, `traceId`, `actorId`, `tenantId`).

```ts
const handle = kernel.run('Summarize this file', ctx);
await handle.completed;
```

#### `createRunHandle(prompt, ctx, sessionId?)`

Create an `AgentRunHandle` with lifecycle control: `completed` (resolves to `AgentRunResult`), `cancel()`, `events()`, and `onEvent()`.

```ts
const handle = kernel.createRunHandle('Summarize this file', ctx);
const result = await handle.completed;
console.log(result.status);
```

#### `cancelCurrentRun()`

Abort all currently running sessions.

```ts
kernel.cancelCurrentRun();
```

### Event Streaming

```ts
const handle = kernel.createRunHandle('Summarize this file', ctx);
for await (const event of handle.events()) {
  console.log(event.type);
}
```

The `events()` method returns an `AsyncIterable<AgentEvent>` yielding lifecycle updates (`agent.started`, `agent.completed`, `agent.error`). For the full run event stream (steps, tools, tokens), see `streamRun`.

---

## defineTool

Re-exported from `@vinhnt-sdk/tools`. Defines a tool that the agent can invoke.

```ts
const myTool = defineTool({
  name: "my_tool",
  description: "Does something useful",
  risk: "read",
  input: z.object({ input: z.string() }),
  execute: async (params) => {
    return { result: `Processed: ${params.input}` };
  },
});
```

---

## ToolRegistry

Re-exported from `@vinhnt-sdk/tools`. Manages registration and lookup of tools.

```ts
const registry = new ToolRegistry();
registry.register(myTool);
const tool = registry.get("my_tool");
```

---

## DefaultPluginManager

Manages the full plugin lifecycle: loading, initializing, starting, and stopping plugins.

```ts
const manager = new DefaultPluginManager();
await manager.loadAll(config.plugins);
await manager.startAll();
await manager.stopAll();
```

### Plugin Lifecycle

1. **Load** — Resolve and validate plugin manifests
2. **Init** — Call `onInit` hooks
3. **Start** — Call `onStart` hooks, register tools
4. **Stop** — Call `onStop` hooks, cleanup resources

---

## InMemoryEventBus

Lightweight in-memory pub/sub event bus for agent-internal communication.

```ts
const bus = new InMemoryEventBus();
bus.on("tool:executed", (event) => console.log(event));
bus.emit("tool:executed", { tool: "search", result: "..." });
```

---

## InMemoryModelRegistry

In-memory registry for model configurations and provider bindings.

```ts
const registry = new InMemoryModelRegistry();
registry.register("gpt-4", { provider: "openai", maxTokens: 8192 });
const model = registry.get("gpt-4");
```

---

## ContextRegistry

Manages prompt sources and system context injection for agent sessions.

```ts
import { createContextRegistry } from "@vinhnt-sdk/core";

const registry = createContextRegistry();
registry.register(source); // ContextSourceValue: { key, load, renderBaseline, renderUpdate, renderRemoval }
const context = await registry.initialize(); // resolves the SystemContext
```

---

## Built-in Tools (17)

The following tools are registered by default when using `AgentKernel`:

| Tool | Category | Description |
|------|----------|-------------|
| `file_read` | File | Read file contents |
| `file_write` | File | Write or create files |
| `file_edit` | File | Edit existing files |
| `file_delete` | File | Delete files |
| `file_list` | File | List directory contents |
| `shell_execute` | Shell | Run shell commands |
| `git_status` | Git | Get repository status |
| `git_diff` | Git | Show file differences |
| `git_log` | Git | View commit history |
| `search_files` | Search | Search files by pattern |
| `search_content` | Search | Grep file contents |
| `web_fetch` | Web | Fetch URL content |
| `web_search` | Web | Search the web |
| `image_generate` | Image | Generate images |
| `ask_question` | Question | Ask user for input |
| `todo_manage` | Todo | Manage task lists |
| `skill_load` | Skill | Load and use skills |

Additionally, memory tools (`memory_store`, `memory_retrieve`, `memory_search`) are available when a knowledge backend is configured.

---

## Dependencies

The core module depends on the following vinhnt-sdk packages:

| Package | Purpose |
|---------|---------|
| `@vinhnt-sdk/schema` | Type definitions and validation |
| `@vinhnt-sdk/config` | Configuration management |
| `@vinhnt-sdk/llm` | LLM provider abstraction |
| `@vinhnt-sdk/tools` | Tool definitions and registry |
| `@vinhnt-sdk/sandbox` | Sandboxed execution environment |
| `@vinhnt-sdk/guard` | Safety guardrails |
| `@vinhnt-sdk/session` | Session management |
| `@vinhnt-sdk/permission` | Permission and access control |
| `@vinhnt-sdk/step-executor` | Step-by-step execution engine |
| `@vinhnt-sdk/event` | Event types and interfaces |
| `@vinhnt-sdk/knowledge` | Knowledge base integration |
| `@vinhnt-sdk/security` | Security policies and checks |

---

## Example: Basic Usage

```ts
import { AgentKernel } from "@vinhnt-sdk/core";
import { NullRunEventStore } from "@vinhnt-sdk/session";
import { createDeepSeekProvider } from "@vinhnt-sdk/provider-openai-compatible";

const model = createDeepSeekProvider({ apiKey: process.env.DEEPSEEK_API_KEY! });
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
});

const ctx = {
  requestId: "req-1",
  traceId: "trace-1",
  actorId: "user-1",
  tenantId: "default",
};

// Full run event stream (KnownRunEvent) — stream generated text to stdout:
const { runId, events } = kernel.streamRun("Create a hello world script", ctx);

for await (const event of events) {
  if (event.type === "token.streamed") {
    process.stdout.write(event.data.content);
  }
  if (event.type === "run.completed") {
    console.log(`\nRun ${runId} finished: ${event.data.status}`);
  }
}
```
