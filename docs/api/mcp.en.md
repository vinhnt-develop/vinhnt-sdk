---
title: "@vinhnt-sdk/mcp"
description: "MCP client for Model Context Protocol 2026-07-28"
version: "0.4.0"
lang: "en"
type: "reference"
category: "API Reference"
sidebarLabel: "mcp"
---

# @vinhnt-sdk/mcp

Model Context Protocol (MCP) client for vinhnt-sdk — MCP 2026-07-28 compliant.

Key changes from MCP 2025-03-26:
- **Stateless by default** — no session tracking
- **MRTR** (Model-Relative Tool Registration) replaces server-initiated requests
- **Resources and Prompts** are now tools (unified interface)
- **Sampling and Roots** are deprecated (use tool calls instead)

## Installation

```bash
npm install @vinhnt-sdk/mcp
```

## Exports

### `McpClient`

Connects to MCP servers and provides tool/resource access. Stateless by default (MCP 2026-07-28).

```ts
import { McpClient } from "@vinhnt-sdk/mcp";

const client = new McpClient();
const conn = await client.connect({
  name: "my-server",
  transport: "stdio",
  command: "node",
  args: ["server.js"],
  protocolVersion: "2026-07-28", // default
});

const tools = await conn.listTools();
const result = await conn.callTool("get_weather", { city: "Hanoi" });

// Deprecated in 2026-07-28 — prefer tools
const resources = await conn.listResources();
const prompts = await conn.listPrompts();

await conn.close();
```

**Constructor:** `McpClient(config: McpServerConfig)`

**Methods:**
- `connect(): Promise<void>` — Establish connection to the MCP server.
- `disconnect(): Promise<void>` — Close the connection gracefully.
- `listTools(): Promise<McpTool[]>` — Discover available tools on the server.
- `callTool(name: string, args: Record<string, unknown>): Promise<unknown>` — Invoke a tool by name with arguments.
- `isConnected(): boolean` — Check if the client is currently connected.
- `onNotification(handler: (notification: JsonRpcNotification) => void): void` — Handle server-initiated notifications.

---

### `McpClientPool`

Manages a pool of `McpClient` instances, enabling load balancing, automatic reconnection, and concurrent access to multiple MCP servers.

```ts
import { McpClientPool } from "@vinhnt-sdk/mcp";

const pool = new McpClientPool({
  maxConnections: 5,
  retryAttempts: 3,
  retryDelay: 1000,
});

pool.addClient("server-a", { name: "server-a", transport: stdioTransportA });
pool.addClient("server-b", { name: "server-b", transport: stdioTransportB });

await pool.connectAll();
const tools = await pool.listAllTools();
const result = await pool.callTool("server-a", "analyze", { data: "..." });
```

**Constructor:** `McpClientPool(options?: McpClientPoolOptions)`

**Methods:**
- `addClient(id: string, config: McpServerConfig): void` — Register a client in the pool.
- `removeClient(id: string): Promise<void>` — Disconnect and remove a client.
- `connectAll(): Promise<void>` — Connect all registered clients.
- `disconnectAll(): Promise<void>` — Disconnect all clients.
- `getClient(id: string): McpClient | undefined` — Retrieve a client by ID.
- `listAllTools(): Promise<Record<string, McpTool[]>>` — List tools from all connected servers.
- `callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<unknown>` — Route a tool call to a specific server.

---

### `McpToolMapper`

Maps MCP tools discovered from servers into the vinhnt-sdk `Tool` format, enabling seamless integration with the agent framework.

```ts
import { McpToolMapper } from "@vinhnt-sdk/mcp";

const mapper = new McpToolMapper();

const mcpTools = await client.listTools();
const sdkTools = mapper.mapTools(mcpTools);

// sdkTools can be passed directly to an Agent
agent.setTools(sdkTools);
```

**Constructor:** `McpToolMapper(options?: ToolMapperOptions)`

**Methods:**
- `mapTools(mcpTools: McpTool[]): Tool[]` — Convert MCP tools to vinhnt-sdk tools.
- `mapTool(mcpTool: McpTool): Tool` — Convert a single MCP tool.
- `addConverter(name: string, converter: ToolConverter): void` — Register a custom converter for specific tool patterns.

---

## Transport Implementations

### `StdioTransport`

Communicates with an MCP server via stdin/stdout pipes. Ideal for local process-based servers.

```ts
import { StdioTransport } from "@vinhnt-sdk/mcp";

const transport = new StdioTransport({
  command: "node",
  args: ["./my-mcp-server.js"],
  env: { ...process.env, API_KEY: "..." },
  cwd: "/path/to/server",
});
```

**Options:**
- `command: string` — The executable to run.
- `args?: string[]` — Command arguments.
- `env?: Record<string, string>` — Environment variables.
- `cwd?: string` — Working directory.

---

### `SseTransport`

Transport for Server-Sent Events (SSE) based MCP servers. Currently a stub implementation.

```ts
import { SseTransport } from "@vinhnt-sdk/mcp";

const transport = new SseTransport({
  url: "http://localhost:3000/mcp/sse",
  headers: { Authorization: "Bearer token" },
});
```

---

### `StreamableHttpTransport`

Transport for streamable HTTP-based MCP servers. Currently a stub implementation.

```ts
import { StreamableHttpTransport } from "@vinhnt-sdk/mcp";

const transport = new StreamableHttpTransport({
  url: "http://localhost:3000/mcp",
  headers: { "Content-Type": "application/json" },
});
```

---

## Types

### `McpTransport`

Interface for all transport implementations.

```ts
interface McpTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(request: JsonRpcRequest): Promise<JsonRpcResponse>;
  onNotification(handler: (notification: JsonRpcNotification) => void): void;
}
```

### `McpServerConfig`

Configuration for creating an `McpClient`.

```ts
interface McpServerConfig {
  name: string;
  transport: McpTransport;
  timeout?: number;          // Request timeout in ms (default: 30000)
  capabilities?: string[];   // Requested server capabilities
}
```

### `McpTool`

Represents a tool discovered from an MCP server.

```ts
interface McpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;  // JSON Schema for tool inputs
}
```

### `JsonRpcRequest`

A JSON-RPC 2.0 request object.

```ts
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}
```

### `JsonRpcResponse`

A JSON-RPC 2.0 response object.

```ts
interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}
```

### `JsonRpcNotification`

A JSON-RPC 2.0 notification (request without `id`).

```ts
interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}
```

---

## Configuration File

### `mcp-servers.json`

Define MCP server connections in a JSON configuration file:

```json
{
  "servers": [
    {
      "id": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/files"],
      "capabilities": ["tools"]
    },
    {
      "id": "github",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" },
      "capabilities": ["tools", "resources"]
    }
  ]
}
```

Load from configuration:

```ts
import { McpClientPool, loadMcpConfig } from "@vinhnt-sdk/mcp";

const config = await loadMcpConfig("mcp-servers.json");
const pool = new McpClientPool();
for (const server of config.servers) {
  pool.addClient(server.id, server);
}
await pool.connectAll();
```

## Dependencies

- `@vinhnt-sdk/schema` — Provides `Tool` type definitions and JSON Schema validation.
- `@vinhnt-sdk/tools` — Tool execution interface used by `McpToolMapper`.
