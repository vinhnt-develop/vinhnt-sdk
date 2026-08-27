---
title: "@vinhnt-sdk/tools"
description: "Framework công cụ + công cụ tích hợp sẵn"
lang: vi
type: "reference"
category: "API Reference"
sidebarLabel: tools
version: "0.1.3"
---

# @vinhnt-sdk/tools

Framework công cụ và các công cụ tích hợp sẵn cho tương tác agent có cấu trúc.

## Xuất (Exports)

### `defineTool(config)`

Tạo công cụ theo schema với tham số được typing và logic thực thi.

```ts
import { defineTool } from "@vinhnt-sdk/tools";

const myTool = defineTool({
  name: "my_tool",
  description: "Thực hiện tác vụ hữu ích",
  risk: "read",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Truy vấn tìm kiếm" },
    },
    required: ["query"],
  },
  execute: async (params, context) => {
    return { result: `Đã xử lý: ${params.query}` };
  },
});
```

**Tham số:**

- `config.name` — Mã định danh duy nhất của công cụ
- `config.description` — Mô tả cho người đọc (dùng để LLM chọn công cụ)
- `config.risk` — Mức độ rủi ro: `"read"` | `"write"` | `"destructive"` | `"external"`
- `config.parameters` — JSON Schema cho tham số công cụ
- `config.execute` — Hàm async nhận `(params, context)` và trả về kết quả

### `ToolRegistry`

Registry quản lý các công cụ theo ID.

```ts
const registry = new ToolRegistry();
registry.register(myTool);
const tool = registry.get("my_tool");
const all = registry.getAll();
```

**Phương thức:**

- `register(tool)` — Đăng ký công cụ (ghi đè nếu đã tồn tại)
- `get(id)` — Lấy công cụ theo ID, lỗi nếu không tìm thấy
- `getAll()` — Trả về tất cả công cụ đã đăng ký
- `has(id)` — Kiểm tra công cụ có tồn tại
- `remove(id)` — Xóa công cụ theo ID

### `LazyToolRegistry`

Registry công cụlazy, xây dựng công cụ chỉ khi truy cập lần đầu.

```ts
const lazy = new LazyToolRegistry();
lazy.register("my_tool", () => buildExpensiveTool());
const tool = lazy.get("my_tool"); // Xây dựng khi gọi lần đầu
```

### `ToolSaga`

Thực thi đa bước với hỗ trợ hoàn tác (rollback).

```ts
const saga = new ToolSaga();
saga.addStep("step1", async (ctx) => { /* ... */ });
saga.addStep("step2", async (ctx) => { /* ... */ });
saga.addRollback("step2", async (ctx) => { /* hoàn tác step2 */ });
const result = await saga.execute(initialContext);
```

### `ToolProviderRegistry`

Quản lý nhiều nhà cung cấp công cụ và hợp nhất bộ công cụ.

```ts
const providers = new ToolProviderRegistry();
providers.register("agent", new AgentToolProvider());
providers.register("skill", new SkillToolProvider());
const allTools = providers.getAllTools();
```

### Các lớp Provider

#### `AgentToolProvider`

Cung cấp công cụ từ cấu hình agent.

#### `SkillToolProvider`

Cung cấp công cụ được đăng ký bởi các skill.

#### `ToolFileProvider`

Tải công cụ từ file định nghĩa trên ổ đĩa.

#### `ToolFileLoader`

Trình tải dựa trên file để khám phá và tải định nghĩa công cụ.

### Hàm Kiểm tra (Linting)

#### `lintToolDescription(description)`

Kiểm tra mô tả công cụ về chất lượng và định dạng.

```ts
const issues = lintToolDescription("Công cụ thực hiện tác vụ");
// Trả về: [] nếu hợp lệ, hoặc mảng chuỗi lỗi
```

#### `lintToolDefinitions(definitions)`

Kiểm tra nhiều định nghĩa công cụ về tính nhất quán và chính xác.

```ts
const issues = lintToolDefinitions([toolDef1, toolDef2]);
```

### `createToolSearchTool()`

Tạo công cụ tìm kiếm các công cụ có sẵn theo chuỗi truy vấn.

```ts
const searchTool = createToolSearchTool();
// Trả về công cụ nhận { query: string } và trả về các công cụ khớp
```

## Kiểu dữ liệu

### `ToolDefinition`

```ts
interface ToolDefinition {
  name: string;
  description: string;
  risk: ToolRisk;
  parameters: NestedJsonSchema;
  execute: (params: any, context: ToolContext) => Promise<any>;
}
```

### `ToolContext`

```ts
interface ToolContext {
  workingDirectory: string;
  env: Record<string, string>;
  abortSignal?: AbortSignal;
}
```

### `ToolRisk`

```ts
type ToolRisk = "read" | "write" | "destructive" | "external";
```

### `ToolHook`

```ts
interface ToolHook {
  before?: (tool, params) => Promise<any>;
  after?: (tool, params, result) => Promise<any>;
  onError?: (tool, params, error) => Promise<void>;
}
```

### `NestedJsonSchema`

JSON Schema mở rộng hỗ trợ định nghĩa lồng nhau cho cấu trúc tham số phức tạp.

## Công cụ Tích hợp Sẵn

| Công cụ | Rủi ro | Mô tả |
|---------|--------|-------|
| `read_file` | `read` | Đọc nội dung file |
| `write_file` | `write` | Ghi nội dung vào file |
| `edit_file` | `write` | Thực hiện thay thế chuỗi trong file |
| `list_directory` | `read` | Liệt kê nội dung thư mục |
| `shell` | `destructive` | Thực thi lệnh shell |
| `git_*` | `write` | Thao tác git (status, diff, commit, v.v.) |
| `web_search` | `external` | Tìm kiếm trên web |
| `search_files` | `read` | Tìm file theo mẫu hoặc nội dung |

## Phụ thuộc

- `@vinhnt-sdk/schema` — Validation và kiểu JSON Schema
