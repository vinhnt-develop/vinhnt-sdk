# @vinhnt-sdk/tools

> Version: 0.1.2-beta.0 | Status: BETA

Built-in tools for vinhnt-sdk — file, shell, git, web, search, image, and more.

## Install

```bash
# npm
npm install @vinhnt-sdk/tools

# pnpm (monorepo)
pnpm add @vinhnt-sdk/tools
```

## Quick Start

```typescript
import { defineTool, ToolRegistry } from '@vinhnt-sdk/tools';
import type { ToolConfig, ToolDefinition } from '@vinhnt-sdk/schema';

// Define a custom tool
const calculatorTool = defineTool({
  name: "calculator",
  description: "Evaluate math expressions",
  parameters: {
    type: "object",
    properties: {
      expression: { type: "string", description: "Math expression" },
    },
    required: ["expression"],
  },
  async execute(args, context) {
    const result = Function(`"use strict"; return (${args.expression})`)();
    return { success: true, output: String(result) };
  },
});

// Register tool
const registry = new ToolRegistry();
registry.register(calculatorTool);

// Execute tool
const result = await registry.execute("calculator", { expression: "2 + 2" });
console.log(result.output); // "4"
```

## API Reference

### Tool Definition

```typescript
import { defineTool } from '@vinhnt-sdk/tools';

const myTool = defineTool({
  name: "my-tool",
  description: "My custom tool",
  riskLevel: "low", // "low" | "medium" | "high"
  parameters: {
    type: "object",
    properties: {
      input: { type: "string", description: "Input parameter" },
    },
    required: ["input"],
  },
  async execute(args, context) {
    // args.input is the input parameter
    // context contains sessionId, userId, etc.
    return { success: true, output: `Processed: ${args.input}` };
  },
});
```

### Tool Registry

```typescript
import { ToolRegistry } from '@vinhnt-sdk/tools';

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

| Tool | Description | Risk Level |
|------|-------------|------------|
| `file_read` | Read file contents | medium |
| `file_write` | Write to files | high |
| `file_edit` | Edit files | high |
| `shell_exec` | Execute shell commands | high |
| `git_status` | Get git status | low |
| `git_diff` | Get git diff | low |
| `git_log` | Get git log | low |
| `web_search` | Search the web | low |
| `web_fetch` | Fetch web pages | medium |
| `image_gen` | Generate images | low |
| `lint` | Lint code | low |

## Dependencies

- `@vinhnt-sdk/schema` workspace:*
- `@vinhnt-sdk/security` workspace:*
- `zod` ^4.4.3

## Peer Dependencies

- `@vinhnt-sdk/core` workspace:* (optional)

## Usage Examples

### Create Custom Tool

```typescript
import { defineTool } from '@vinhnt-sdk/tools';

const weatherTool = defineTool({
  name: "weather",
  description: "Get weather for a location",
  parameters: {
    type: "object",
    properties: {
      location: { type: "string", description: "City name" },
    },
    required: ["location"],
  },
  async execute(args) {
    // Fetch weather data
    const weather = await fetchWeather(args.location);
    return {
      success: true,
      output: {
        temperature: weather.temp,
        condition: weather.condition,
      },
    };
  },
});
```

### Use Tool in Agent

```typescript
import { AgentKernel } from '@vinhnt-sdk/core';
import { defineTool } from '@vinhnt-sdk/tools';

const kernel = new AgentKernel({
  model: yourModelProvider,
  store: yourStore,
  tools: [calculatorTool, weatherTool],
});

const handle = kernel.createRunHandle("What's the weather in Tokyo?", {
  sessionId: "session-1",
  agentId: "assistant",
  userId: "user-1",
});

const result = await handle.completed;
```

## License

MIT
