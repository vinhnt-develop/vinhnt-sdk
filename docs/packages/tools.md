# @vinhnt-sdk/tools

Built-in tools for VNT Agent — file, shell, git, web, search, image, and more.

## Installation

```bash
npm install @vinhnt-sdk/tools
```

## Overview

The tools package provides a comprehensive set of built-in tools for AI coding agents. These tools enable agents to interact with the file system, execute shell commands, search code, and more.

## Core Concepts

### Tool Definition

Tools are defined using the `defineTool` function:

```typescript
import { defineTool } from "@vinhnt-sdk/tools";
import { z } from "zod";

const myTool = defineTool({
  name: "my_tool",
  description: "A custom tool",
  risk: "read",
  input: z.object({
    query: z.string(),
  }),
  async execute(input, ctx) {
    return `Result: ${input.query}`;
  },
});
```

### Tool Risk Levels

- `read` - Read-only operations (safe)
- `write` - Write operations (requires permission)
- `destructive` - Destructive operations (requires explicit permission)
- `external` - External network operations (requires permission)

### Tool Registry

Tools are registered in a `ToolRegistry`:

```typescript
import { ToolRegistry } from "@vinhnt-sdk/tools";

const registry = new ToolRegistry();
registry.register(myTool);
```

## Built-in Tools

### File Tools

- `createReadFileTool` - Read file contents
- `createWriteFileTool` - Write file contents
- `createEditFileTool` - Edit file with search/replace
- `createApplyPatchTool` - Apply search/replace patches
- `createListDirectoryTool` - List directory contents

### Shell Tools

- `createShellTool` - Execute shell commands

### Git Tools

- `createGitStatusTool` - Get git status
- `createGitDiffTool` - Get git diff
- `createGitLogTool` - Get git log
- `createGitCommitTool` - Create git commits

### Search Tools

- `createGlobFilesTool` - Search files by pattern
- `createGrepFilesTool` - Search file contents

### Web Tools

- `createWebFetchTool` - Fetch web content
- `createWebSearchTool` - Search the web

### Image Tools

- `createReadImageTool` - Read image files

### Other Tools

- `createQuestionTool` - Ask user questions
- `createTodoWriteTool` - Manage todo lists

## API Reference

### defineTool

```typescript
function defineTool<TInput, TOutput>(
  config: ToolConfig<TInput, TOutput>
): Tool<TInput, TOutput>;
```

Creates a new tool with the given configuration.

### ToolRegistry

```typescript
class ToolRegistry {
  register(tool: ToolDefinition): void;
  unregister(id: string): boolean;
  get(id: string): ToolDefinition | undefined;
  list(): ToolDefinition[];
  count(): number;
}
```

Registry for managing tools.

## Examples

### Creating a Custom Tool

```typescript
import { defineTool } from "@vinhnt-sdk/tools";
import { z } from "zod";

const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform basic calculations",
  risk: "read",
  input: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number(),
  }),
  async execute(input) {
    switch (input.operation) {
      case "add": return input.a + input.b;
      case "subtract": return input.a - input.b;
      case "multiply": return input.a * input.b;
      case "divide": return input.a / input.b;
    }
  },
});
```

### Using ToolRegistry

```typescript
import { ToolRegistry, createReadFileTool, createWriteFileTool } from "@vinhnt-sdk/tools";

const registry = new ToolRegistry();
registry.register(createReadFileTool(getWorkspaceRoot));
registry.register(createWriteFileTool(getWorkspaceRoot));

console.log(`Registered ${registry.count()} tools`);
```
