# @vinhnt-sdk/mcp

> MCP client pool, ACP bridge, and OAuth for external tool servers.

**npm:** `npm install @vinhnt-sdk/mcp`  
**Size:** ~28 KB  
**Dependencies:** `@vinhnt-sdk/core`, `@vinhnt-sdk/schema`, `@modelcontextprotocol/client`

---

## Overview

`mcp` provides:

- **McpClientPool** — Manage multiple MCP server connections
- **McpClient** — Single MCP server connection
- **McpEventBridge** — Bridge MCP events to agent event bus
- **AcpClient** — WebSocket client for editor integration

## Installation

```bash
npm install @vinhnt-sdk/mcp
```

## Exports

### McpClientPool

```typescript
import { McpClientPool, loadMcpConfig } from "@vinhnt-sdk/mcp";

const config = loadMcpConfig("./mcp-servers.json");
const pool = new McpClientPool(config);

// Connect to all servers
await pool.connectAll();

// Get all tools from all servers
const tools = pool.getTools();
// [{ name: "filesystem.read_file", ... }, { name: "github.search", ... }]

// Disconnect
await pool.disconnectAll();
```

### McpClient

```typescript
import { McpClient } from "@vinhnt-sdk/mcp";

const client = new McpClient({
  name: "my-server",
  transport: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
});

await client.connect();

// List tools
const tools = await client.listTools();

// Call a tool
const result = await client.callTool("read_file", {
  path: "/tmp/test.txt",
});

await client.disconnect();
```

### MCP Config Format

```json
{
  "servers": [
    {
      "name": "filesystem",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"]
    },
    {
      "name": "github",
      "transport": "http",
      "url": "https://mcp-github.example.com",
      "headers": {
        "Authorization": "Bearer ${GITHUB_TOKEN}"
      }
    }
  ]
}
```

### AcpClient (WebSocket)

```typescript
import { AcpClient } from "@vinhnt-sdk/mcp/acp";

const acp = new AcpClient({
  url: "ws://localhost:3000/acp",
});

await acp.connect();

// Create session
const session = await acp.createSession({
  agentId: "coding-assistant",
});

// Start task
const task = await acp.startTask({
  sessionId: session.id,
  prompt: "Fix the bug in main.ts",
});

// Listen for events
acp.on("task.stream", (notification) => {
  console.log(notification.data);
});

// Disconnect
await acp.disconnect();
```

### OAuth Flow

```typescript
import { McpTokenStore, runOAuthFlow } from "@vinhnt-sdk/mcp";

const tokenStore = new McpTokenStore();

const token = await runOAuthFlow({
  clientId: "your-client-id",
  scopes: ["read", "write"],
}, tokenStore);
```
