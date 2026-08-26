---
title: "@vinhnt-sdk/mcp"
description: "Khách MCP, pooling kết nối và ánh xạ tool"
version: "0.1.3"
lang: "vi"
type: "reference"
category: "API Reference"
sidebarLabel: "mcp"
---

# @vinhnt-sdk/mcp

Các triển khai khách Model Context Protocol (MCP) để kết nối với máy chủ tool bên ngoài, quản lý kết nối và ánh xạ tool MCP sang giao diện tool của vinhnt-sdk.

## Cài đặt

```bash
npm install @vinhnt-sdk/mcp
```

## Các xuất (Exports)

### `McpClient`

Quản lý một kết nối duy nhất đến máy chủ MCP. Xử lý giao tiếp JSON-RPC, khám phá tool và vòng đời.

```ts
import { McpClient, StdioTransport } from "@vinhnt-sdk/mcp";

const client = new McpClient({
  name: "my-server",
  transport: new StdioTransport({ command: "node", args: ["server.js"] }),
});

await client.connect();
const tools = await client.listTools();
const result = await client.callTool("get_weather", { city: "Hà Nội" });
await client.disconnect();
```

**Constructor:** `McpClient(config: McpServerConfig)`

**Phương thức:**
- `connect(): Promise<void>` — Thiết lập kết nối đến máy chủ MCP.
- `disconnect(): Promise<void>` — Đóng kết nối một cách trôi chảy.
- `listTools(): Promise<McpTool[]>` — Khám phá các tool có sẵn trên máy chủ.
- `callTool(name: string, args: Record<string, unknown>): Promise<unknown>` — Gọi tool theo tên với đối số.
- `isConnected(): boolean` — Kiểm tra xem khách có đang kết nối không.
- `onNotification(handler: (notification: JsonRpcNotification) => void): void` — Xử lý thông báo do máy chủ khởi xướng.

---

### `McpClientPool`

Quản lý một nhóm các instance `McpClient`, cho phép cân bằng tải, tự động kết nối lại và truy cập đồng thời nhiều máy chủ MCP.

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

**Phương thức:**
- `addClient(id: string, config: McpServerConfig): void` — Đăng ký khách trong nhóm.
- `removeClient(id: string): Promise<void>` — Ngắt kết nối và xóa khách.
- `connectAll(): Promise<void>` — Kết nối tất cả khách đã đăng ký.
- `disconnectAll(): Promise<void>` — Ngắt kết nối tất cả khách.
- `getClient(id: string): McpClient | undefined` — Lấy khách theo ID.
- `listAllTools(): Promise<Record<string, McpTool[]>>` — Liệt kê tool từ tất cả máy chủ đã kết nối.
- `callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<unknown>` — Định tuyến lời gọi tool đến máy chủ cụ thể.

---

### `McpToolMapper`

Ánh xạ tool MCP được khám phá từ máy chủ sang định dạng `Tool` của vinhnt-sdk, cho phép tích hợp liền mạch với framework agent.

```ts
import { McpToolMapper } from "@vinhnt-sdk/mcp";

const mapper = new McpToolMapper();

const mcpTools = await client.listTools();
const sdkTools = mapper.mapTools(mcpTools);

// sdkTools có thể truyền trực tiếp cho Agent
agent.setTools(sdkTools);
```

**Constructor:** `McpToolMapper(options?: ToolMapperOptions)`

**Phương thức:**
- `mapTools(mcpTools: McpTool[]): Tool[]` — Chuyển đổi tool MCP sang tool vinhnt-sdk.
- `mapTool(mcpTool: McpTool): Tool` — Chuyển đổi một tool MCP.
- `addConverter(name: string, converter: ToolConverter): void` — Đăng ký bộ chuyển đổi tùy chỉnh cho các mẫu tool cụ thể.

---

## Triển khai Transport

### `StdioTransport`

Giao tiếp với máy chủ MCP qua pipe stdin/stdout. Lý tưởng cho máy chủ dựa trên quy trình cục bộ.

```ts
import { StdioTransport } from "@vinhnt-sdk/mcp";

const transport = new StdioTransport({
  command: "node",
  args: ["./my-mcp-server.js"],
  env: { ...process.env, API_KEY: "..." },
  cwd: "/path/to/server",
});
```

**Tùy chọn:**
- `command: string` — Chương trình thực thi cần chạy.
- `args?: string[]` — Đối số lệnh.
- `env?: Record<string, string>` — Biến môi trường.
- `cwd?: string` — Thư mục làm việc.

---

### `SseTransport`

Transport cho máy chủ MCP dựa trên Server-Sent Events (SSE). Hiện là triển khai chờ.

```ts
import { SseTransport } from "@vinhnt-sdk/mcp";

const transport = new SseTransport({
  url: "http://localhost:3000/mcp/sse",
  headers: { Authorization: "Bearer token" },
});
```

---

### `StreamableHttpTransport`

Transport cho máy chủ MCP dựa trên HTTP có thể phát trực tuyến. Hiện là triển khai chờ.

```ts
import { StreamableHttpTransport } from "@vinhnt-sdk/mcp";

const transport = new StreamableHttpTransport({
  url: "http://localhost:3000/mcp",
  headers: { "Content-Type": "application/json" },
});
```

---

## Các kiểu dữ liệu

### `McpTransport`

Giao diện cho tất cả triển khai transport.

```ts
interface McpTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(request: JsonRpcRequest): Promise<JsonRpcResponse>;
  onNotification(handler: (notification: JsonRpcNotification) => void): void;
}
```

### `McpServerConfig`

Cấu hình để tạo `McpClient`.

```ts
interface McpServerConfig {
  name: string;
  transport: McpTransport;
  timeout?: number;          // Thời gian chờ yêu cầu tính bằng ms (mặc định: 30000)
  capabilities?: string[];   // Các khả năng máy chủ được yêu cầu
}
```

### `McpTool`

Đại diện cho một tool được khám phá từ máy chủ MCP.

```ts
interface McpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;  // JSON Schema cho đầu vào tool
}
```

### `JsonRpcRequest`

Đối tượng yêu cầu JSON-RPC 2.0.

```ts
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}
```

### `JsonRpcResponse`

Đối tượng phản hồi JSON-RPC 2.0.

```ts
interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}
```

### `JsonRpcNotification`

Thông báo JSON-RPC 2.0 (yêu cầu không có `id`).

```ts
interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}
```

---

## Tệp cấu hình

### `mcp-servers.json`

Định nghĩa kết nối máy chủ MCP trong tệp cấu hình JSON:

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

Tải từ cấu hình:

```ts
import { McpClientPool, loadMcpConfig } from "@vinhnt-sdk/mcp";

const config = await loadMcpConfig("mcp-servers.json");
const pool = new McpClientPool();
for (const server of config.servers) {
  pool.addClient(server.id, server);
}
await pool.connectAll();
```

## Phụ thuộc

- `@vinhnt-sdk/schema` — Cung cấp định nghĩa kiểu `Tool` và xác thực JSON Schema.
- `@vinhnt-sdk/tools` — Giao diện thực thi tool được sử dụng bởi `McpToolMapper`.
