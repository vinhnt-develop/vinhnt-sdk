---
title: "@vinhnt-sdk/tools"
description: "Tool framework + built-in tools"
lang: en
type: "reference"
category: "API Reference"
sidebarLabel: tools
version: "0.1.3"
---

# @vinhnt-sdk/tools

Tool framework and built-in tools for structured agent interactions.

## Exports

### `defineTool(config)`

Create a schema-first tool with typed parameters and execution logic.

```ts
import { defineTool } from "@vinhnt-sdk/tools";

const myTool = defineTool({
  name: "my_tool",
  description: "Does something useful",
  risk: "read",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
    },
    required: ["query"],
  },
  execute: async (params, context) => {
    return { result: `Processed: ${params.query}` };
  },
});
```

**Parameters:**

- `config.name` — Unique tool identifier
- `config.description` — Human-readable description (used for LLM selection)
- `config.risk` — Risk level: `"read"` | `"write"` | `"destructive"` | `"external"`
- `config.parameters` — JSON Schema for tool parameters
- `config.execute` — Async function receiving `(params, context)` and returning result

### `ToolRegistry`

Registry for managing tools by ID.

```ts
const registry = new ToolRegistry();
registry.register(myTool);
const tool = registry.get("my_tool");
const all = registry.getAll();
```

**Methods:**

- `register(tool)` — Register a tool (overwrites if exists)
- `get(id)` — Retrieve tool by ID, throws if not found
- `getAll()` — Return all registered tools
- `has(id)` — Check if tool exists
- `remove(id)` — Remove tool by ID

### `LazyToolRegistry`

Lazy on-demand tool construction. Tools are built only when first accessed.

```ts
const lazy = new LazyToolRegistry();
lazy.register("my_tool", () => buildExpensiveTool());
const tool = lazy.get("my_tool"); // Built on first call
```

### `ToolSaga`

Multi-step tool execution with rollback support.

```ts
const saga = new ToolSaga();
saga.addStep("step1", async (ctx) => { /* ... */ });
saga.addStep("step2", async (ctx) => { /* ... */ });
saga.addRollback("step2", async (ctx) => { /* undo step2 */ });
const result = await saga.execute(initialContext);
```

### `ToolProviderRegistry`

Manage multiple tool providers and merge their tool sets.

```ts
const providers = new ToolProviderRegistry();
providers.register("agent", new AgentToolProvider());
providers.register("skill", new SkillToolProvider());
const allTools = providers.getAllTools();
```

### Provider Classes

#### `AgentToolProvider`

Provides tools from agent configurations.

#### `SkillToolProvider`

Provides tools registered by skills.

#### `ToolFileProvider`

Loads tools from tool definition files on disk.

#### `ToolFileLoader`

File-based loader for discovering and loading tool definitions.

### Linting Functions

#### `lintToolDescription(description)`

Validate a tool description for quality and format.

```ts
const issues = lintToolDescription("A tool that does things");
// Returns: [] if valid, or array of issue strings
```

#### `lintToolDefinitions(definitions)`

Validate multiple tool definitions for consistency and correctness.

```ts
const issues = lintToolDefinitions([toolDef1, toolDef2]);
```

### `createToolSearchTool()`

Create a tool that searches available tools by query string.

```ts
const searchTool = createToolSearchTool();
// Returns a tool that accepts { query: string } and returns matching tools
```

## Types

### `ToolDefinition`

```ts
interface ToolDefinition {
  name: string;
  description: string;
  risk: ToolRisk;
  parameters: NestedJsonSchema;
  execute: (params: any, context: ToolContext) => Promise<any>;
}
```

### `ToolContext`

```ts
interface ToolContext {
  workingDirectory: string;
  env: Record<string, string>;
  abortSignal?: AbortSignal;
}
```

### `ToolRisk`

```ts
type ToolRisk = "read" | "write" | "destructive" | "external";
```

### `ToolHook`

```ts
interface ToolHook {
  before?: (tool, params) => Promise<any>;
  after?: (tool, params, result) => Promise<any>;
  onError?: (tool, params, error) => Promise<void>;
}
```

### `NestedJsonSchema`

Extended JSON Schema supporting nested definitions for complex parameter structures.

## Built-in Tools

| Tool | Risk | Description |
|------|------|-------------|
| `read_file` | `read` | Read file contents |
| `write_file` | `write` | Write content to file |
| `edit_file` | `write` | Perform string replacements in files |
| `list_directory` | `read` | List directory contents |
| `shell` | `destructive` | Execute shell commands |
| `git_*` | `write` | Git operations (status, diff, commit, etc.) |
| `web_search` | `external` | Search the web |
| `search_files` | `read` | Search files by pattern or content |

## Dependencies

- `@vinhnt-sdk/schema` — JSON Schema validation and types
