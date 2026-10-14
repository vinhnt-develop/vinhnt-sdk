---
title: "@vinhnt-sdk/mcp"
description: "MCP client for Model Context Protocol 2026-07-28"
version: "0.4.6"
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

**Methods:**
- `connect(config: McpServerConfig): Promise<McpConnection>` — Connect to an MCP server, returns a connection handle.
- `getConnection(name: string): McpConnection | undefined` — Get an existing connection by server name.
- `closeAll(): Promise<void>` — Close all open connections.

### `McpConnection`

Result handle from `client.connect(...)`.

**Properties:** `serverInfo`, `capabilities`, `protocolVersion`.

**Methods:**
- `listTools(): Promise<McpTool[]>` — Discover available tools on the server.
- `callTool(name: string, args?: Record<string, unknown>): Promise<CallToolResult>` — Invoke a tool by name with arguments.
- `listResources(): Promise<McpResource[]>` — List resources (deprecated, prefer tools).
- `readResource(uri: string): Promise<string>` — Read a resource (deprecated).
- `listPrompts()` / `getPrompt(name, args?)` — Prompt access (deprecated).
- `close(): Promise<void>` — Disconnect from the server.

---

### `McpToolProvider`

Wraps `McpClient` + tool discovery into a `ToolProvider` so MCP tools can be registered into the `ToolProviderRegistry`.

```ts
import { McpToolProvider } from "@vinhnt-sdk/mcp";

const provider = new McpToolProvider({
  name: "github",
  transport: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  env: { GITHUB_TOKEN: "xxx" },
});
await provider.connect(); // spawns the server and discovers tools
registry.registerProvider(provider);

// Later: re-discover after a listChanged notification
await provider.refresh();

// Teardown
await provider.close();
```

**Constructor:** `McpToolProvider(config: McpToolProviderConfig)` — `McpServerConfig` + optional `id` (defaults to `"mcp:<name>"`).

**Methods:**
- `connect(): Promise<void>` — Connect to the MCP server and discover tools (call before registering).
- `getConnection(): McpConnection | null` — Underlying connection for direct access.
- `toolCount(): number` — Number of discovered tools.
- `get tools(): ToolDefinition[]` — Discovered tools as vinhnt-sdk definitions.
- `refresh(): Promise<void>` — Re-discover tools.
- `close(): Promise<void>` — Disconnect and clear tools.

---

### `mapMcpTool` / `discoverMcpTools`

Maps MCP tools into vinhnt-sdk `ToolDefinition`s, enabling seamless integration with the agent framework.

```ts
import { discoverMcpTools, mapMcpTool, mcpDomain, mcpToolId } from "@vinhnt-sdk/mcp";

// Map every tool on a connection
const sdkTools = await discoverMcpTools("my-server", conn);
// → ToolDefinition[] — pass directly into kernel config `tools`

// Or map a single tool
const tool = mapMcpTool("my-server", mcpTool, conn);

// Naming conventions
mcpDomain("my-server");              // "mcp:my-server"
mcpToolId("my-server", "get_weather"); // "mcp__my-server__get_weather"
```

Mapped tools get `risk: "external"`, `metadata.source: "mcp"`, and a namespaced id `mcp__<server>__<tool>`.

---

## Transports

Transport is selected via `McpServerConfig.transport` — implementations (`stdio`, `sse`, `streamable-http`) are created internally by `McpClient.connect()`.

```ts
// Local process via stdin/stdout
const local = await client.connect({
  name: "filesystem",
  transport: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/files"],
  env: { ...process.env },
});

// Server-Sent Events
const sse = await client.connect({
  name: "remote",
  transport: "sse",
  url: "http://localhost:3000/mcp/sse",
  headers: { Authorization: "Bearer token" },
});

// Streamable HTTP
const http = await client.connect({
  name: "http-server",
  transport: "streamable-http",
  url: "http://localhost:3000/mcp",
});
```

---

## Types

### `McpTransport`

Interface implemented by the internal transports.

```ts
interface McpTransport {
  request(req: JsonRpcRequest): Promise<JsonRpcResponse>;
  notify(notification: JsonRpcNotification): void;
  onMessage(handler: (msg: JsonRpcResponse | JsonRpcNotification) => void): () => void;
  close(): Promise<void>;
}
```

`McpTransportType = "stdio" | "sse" | "streamable-http" | (string & {})`

### `McpServerConfig`

Configuration accepted by `McpClient.connect()` (and `McpToolProvider`).

```ts
interface McpServerConfig {
  readonly name: string;
  readonly transport: "stdio" | "sse" | "streamable-http";
  readonly protocolVersion?: string;   // default: "2026-07-28"
  readonly command?: string;           // stdio
  readonly args?: string[];            // stdio
  readonly env?: Record<string, string>;
  readonly url?: string;               // sse / streamable-http
  readonly headers?: Record<string, string>;
  readonly timeoutMs?: number;         // default: 30000
  readonly metadata?: Record<string, unknown>;
}
```

### `McpTool`

Represents a tool discovered from an MCP server.

```ts
interface McpTool {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: Record<string, unknown>; // JSON Schema for tool inputs
  readonly annotations?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}
```

### `CallToolResult`

```ts
interface CallToolResult {
  readonly content: ReadonlyArray<
    | { readonly type: "text"; readonly text: string }
    | { readonly type: "image"; readonly data: string; readonly mimeType: string }
    | { readonly type: "resource"; readonly resource: { readonly uri: string; readonly mimeType?: string; readonly text?: string } }
  >;
  readonly isError?: boolean;
}
```

### `JsonRpcRequest` / `JsonRpcResponse` / `JsonRpcNotification`

JSON-RPC 2.0 wire types (re-exported from `@vinhnt-sdk/schema`).

```ts
interface JsonRpcRequest {
  readonly jsonrpc: "2.0";
  readonly id: number | string;
  readonly method: string;
  readonly params?: unknown;
}

interface JsonRpcResponse {
  readonly jsonrpc: "2.0";
  readonly id: number | string;
  readonly result?: unknown;
  readonly error?: { code: number; message: string; data?: unknown };
}

interface JsonRpcNotification {
  readonly jsonrpc: "2.0";
  readonly method: string;
  readonly params?: unknown;
}
```

---

## A2A v1.0 (Agent Card discovery)

Agent-to-agent interop per A2A v1.0 (Linux Foundation): Agent Card canonical
data model, `/.well-known/agent-card.json` discovery with ETag/304 caching, and
the strict 7-state task lifecycle. Streaming (`SendStreamingMessage`), push
notifications, and WebSocket/gRPC bindings are **not yet implemented** (deferred).

### `discoverAgentCard`

```ts
import {
  discoverAgentCard,
  A2A_AGENT_CARD_WELL_KNOWN_PATH,
} from "@vinhnt-sdk/mcp";
import type { AgentCardDocument, DiscoverAgentCardOptions } from "@vinhnt-sdk/mcp";

const options: DiscoverAgentCardOptions = {
  etag: cachedEtag,      // conditional If-None-Match (optional)
  signal: abort.signal,  // optional
  fetchImpl,             // fetch seam (optional)
};
const doc: AgentCardDocument = await discoverAgentCard(
  "https://agent.example.com/", // → /.well-known/agent-card.json
  options,
);
if (doc.notModified) {
  // 304 — reuse the cached card
} else {
  console.log(doc.card?.name, doc.card?.skills);
}
```

- Bare origin → GET `/.well-known/agent-card.json` (`A2A_AGENT_CARD_WELL_KNOWN_PATH`); a full URL is requested as-is (curated registries).
- Returns `AgentCardDocument { card?, url, etag?, notModified? }`.
- `@throws {ValidationError}` — invalid target URL, or card payload missing `name` / `description` / `version` / `supportedInterfaces` / `skills` / `defaultInputModes` / `defaultOutputModes` / `capabilities`.
- `@throws {NetworkError}` — transport failure, HTTP status ≠ 2xx (and ≠ 304), or invalid JSON.

### Task states

```ts
import { KNOWN_TASK_STATES, isKnownTaskState, isTerminalTaskState } from "@vinhnt-sdk/mcp";
import type { TaskState } from "@vinhnt-sdk/mcp";

KNOWN_TASK_STATES.length;                    // 7 — lifecycle order
isKnownTaskState("TASK_STATE_WORKING");     // true (narrows string → TaskState)
isTerminalTaskState("TASK_STATE_COMPLETED"); // true
```

`TaskState` (strict closed union): `TASK_STATE_SUBMITTED` | `TASK_STATE_WORKING` | `TASK_STATE_INPUT_REQUIRED` | `TASK_STATE_COMPLETED` | `TASK_STATE_FAILED` | `TASK_STATE_CANCELED` | `TASK_STATE_REJECTED`.
Terminal: `COMPLETED`, `FAILED`, `CANCELED`, `REJECTED`.

### A2A types

```ts
import type {
  AgentCard,
  AgentInterface,
  AgentCapabilities,
  AgentSkill,
  AgentSecurityScheme,
  A2AProtocolBinding,
} from "@vinhnt-sdk/mcp";

interface AgentCard {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly supportedInterfaces: readonly AgentInterface[];
  readonly capabilities: AgentCapabilities;
  readonly skills: readonly AgentSkill[];
  readonly defaultInputModes: readonly string[];
  readonly defaultOutputModes: readonly string[];
  readonly securitySchemes?: Record<string, AgentSecurityScheme>;
}

interface AgentInterface {
  readonly url: string;
  readonly protocolBinding: A2AProtocolBinding; // "JSONRPC" | "GRPC" | "HTTP+JSON"
  readonly protocolVersion: string;
}
```

- `AgentCapabilities` — `streaming?`, `pushNotifications?`, `stateTransitionHistory?`, `agentCardUrl?`
- `AgentSkill` — `id`, `name`, `description`, `tags?`, `examples?`
- `AgentSecurityScheme` — `{ type: string; [key: string]: unknown }` (OpenAPI-style; vendor schemes pass through)

---

## Configuration File

### `mcp-servers.json`

Define MCP server connections in a JSON configuration file (one `McpServerConfig` per entry):

```json
{
  "servers": [
    {
      "name": "filesystem",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/files"]
    },
    {
      "name": "github",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    }
  ]
}
```

Load from configuration:

```ts
import { McpToolProvider } from "@vinhnt-sdk/mcp";
import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile("mcp-servers.json", "utf8"));
for (const server of config.servers) {
  const provider = new McpToolProvider(server);
  await provider.connect();
  registry.registerProvider(provider);
}
```

## Dependencies

- `@vinhnt-sdk/schema` — JSON-RPC wire types (`JsonRpcRequest`, `JsonRpcResponse`, `JsonRpcNotification`).
- `@vinhnt-sdk/tools` — `ToolDefinition` / `ToolProvider` interfaces used by `mapMcpTool` and `McpToolProvider`.
