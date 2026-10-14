---
title: "@vinhnt-sdk/mcp"
description: "Khách MCP cho Model Context Protocol 2026-07-28"
version: "0.4.6"
lang: "vi"
type: "reference"
category: "API Reference"
sidebarLabel: "mcp"
---

# @vinhnt-sdk/mcp

Khách Model Context Protocol (MCP) cho vinhnt-sdk — tuân thủ MCP 2026-07-28.

Thay đổi chính so với MCP 2025-03-26:
- **Stateless mặc định** — không theo dõi phiên
- **MRTR** (Model-Relative Tool Registration) thay thế yêu cầu do server khởi xướng
- **Resources và Prompts** giờ là tool (giao diện hợp nhất)
- **Sampling và Roots** đã deprecated (dùng tool call thay thế)

## Cài đặt

```bash
npm install @vinhnt-sdk/mcp
```

## Các xuất (Exports)

### `McpClient`

Kết nối tới các máy chủ MCP và cung cấp truy cập tool/resource. Stateless mặc định (MCP 2026-07-28).

```ts
import { McpClient } from "@vinhnt-sdk/mcp";

const client = new McpClient();
const conn = await client.connect({
  name: "my-server",
  transport: "stdio",
  command: "node",
  args: ["server.js"],
  protocolVersion: "2026-07-28", // mặc định
});

const tools = await conn.listTools();
const result = await conn.callTool("get_weather", { city: "Hà Nội" });

// Deprecated trong 2026-07-28 — ưu tiên tools
const resources = await conn.listResources();
const prompts = await conn.listPrompts();

await conn.close();
```

**Phương thức:**
- `connect(config: McpServerConfig): Promise<McpConnection>` — Kết nối tới máy chủ MCP, trả về handle kết nối.
- `getConnection(name: string): McpConnection | undefined` — Lấy kết nối hiện có theo tên server.
- `closeAll(): Promise<void>` — Đóng mọi kết nối đang mở.

### `McpConnection`

Handle kết quả từ `client.connect(...)`.

**Thuộc tính:** `serverInfo`, `capabilities`, `protocolVersion`.

**Phương thức:**
- `listTools(): Promise<McpTool[]>` — Khám phá các tool có sẵn trên máy chủ.
- `callTool(name: string, args?: Record<string, unknown>): Promise<CallToolResult>` — Gọi tool theo tên với đối số.
- `listResources(): Promise<McpResource[]>` — Liệt kê resource (deprecated, ưu tiên tool).
- `readResource(uri: string): Promise<string>` — Đọc resource (deprecated).
- `listPrompts()` / `getPrompt(name, args?)` — Truy cập prompt (deprecated).
- `close(): Promise<void>` — Ngắt kết nối khỏi máy chủ.

---

### `McpToolProvider`

Gói `McpClient` + khám phá tool thành một `ToolProvider` để tool MCP đăng ký vào `ToolProviderRegistry`.

```ts
import { McpToolProvider } from "@vinhnt-sdk/mcp";

const provider = new McpToolProvider({
  name: "github",
  transport: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  env: { GITHUB_TOKEN: "xxx" },
});
await provider.connect(); // khởi chạy server và khám phá tool
registry.registerProvider(provider);

// Sau này: khám phá lại khi nhận thông báo listChanged
await provider.refresh();

// Dọn dẹp
await provider.close();
```

**Constructor:** `McpToolProvider(config: McpToolProviderConfig)` — `McpServerConfig` + `id` tùy chọn (mặc định `"mcp:<name>"`).

**Phương thức:**
- `connect(): Promise<void>` — Kết nối máy chủ và khám phá tool (gọi trước khi đăng ký).
- `getConnection(): McpConnection | null` — Kết nối gốc để truy cập trực tiếp.
- `toolCount(): number` — Số tool đã khám phá.
- `get tools(): ToolDefinition[]` — Tool đã khám phá dạng định nghĩa vinhnt-sdk.
- `refresh(): Promise<void>` — Khám phá lại tool.
- `close(): Promise<void>` — Ngắt kết nối và xóa tool.

---

### `mapMcpTool` / `discoverMcpTools`

Ánh xạ tool MCP sang `ToolDefinition` của vinhnt-sdk, tích hợp liền mạch với framework agent.

```ts
import { discoverMcpTools, mapMcpTool, mcpDomain, mcpToolId } from "@vinhnt-sdk/mcp";

// Ánh xạ mọi tool trên một kết nối
const sdkTools = await discoverMcpTools("my-server", conn);
// → ToolDefinition[] — truyền trực tiếp vào `tools` của kernel config

// Hoặc ánh xạ từng tool
const tool = mapMcpTool("my-server", mcpTool, conn);

// Quy ước đặt tên
mcpDomain("my-server");              // "mcp:my-server"
mcpToolId("my-server", "get_weather"); // "mcp__my-server__get_weather"
```

Tool được ánh xạ có `risk: "external"`, `metadata.source: "mcp"` và id có namespace `mcp__<server>__<tool>`.

---

## Transport

Transport được chọn qua `McpServerConfig.transport` — các triển khai (`stdio`, `sse`, `streamable-http`) do `McpClient.connect()` tạo nội bộ.

```ts
// Quy trình cục bộ qua stdin/stdout
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

## Các kiểu dữ liệu

### `McpTransport`

Giao diện do các transport nội bộ triển khai.

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

Cấu hình chấp nhận bởi `McpClient.connect()` (và `McpToolProvider`).

```ts
interface McpServerConfig {
  readonly name: string;
  readonly transport: "stdio" | "sse" | "streamable-http";
  readonly protocolVersion?: string;   // mặc định: "2026-07-28"
  readonly command?: string;           // stdio
  readonly args?: string[];            // stdio
  readonly env?: Record<string, string>;
  readonly url?: string;               // sse / streamable-http
  readonly headers?: Record<string, string>;
  readonly timeoutMs?: number;         // mặc định: 30000
  readonly metadata?: Record<string, unknown>;
}
```

### `McpTool`

Đại diện cho một tool được khám phá từ máy chủ MCP.

```ts
interface McpTool {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: Record<string, unknown>; // JSON Schema cho đầu vào tool
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

Kiểu wire JSON-RPC 2.0 (re-export từ `@vinhnt-sdk/schema`).

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

## A2A v1.0 (Khám phá Agent Card)

Tương tác agent-to-agent theo A2A v1.0 (Linux Foundation): dữ liệu Agent Card
chuẩn, khám phá `/.well-known/agent-card.json` có cache ETag/304, và vòng đời
task 7 trạng thái nghiêm ngặt. Streaming (`SendStreamingMessage`), push
notification, binding WebSocket/gRPC **chưa triển khai** (hoãn lại).

### `discoverAgentCard`

```ts
import {
  discoverAgentCard,
  A2A_AGENT_CARD_WELL_KNOWN_PATH,
} from "@vinhnt-sdk/mcp";
import type { AgentCardDocument, DiscoverAgentCardOptions } from "@vinhnt-sdk/mcp";

const options: DiscoverAgentCardOptions = {
  etag: cachedEtag,      // If-None-Match có điều kiện (tuỳ chọn)
  signal: abort.signal,  // tuỳ chọn
  fetchImpl,             // seam fetch (tuỳ chọn)
};
const doc: AgentCardDocument = await discoverAgentCard(
  "https://agent.example.com/", // → /.well-known/agent-card.json
  options,
);
if (doc.notModified) {
  // 304 — dùng lại card đã cache
} else {
  console.log(doc.card?.name, doc.card?.skills);
}
```

- Origin trần → GET `/.well-known/agent-card.json` (`A2A_AGENT_CARD_WELL_KNOWN_PATH`); URL đầy đủ được request nguyên trạng (registry curated).
- Trả về `AgentCardDocument { card?, url, etag?, notModified? }`.
- `@throws {ValidationError}` — URL target không hợp lệ, hoặc payload thiếu `name` / `description` / `version` / `supportedInterfaces` / `skills` / `defaultInputModes` / `defaultOutputModes` / `capabilities`.
- `@throws {NetworkError}` — lỗi vận chuyển, HTTP ≠ 2xx (và ≠ 304), hoặc JSON không hợp lệ.

### Trạng thái task

```ts
import { KNOWN_TASK_STATES, isKnownTaskState, isTerminalTaskState } from "@vinhnt-sdk/mcp";
import type { TaskState } from "@vinhnt-sdk/mcp";

KNOWN_TASK_STATES.length;                    // 7 — theo thứ tự vòng đời
isKnownTaskState("TASK_STATE_WORKING");     // true (narrows string → TaskState)
isTerminalTaskState("TASK_STATE_COMPLETED"); // true
```

`TaskState` (union đóng nghiêm ngặt): `TASK_STATE_SUBMITTED` | `TASK_STATE_WORKING` | `TASK_STATE_INPUT_REQUIRED` | `TASK_STATE_COMPLETED` | `TASK_STATE_FAILED` | `TASK_STATE_CANCELED` | `TASK_STATE_REJECTED`.
Trạng thái kết thúc: `COMPLETED`, `FAILED`, `CANCELED`, `REJECTED`.

### Kiểu A2A

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
- `AgentSecurityScheme` — `{ type: string; [key: string]: unknown }` (kiểu OpenAPI; scheme riêng của vendor truyền qua)

---

## Tệp cấu hình

### `mcp-servers.json`

Định nghĩa kết nối máy chủ MCP trong tệp cấu hình JSON (mỗi mục là một `McpServerConfig`):

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

Tải từ cấu hình:

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

## Phụ thuộc

- `@vinhnt-sdk/schema` — kiểu wire JSON-RPC (`JsonRpcRequest`, `JsonRpcResponse`, `JsonRpcNotification`).
- `@vinhnt-sdk/tools` — giao diện `ToolDefinition` / `ToolProvider` dùng bởi `mapMcpTool` và `McpToolProvider`.
