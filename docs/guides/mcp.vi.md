---
title: Tích hợp MCP
description: Kết nối với các MCP server
lang: vi
type: "guide"
category: "Guides"
sidebarPosition: 9
---

# Tích hợp MCP

MCP (Model Context Protocol) cho phép agent của bạn kết nối với các công cụ bên ngoài và mở rộng khả năng beyond các công cụ tích hợp sẵn.

## MCP là gì?

MCP là giao thức chuẩn để giao tiếp giữa các AI agent và server công cụ. Nó hỗ trợ:

- Khám phá công cụ động từ các server bên ngoài
- Truy cập tài nguyên (tệp, cơ sở dữ liệu, API)
- Mẫu prompt từ các nhà cung cấp từ xa
- Tương tác công cụ đa nền tảng

Giao thức hỗ trợ nhiều lớp transport bao gồm stdio, HTTP và Server-Sent Events (SSE).

## Cấu hình

Tạo tệp `mcp-servers.json` trong thư mục gốc dự án:

```json
{
  "servers": {
    "filesystem": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"],
      "env": {}
    },
    "github": {
      "transport": "http",
      "url": "https://mcp-github.example.com/sse",
      "headers": {
        "Authorization": "Bearer ${GITHUB_TOKEN}"
      }
    },
    "database": {
      "transport": "stdio",
      "command": "node",
      "args": ["./mcp-servers/db-server.js"],
      "cwd": "./servers"
    }
  }
}
```

## Sử dụng McpClientPool

`McpClientPool` quản lý nhiều kết nối MCP server:

```typescript
import { McpClientPool } from 'vinhnt-sdk/mcp';

const pool = new McpClientPool();

// Tải từ tệp cấu hình
await pool.loadFromConfig('mcp-servers.json');

// Hoặc thêm server theo cách lập trình
await pool.addServer('my-server', {
  transport: 'stdio',
  command: 'npx',
  args: ['-y', 'my-mcp-server']
});

// Liệt kê các server đã kết nối
const servers = pool.getServers();
console.log('Đã kết nối:', servers.map(s => s.name));

// Lấy tất cả công cụ từ tất cả server
const tools = await pool.getAllTools();

// Ngắt kết nối tất cả
await pool.disconnectAll();
```

## McpClient cá nhân

Để kết nối trực tiếp với một MCP server:

```typescript
import { McpClient } from 'vinhnt-sdk/mcp';

// Transport stdio
const client = new McpClient({
  name: 'filesystem',
  transport: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
});

await client.connect();

// Liệt kê công cụ
const tools = await client.listTools();
console.log(tools);

// Gọi công cụ
const result = await client.callTool('read_file', {
  path: './README.md'
});

// Liệt kê tài nguyên
const resources = await client.listResources();

// Đọc tài nguyên
const content = await client.readResource('file:///README.md');

await client.disconnect();
```

## Hợp nhất công cụ vào Kernel

Tích hợp trực tiếp công cụ MCP vào kernel agent:

```typescript
import { AgentKernel } from 'vinhnt-sdk';
import { McpClientPool } from 'vinhnt-sdk/mcp';

const kernel = new AgentKernel({
  model: 'gpt-4',
  systemPrompt: 'Bạn là trợ lý hữu ích với quyền truy cập các công cụ bên ngoài.'
});

const pool = new McpClientPool();
await pool.loadFromConfig('mcp-servers.json');

// Hợp nhất công cụ MCP vào kernel
const mcpTools = await pool.getAllTools();
for (const tool of mcpTools) {
  kernel.registerTool({
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
    execute: async (params) => {
      return await pool.callTool(tool.name, params);
    }
  });
}

// Bây giờ agent có thể sử dụng công cụ MCP
const response = await kernel.invoke('Liệt kê các tệp trong thư mục hiện tại');
```

## Transport SSE (Stub)

Transport Server-Sent Events để streaming phản hồi:

```typescript
import { McpClient } from 'vinhnt-sdk/mcp';

const client = new McpClient({
  name: 'streaming-server',
  transport: 'sse',
  url: 'https://mcp-server.example.com/sse',
  headers: {
    'Authorization': 'Bearer token123'
  }
});

// SSE cung cấp streaming thời gian thực kết quả công cụ
await client.connect();
const stream = await client.streamTool('process_data', { input: 'dữ liệu' });

for await (const chunk of stream) {
  console.log('Nhận được:', chunk);
}
```

## Transport HTTP có thể Stream (Stub)

Transport dựa trên HTTP với hỗ trợ streaming:

```typescript
const client = new McpClient({
  name: 'http-server',
  transport: 'streamable-http',
  url: 'https://mcp-server.example.com/mcp',
  timeout: 30000
});

await client.connect();

// Hỗ trợ cả request-response và streaming
const result = await client.callTool('query_database', {
  sql: 'SELECT * FROM users LIMIT 10'
});
```

## ACP - Giao thức Liên lạc Agent

ACP cho phép tích hợp editor và liên lạc giữa các agent:

```typescript
import { AcpBridge } from 'vinhnt-sdk/acp';

// Kết nối với VS Code hoặc editor tương tự
const bridge = new AcpBridge({
  editor: 'vscode',
  port: 3001
});

// Đăng ký khả năng của agent
bridge.registerCapability('code_review', async (file) => {
  const review = await kernel.invoke(`Đánh giá đoạn code này: ${file}`);
  return review;
});

// Xử lý sự kiện từ editor
bridge.onFileSaved(async (filePath) => {
  console.log(`Tệp đã lưu: ${filePath}`);
  await kernel.invoke(`Phân tích thay đổi trong ${filePath}`);
});

await bridge.start();
```

## Biến môi trường

Sử dụng biến môi trường trong cấu hình:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
export DATABASE_URL=postgresql://localhost/mydb
export API_KEY=sk-xxxxxxxxxxxx
```

Tham chiếu chúng trong `mcp-servers.json` bằng cú pháp `${VAR_NAME}`.

## Xử lý lỗi

```typescript
import { McpClient, McpError } from 'vinhnt-sdk/mcp';

try {
  const client = new McpClient(config);
  await client.connect();
} catch (error) {
  if (error instanceof McpError) {
    console.error('Lỗi MCP:', error.code, error.message);
  }
}
```

## Best Practices

- Sử dụng biến môi trường cho bí mật
- Triển khai logic thử lại kết nối
- Giám sát sức khỏe server với ping định kỳ
- Xử lý ngắt kết nối server một cách graceful
- Sử dụng pooling cho nhiều kết nối server