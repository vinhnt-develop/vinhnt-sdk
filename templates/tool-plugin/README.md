# Tool Plugin Template

A tool plugin template for vinhnt-sdk.

## Getting Started

1. Copy this directory to your project:
   ```bash
   cp -r templates/tool-plugin my-tool-plugin
   cd my-tool-plugin
   ```

2. Update `package.json`:
   - Change `name` to your plugin name
   - Update `description` and `author`
   - Add any additional dependencies

3. Customize `src/index.ts`:
   - Update the plugin manifest
   - Define your custom tools using `defineTool`
   - Implement your desired hooks
   - Add your plugin logic

4. Build the plugin:
   ```bash
   pnpm install
   pnpm build
   ```

## Plugin Structure

```
my-tool-plugin/
├── package.json
├── src/
│   └── index.ts
└── README.md
```

## Defining Tools

Use `defineTool` to create custom tools:

```typescript
import { defineTool } from "@vinhnt-sdk/tools";
import { z } from "zod";

const myTool = defineTool({
  name: "my_tool",
  description: "A custom tool",
  risk: "read", // "read" | "write" | "destructive" | "external"
  input: z.object({
    query: z.string().describe("Input description"),
  }),
  async execute(input, ctx) {
    // Your tool logic here
    return `Result: ${input.query}`;
  },
});
```

## Tool Risk Levels

- `read` - Read-only operations (safe)
- `write` - Write operations (requires permission)
- `destructive` - Destructive operations (requires explicit permission)
- `external` - External network operations (requires permission)

## Exposing Tools

Export your tools for use by the plugin system:

```typescript
export { myTool, anotherTool };
```

## Plugin Lifecycle

- `activate(ctx)` - Called when the plugin is loaded
- `deactivate()` - Called when the plugin is unloaded
- `hooks.onRunStart` - Called before a run starts
- `hooks.onRunCompleted` - Called after a run completes
- `hooks.onToolInvoked` - Called when a tool is invoked

## Usage

After building, you can use the plugin in your application:

```typescript
import { AgentKernel } from "@vinhnt-sdk/core";
import { loadPlugin } from "@vinhnt-sdk/plugin";

const kernel = new AgentKernel({ ... });

// Load the plugin
await loadPlugin("./my-tool-plugin", kernel);
```

## Example

This template includes two example tools:

1. **hello** - Say hello to someone
2. **calculator** - Perform basic calculations

## License

MIT
