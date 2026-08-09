# @vinhnt-sdk/tools

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
import { ToolRegistry, createBuiltinToolProvider } from '@vinhnt-sdk/tools';

const registry = new ToolRegistry();
registry.registerProvider(createBuiltinToolProvider());

// Available tools: file_read, file_write, file_edit, shell_exec, git_status, web_search, etc.
const tools = registry.getTools();
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `ToolRegistry` | Class | Central registry for managing tools |
| `BuiltinToolProvider` | Class | Provides all built-in tools |
| `createBuiltinToolProvider` | Function | Factory for builtin tool provider |
| `ToolFileProvider` | Class | Load user-defined tools from `.vnt/tools/` |
| `FileTools` | Class | File read/write/edit operations |
| `ShellTool` | Class | Shell command execution |
| `GitTools` | Class | Git operations (status, diff, log) |
| `WebSearchTool` | Class | Web search via Tavily/Serper |
| `WebFetchTool` | Class | Fetch and parse web pages |
| `ImageGenTool` | Class | Image generation |
| `LintTool` | Class | Code linting |
| `ToolDescriptionLinter` | Class | Lint tool descriptions for quality |

## Peer Dependencies

- `@vinhnt-sdk/core` — Required for tool integration

## License

MIT
