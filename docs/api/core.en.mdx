---
title: "@vinhnt-sdk/core"
description: "AgentKernel, plugin manager, orchestration"
version: "0.1.3"
lang: "en"
type: "reference"
category: "API Reference"
sidebarLabel: "core"
---

# @vinhnt-sdk/core

The core orchestration module of vinhnt-sdk. Provides the `AgentKernel` entry point, plugin management, event bus, model registry, and all built-in tools for agent workflows.

## Imports

```ts
import {
  AgentKernel,
  defineTool,
  ToolRegistry,
  DefaultPluginManager,
  InMemoryEventBus,
  InMemoryModelRegistry,
  SystemContextRegistry,
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

#### `run(input)`

Execute a full agent run and return the final result.

```ts
const result = await kernel.run({
  messages: [{ role: "user", content: "Summarize this file" }],
});
```

#### `createRunHandle(input)`

Create a handle for controlling a run (pause, resume, cancel).

```ts
const handle = kernel.createRunHandle({ messages });
await handle.start();
```

#### `cancel()`

Cancel the currently running agent task.

```ts
kernel.cancel();
```

### Event Streaming

```ts
const handle = kernel.createRunHandle(input);
for await (const event of handle.events()) {
  console.log(event.type, event.data);
}
```

The `events()` method returns an `AsyncIterable<AgentEvent>` yielding real-time updates including tool calls, model responses, and status changes.

---

## defineTool

Re-exported from `@vinhnt-sdk/tools`. Defines a tool that the agent can invoke.

```ts
const myTool = defineTool({
  name: "my_tool",
  description: "Does something useful",
  parameters: z.object({ input: z.string() }),
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

## SystemContextRegistry

Manages prompt sources and system context injection for agent sessions.

```ts
const ctx = new SystemContextRegistry();
ctx.addSource("project-info", () => getProjectMetadata());
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

const kernel = new AgentKernel({
  model: "gpt-4",
  plugins: [],
  permissions: { file: "readwrite", shell: "restricted" },
});

const handle = kernel.createRunHandle({
  messages: [
    { role: "user", content: "Create a hello world script" },
  ],
});

for await (const event of handle.events()) {
  if (event.type === "text_delta") {
    process.stdout.write(event.data);
  }
}

const result = await handle.result();
```
