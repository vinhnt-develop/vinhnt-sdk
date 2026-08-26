---
title: "@vinhnt-sdk/lsp"
description: "Tích hợp LSP và chẩn đoán"
lang: "vi"
type: "reference"
category: "API Reference"
version: "0.1.3"
sidebarLabel: "lsp"
---

# @vinhnt-sdk/lsp

Tích hợp Language Server Protocol cho thông minh mã — chẩn đoán, gợi ý hoàn thiện và thông tin ký hiệu.

## Xuất

### `LspPool`

Quản lý nhiều kết nối LSP server hiệu quả.

```ts
import { LspPool } from "@vinhnt-sdk/lsp";

const pool = new LspPool({
  maxConnections: 5,
  idleTimeout: 30000,
});

const client = await pool.acquire("typescript");
// ... sử dụng client
pool.release(client);

await pool.shutdown();
```

**Phương thức:**

| Phương thức | Mô tả |
| --- | --- |
| `acquire(language)` | Lấy client cho một ngôn ngữ |
| `release(client)` | Trả client về pool |
| `getActiveCount()` | Lấy số kết nối đang hoạt động |
| `shutdown()` | Đóng tất cả kết nối |

---

### `LspClient`

Kết nối LSP server cá nhân.

```ts
import { LspClient } from "@vinhnt-sdk/lsp";

const client = new LspClient({
  serverId: "typescript",
  rootUri: "file:///workspace",
});

await client.initialize();
const diagnostics = await client.getDiagnostics("file:///src/index.ts");
await client.shutdown();
```

**Phương thức:**

| Phương thức | Mô tả |
| --- | --- |
| `initialize()` | Khởi động và khởi tạo LSP server |
| `getDiagnostics(uri)` | Lấy chẩn đoán cho một file |
| `getCompletions(uri, position)` | Lấy gợi ý hoàn thiện tại vị trí |
| `getSymbols(uri)` | Lấy ký hiệu tài liệu |
| `didOpen(uri, text)` | Thông báo server về file đã mở |
| `didChange(uri, text)` | Thông báo server về thay đổi file |
| `shutdown()` | Tắt server |

---

### `DiagnosticStore`

Lưu trữ và truy vấn chẩn đoán qua các file.

```ts
import { DiagnosticStore } from "@vinhnt-sdk/lsp";

const store = new DiagnosticStore();

store.set("file:///src/a.ts", [...diagnostics]);
store.set("file:///src/b.ts", [...diagnostics]);

const errors = store.getBySeverity("error");
const fileDiags = store.get("file:///src/a.ts");
const summary = store.getSummary(); // { files: 2, errors: 3, warnings: 5 }
```

**Phương thức:**

| Phương thức | Mô tả |
| --- | --- |
| `set(uri, diagnostics)` | Đặt chẩn đoán cho file |
| `get(uri)` | Lấy chẩn đoán cho file |
| `getBySeverity(severity)` | Lấy tất cả chẩn đoán theo mức độ |
| `getSummary()` | Lấy tóm tắt số lượng chẩn đoán |
| `clear()` | Xóa tất cả chẩn đoán đã lưu |

---

### `LspServerRegistry`

Registry của các định nghĩa LSP server.

```ts
import { LspServerRegistry } from "@vinhnt-sdk/lsp";

const registry = new LspServerRegistry();
registry.register({
  id: "custom-lang",
  name: "Custom Language",
  command: "custom-lsp",
  args: ["--stdio"],
  languages: ["custom"],
});

const def = registry.get("custom-lang");
const all = registry.getAll();
```

---

### `createLspTools(pool)`

Tạo định nghĩa công cụ LSP cho agent.

```ts
import { createLspTools, LspPool } from "@vinhnt-sdk/lsp";

const pool = new LspPool();
const tools = createLspTools(pool);

agent.registerTools(tools);
```

---

### `DEFAULT_LSP_SERVERS`

Định nghĩa server tích hợp sẵn cho các ngôn ngữ phổ biến.

```ts
import { DEFAULT_LSP_SERVERS } from "@vinhnt-sdk/lsp";

// Các server có sẵn:
// typescript, python, go, rust, java, csharp, ruby, php, swift, kotlin
const tsServer = DEFAULT_LSP_SERVERS.typescript;
```

---

## Hàm deprecated

Các hàm sau sử dụng singleton đã cached và đã deprecated:

| Hàm | Thay thế |
| --- | --- |
| `findServerByExtension(ext)` | Dùng `LspServerRegistry.get()` |
| `findServerById(id)` | Dùng `LspServerRegistry.get()` |
| `getLanguageId(filename)` | Dùng trực tiếp `LspServerRegistry` |

## Kiểu dữ liệu

### `LspServerDefinition`

```ts
interface LspServerDefinition {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  languages: string[];
  extensions: string[];
  initializationOptions?: Record<string, unknown>;
}
```

### `LspServerConfig`

```ts
interface LspServerConfig {
  rootUri: string;
  capabilities?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  trace?: "off" | "messages" | "verbose";
}
```

### `LspDiagnostics`

```ts
interface LspDiagnostics {
  uri: string;
  version: number;
  diagnostics: Array<{
    range: { start: { line: number; character: number }; end: { line: number; character: number } };
    severity: 1 | 2 | 3 | 4;
    source: string;
    message: string;
    code?: string | number;
  }>;
}
```

## Phụ thuộc

- `@vinhnt-sdk/schema` — xác thực định nghĩa server và cấu hình
- `@vinhnt-sdk/tools` — tạo định nghĩa công cụ cho tích hợp agent
- `@vinhnt-sdk/core` — hệ thống sự kiện và quản lý vòng đời
