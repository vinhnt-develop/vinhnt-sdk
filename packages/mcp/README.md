# @vinhnt-sdk/mcp

MCP client pool and ACP integration for vinhnt-sdk — connect, discover, and execute tools.

## Install

```bash
# npm
npm install @vinhnt-sdk/mcp

# pnpm (monorepo)
pnpm add @vinhnt-sdk/mcp
```

## Quick Start

```typescript
import { McpClientPool, loadMcpConfig } from '@vinhnt-sdk/mcp';

const config = await loadMcpConfig('./mcp-servers.json');
const pool = new McpClientPool(config);
await pool.connectAll();

const tools = pool.getRegisteredTools();
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `McpClientPool` | Class | Connection pool for multiple MCP servers |
| `McpClient` | Class | Single MCP server client |
| `McpEventBridge` | Class | Bridge EventBus events to MCP servers |
| `McpTokenStore` | Class | OAuth token storage |
| `runOAuthFlow` | Function | Complete OAuth authorization flow |
| `loadMcpConfig` | Function | Load MCP config from file |
| `isStdioConfig`, `isHttpConfig` | Function | Config type guards |

## Subpath Imports

```typescript
import { McpClientPool } from '@vinhnt-sdk/mcp';           // main
import type { AcpEvent } from '@vinhnt-sdk/mcp/acp-types'; // deep import
```

## License

MIT
