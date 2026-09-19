# @vinhnt-sdk/tools

> Version: 0.4.2 | Status: STABLE

Tool framework and built-in tools for vinhnt-sdk — file, shell, git, web, search, middleware, and more.

## Install

```bash
# npm
npm install @vinhnt-sdk/tools

# pnpm (monorepo)
pnpm add @vinhnt-sdk/tools
```

## Features

- **defineTool** — Define tools with Zod schemas, JSON Schema, risk levels, and annotations
- **ToolMiddleware** — Wrap tool execution with cross-cutting concerns (logging, auth, retry)
- **ToolHook** — Pre/post lifecycle hooks for tool calls
- **ToolRegistry** — Tool registration, lookup, and execution with filtering
- **LazyToolRegistry** — Lazy-load tools on first use
- **ToolProvider** — Plugin-based tool discovery
- **Built-in Tools** — File, shell, git, web search, glob, grep, image tools
- **ToolSaga** — Compensation actions for multi-step tool operations

## Quick Start

```typescript
import { defineTool, ToolRegistry } from "@vinhnt-sdk/tools";
import { z } from "zod";

const calculatorTool = defineTool({
  name: "calculator",
  description: "Evaluate math expressions",
  risk: "read",
  input: z.object({
    expression: z.string().describe("Math expression"),
  }),
  async execute(args, context) {
    const result = Function(`"use strict"; return (${args.expression})`)();
    return { success: true, output: String(result) };
  },
}).toDefinition();

const registry = new ToolRegistry();
registry.register(calculatorTool);

const result = await registry.execute("calculator", { expression: "2 + 2" });
console.log(result.output); // "4"
```

## API Reference

### Tool Definition

```typescript
import { defineTool } from "@vinhnt-sdk/tools";
import { z } from "zod";

const myTool = defineTool({
  name: "my-tool",
  description: "My custom tool",
  risk: "read", // "none" | "read" | "write" | "destructive" | "external"
  input: z.object({
    input: z.string().describe("Input parameter"),
  }),
  annotations: {
    title: "My Tool",
    readOnlyHint: true,
    openWorldHint: false,
  },
  async execute(args, context) {
    return { success: true, output: `Processed: ${args.input}` };
  },
}).toDefinition();
```

### ToolMiddleware

```typescript
import type { ToolMiddleware } from "@vinhnt-sdk/tools";

const loggingMiddleware: ToolMiddleware = {
  id: "logging",
  async execute(tool, input, next) {
    console.log(`Tool ${tool.id} called with`, input);
    const result = await next(input);
    console.log(`Tool ${tool.id} returned`, result);
    return result;
  },
};

// Apply middleware via ToolRegistry
const registry = new ToolRegistry({ middleware: [loggingMiddleware] });
```

### ToolRegistry

```typescript
import { ToolRegistry } from "@vinhnt-sdk/tools";

const registry = new ToolRegistry();

// Register tools
registry.register(tool1);
registry.register(tool2);

// List tools
const tools = registry.getTools();

// Get tool by name
const tool = registry.get("calculator");

// Execute tool
const result = await registry.execute("calculator", { expression: "2 + 2" });

// Validate tool parameters
const validation = registry.validate("calculator", { expression: "2 + 2" });
```

### Built-in Tools

| Tool Factory | Description | Risk Level |
|------|-------------|------------|
| `createReadFileTool` | Read file contents | read |
| `createWriteFileTool` | Write to files | destructive |
| `createEditFileTool` | Edit files | destructive |
| `createApplyPatchTool` | Apply patches | destructive |
| `createListDirectoryTool` | List directory contents | read |
| `createShellTool` | Execute shell commands | external |
| `createGlobFilesTool` | Find files by pattern | read |
| `createGrepFilesTool` | Search file contents | read |
| `createWebSearchTool` | Search the web | external |
| `createWebFetchTool` | Fetch web pages | external |
| `createGitStatusTool` | Get git status | read |
| `createGitDiffTool` | Get git diff | read |
| `createGitLogTool` | Get git log | read |
| `createGitCommitTool` | Create git commits | write |
| `createReadImageTool` | Read image files | read |
| `createQuestionTool` | Ask user questions | read |
| `createTodoWriteTool` | Write todo items | write |

## Dependencies

- `@vinhnt-sdk/schema` >=0.5.0
- `@vinhnt-sdk/guard` workspace:*
- `@vinhnt-sdk/sandbox` workspace:*
- `@vinhnt-sdk/security` workspace:*
- `zod` ^4.4.3

## Usage Examples

### Tool Middleware Pattern

```typescript
import type { ToolMiddleware, ToolDefinition, ToolExecutionResult } from "@vinhnt-sdk/tools";

const authMiddleware: ToolMiddleware = {
  id: "auth",
  async execute(tool, input, next) {
    // Check permissions before execution
    if (tool.risk === "destructive") {
      const approved = await checkApproval(tool.id);
      if (!approved) {
        return { status: "denied", reason: "Not approved" };
      }
    }
    return next(input);
  },
};
```

### Tool Hooks

```typescript
import type { ToolHook } from "@vinhnt-sdk/tools";

const auditHook: ToolHook = {
  id: "audit",
  async pre({ toolId, tool, input }) {
    await logAudit(toolId, "start", input);
    return null; // Continue execution
  },
  async post({ toolId, tool, input, result }) {
    await logAudit(toolId, "end", { input, result });
    return null; // Don't modify result
  },
};
```

### ToolSaga (Compensation)

```typescript
import { ToolSaga } from "@vinhnt-sdk/tools";

const saga = new ToolSaga();

// Register steps with compensation
saga.addStep({
  tool: "create-file",
  input: { path: "/tmp/file.txt", content: "hello" },
  compensate: { tool: "delete-file", input: { path: "/tmp/file.txt" } },
});

// Execute all steps; compensate on failure
const result = await saga.execute(context);
```

## License

MIT
