---
title: "Creating Tools"
description: "Build custom tools with Zod schemas"
lang: "en"
type: "guide"
category: "Guides"
sidebarPosition: 1
sidebarLabel: "Creating Tools"
tags: [tools, define-tool, zod]
version: "0.1.3"
lastUpdated: "2026-08-26"
---

# Creating Tools

Tools let your agent interact with the outside world. Here's how to build them.

## Basic Tool

```typescript
import { defineTool } from "@vinhnt-sdk/core";
import { z } from "zod";

const weatherTool = defineTool({
  name: "get_weather",
  description: "Get current weather for a city",
  risk: "read",
  input: z.object({
    city: z.string().describe("City name, e.g. 'Hanoi'"),
  }),
  async execute(input) {
    // Call weather API here
    return {
      city: input.city,
      temperature: 25,
      condition: "sunny",
    };
  },
});

// Register with kernel
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  tools: [weatherTool.toDefinition()],
});
```

## Tool Risk Levels

Every tool must declare a risk level:

| Risk | Description | Example |
|------|-------------|---------|
| `read` | Read-only, no side effects | `get_weather`, `read_file` |
| `write` | Modifies state | `write_file`, `send_email` |
| `destructive` | Irreversible changes | `delete_file`, `drop_table` |
| `external` | Calls external APIs | `web_search`, `http_request` |

```typescript
const deleteTool = defineTool({
  name: "delete_file",
  description: "Delete a file permanently",
  risk: "destructive",  // Requires explicit approval
  input: z.object({
    path: z.string().describe("File path to delete"),
  }),
  async execute(input) {
    // Delete file...
    return { deleted: input.path };
  },
});
```

## Tool with Output Schema

```typescript
const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform arithmetic calculations",
  risk: "read",
  input: z.object({
    expression: z.string().describe("Math expression like '2 + 3'"),
  }),
  output: z.object({    // Optional: validate output
    result: z.number(),
  }),
  async execute(input) {
    const parts = input.expression.match(/^(\d+)\s*([+\-*/])\s*(\d+)$/);
    if (!parts) throw new Error("Invalid format");
    const [, a, op, b] = parts;
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);

    switch (op) {
      case "+": return { result: numA + numB };
      case "-": return { result: numA - numB };
      case "*": return { result: numA * numB };
      case "/": return { result: numA / numB };
      default: throw new Error(`Unknown operator: ${op}`);
    }
  },
});
```

## Tool with Context

Tools receive a `ToolContext` with useful info:

```typescript
const readFileTool = defineTool({
  name: "read_file",
  description: "Read file contents",
  risk: "read",
  input: z.object({
    path: z.string().describe("File path relative to workspace"),
  }),
  async execute(input, ctx) {
    // ctx contains:
    // - ctx.signal: AbortSignal for cancellation
    // - ctx.runId: Current run ID
    // - ctx.toolCallId: This tool call's ID

    const content = await readFile(input.path, "utf-8");
    return { content };
  },
});
```

## Tool with Timeout

```typescript
const webSearchTool = defineTool({
  name: "web_search",
  description: "Search the web",
  risk: "external",
  timeoutMs: 10000,  // 10 second timeout
  input: z.object({
    query: z.string().describe("Search query"),
  }),
  async execute(input) {
    const results = await searchWeb(input.query);
    return { results };
  },
});
```

## Using Built-in Tools

The SDK provides ready-made tools:

```typescript
import {
  createReadFileTool,
  createWriteFileTool,
  createEditFileTool,
  createShellTool,
  createWebSearchTool,
  createGitStatusTool,
} from "@vinhnt-sdk/core";

const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  tools: [
    createReadFileTool({ workspaceRoot: "/my/project" }),
    createWriteFileTool({ workspaceRoot: "/my/project" }),
    createEditFileTool({ workspaceRoot: "/my/project" }),
    createShellTool({ workspaceRoot: "/my/project" }),
    createWebSearchTool({ apiKey: process.env.TAVILY_API_KEY }),
    createGitStatusTool({ workspaceRoot: "/my/project" }),
  ],
});
```

## Combining Tools

```typescript
const tools = [
  calculatorTool.toDefinition(),
  weatherTool.toDefinition(),
  readFileTool.toDefinition(),
];

const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  tools,
  maxSteps: 20,
});
```

## Next Steps

- [Tool Permissions](/guides/tool-permissions) — Control what tools can do
- [Creating Plugins](/guides/creating-plugins) — Extend agent with hooks
- [Express API](/frameworks/express) — Use tools in Express.js
