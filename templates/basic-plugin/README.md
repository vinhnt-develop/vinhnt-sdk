# Basic Plugin Template

A basic plugin template for vinhnt-sdk.

## Getting Started

1. Copy this directory to your project:
   ```bash
   cp -r templates/basic-plugin my-plugin
   cd my-plugin
   ```

2. Update `package.json`:
   - Change `name` to your plugin name
   - Update `description` and `author`
   - Add any additional dependencies

3. Customize `src/index.ts`:
   - Update the plugin manifest
   - Implement your desired hooks
   - Add your plugin logic

4. Build the plugin:
   ```bash
   pnpm install
   pnpm build
   ```

## Plugin Structure

```
my-plugin/
├── package.json
├── src/
│   └── index.ts
└── README.md
```

## Plugin Manifest

The plugin manifest describes your plugin:

```typescript
const manifest: PluginManifest = {
  id: "my-plugin",
  name: "My Plugin",
  version: "0.1.0",
  description: "A description of my plugin",
  author: "Your Name",
};
```

## Plugin Hooks

You can implement lifecycle hooks:

```typescript
const hooks: PluginHooks = {
  onRunStart: async (ctx) => {
    // Called before a run starts
  },
  onRunCompleted: async (ctx) => {
    // Called after a run completes
  },
  onToolInvoked: async (ctx) => {
    // Called when a tool is invoked
  },
};
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
await loadPlugin("./my-plugin", kernel);
```

## License

MIT
