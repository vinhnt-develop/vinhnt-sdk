---
title: "@vinhnt-sdk/core"
description: "AgentKernel, quản lý plugin, điều phối"
version: "0.1.3"
lang: "vi"
type: "reference"
category: "API Reference"
sidebarLabel: "core"
---

# @vinhnt-sdk/core

Module điều phối cốt lõi của vinhnt-sdk. Cung cấp điểm vào `AgentKernel`, quản lý plugin, bus sự kiện, registry model và tất cả công cụ tích hợp sẵn cho quy trình agent.

## Nhập

```ts
import {
  AgentKernel,
  defineTool,
  ToolRegistry,
  DefaultPluginManager,
  InMemoryEventBus,
  InMemoryModelRegistry,
  SystemContextRegistry,
} from "@vinhnt-sdk/core";
```

---

## AgentKernel

Điểm vào chính để cấu hình và chạy agent.

### Hàm tạo

```ts
new AgentKernel(config: AgentKernelConfig)
```

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `config` | `AgentKernelConfig` | Cấu hình kernel bao gồm plugin, model, công cụ và quyền hạn |

### Phương thức

#### `run(input)`

Thực thi toàn bộ quá trình chạy agent và trả về kết quả cuối cùng.

```ts
const result = await kernel.run({
  messages: [{ role: "user", content: "Tóm tắt tệp này" }],
});
```

#### `createRunHandle(input)`

Tạo handle để điều khiển quá trình chạy (tạm dừng, tiếp tục, hủy).

```ts
const handle = kernel.createRunHandle({ messages });
await handle.start();
```

#### `cancel()`

Hủy tác vụ agent đang chạy.

```ts
kernel.cancel();
```

### Phát trực tuyến sự kiện

```ts
const handle = kernel.createRunHandle(input);
for await (const event of handle.events()) {
  console.log(event.type, event.data);
}
```

Phương thức `events()` trả về `AsyncIterable<AgentEvent>` phát các cập nhật thời gian thực bao gồm gọi công cụ, phản hồi model và thay đổi trạng thái.

---

## defineTool

Re-export từ `@vinhnt-sdk/tools`. Định nghĩa công cụ mà agent có thể gọi.

```ts
const myTool = defineTool({
  name: "my_tool",
  description: "Thực hiện việc hữu ích",
  parameters: z.object({ input: z.string() }),
  execute: async (params) => {
    return { result: `Đã xử lý: ${params.input}` };
  },
});
```

---

## ToolRegistry

Re-export từ `@vinhnt-sdk/tools`. Quản lý đăng tra và tìm kiếm công cụ.

```ts
const registry = new ToolRegistry();
registry.register(myTool);
const tool = registry.get("my_tool");
```

---

## DefaultPluginManager`

Quản lý toàn bộ vòng đời plugin: tải, khởi tạo, chạy và dừng plugin.

```ts
const manager = new DefaultPluginManager();
await manager.loadAll(config.plugins);
await manager.startAll();
await manager.stopAll();
```

### Vòng đời Plugin

1. **Tải** — Xác thực manifest plugin
2. **Khởi tạo** — Gọi hook `onInit`
3. **Chạy** — Gọi hook `onStart`, đăng ký công cụ
4. **Dừng** — Gọi hook `onStop`, giải phóng tài nguyên

---

## InMemoryEventBus

Bus sự kiện pub/sub trong bộ nhớ nhẹ cho giao tiếp nội bộ agent.

```ts
const bus = new InMemoryEventBus();
bus.on("tool:executed", (event) => console.log(event));
bus.emit("tool:executed", { tool: "search", result: "..." });
```

---

## InMemoryModelRegistry

Registry trong bộ nhớ cho cấu hình model và ràng buộc nhà cung cấp.

```ts
const registry = new InMemoryModelRegistry();
registry.register("gpt-4", { provider: "openai", maxTokens: 8192 });
const model = registry.get("gpt-4");
```

---

## SystemContextRegistry

Quản lý nguồn prompt và tiêm ngữ cảnh hệ thống cho phiên agent.

```ts
const ctx = new SystemContextRegistry();
ctx.addSource("project-info", () => getProjectMetadata());
```

---

## Công cụ tích hợp sẵn (17)

Các công cụ sau được đăng ký mặc định khi sử dụng `AgentKernel`:

| Công cụ | Danh mục | Mô tả |
|---------|----------|-------|
| `file_read` | File | Đọc nội dung tệp |
| `file_write` | File | Ghi hoặc tạo tệp |
| `file_edit` | File | Chỉnh sửa tệp hiện có |
| `file_delete` | File | Xóa tệp |
| `file_list` | File | Liệt kê nội dung thư mục |
| `shell_execute` | Shell | Chạy lệnh shell |
| `git_status` | Git | Lấy trạng thái kho lưu trữ |
| `git_diff` | Git | Hiển thị sự khác biệt |
| `git_log` | Git | Xem lịch sử commit |
| `search_files` | Search | Tìm tệp theo mẫu |
| `search_content` | Search | Tìm kiếm nội dung tệp |
| `web_fetch` | Web | Lấy nội dung URL |
| `web_search` | Web | Tìm kiếm trên web |
| `image_generate` | Image | Tạo hình ảnh |
| `ask_question` | Question | Hỏi người dùng |
| `todo_manage` | Todo | Quản lý danh sách tác vụ |
| `skill_load` | Skill | Tải và sử dụng kỹ năng |

Công cụ bộ nhớ (`memory_store`, `memory_retrieve`, `memory_search`) có sẵn khi cấu hình backend tri thức.

---

## Các phụ thuộc

Module cốt lõi phụ thuộc vào các gói sau của vinhnt-sdk:

| Gói | Mục đích |
|-----|----------|
| `@vinhnt-sdk/schema` | Định nghĩa kiểu và xác thực |
| `@vinhnt-sdk/config` | Quản lý cấu hình |
| `@vinhnt-sdk/llm` | Trừu tượng hóa nhà cung cấp LLM |
| `@vinhnt-sdk/tools` | Định nghĩa và registry công cụ |
| `@vinhnt-sdk/sandbox` | Môi trường thực thi được cách ly |
| `@vinhnt-sdk/guard` | Rào cản an toàn |
| `@vinhnt-sdk/session` | Quản lý phiên |
| `@vinhnt-sdk/permission` | Kiểm soát quyền truy cập |
| `@vinhnt-sdk/step-executor` | Engine thực thi từng bước |
| `@vinhnt-sdk/event` | Kiểu và giao diện sự kiện |
| `@vinhnt-sdk/knowledge` | Tích hợp cơ sở tri thức |
| `@vinhnt-sdk/security` | Chính sách và kiểm tra bảo mật |

---

## Ví dụ: Sử dụng cơ bản

```ts
import { AgentKernel } from "@vinhnt-sdk/core";

const kernel = new AgentKernel({
  model: "gpt-4",
  plugins: [],
  permissions: { file: "readwrite", shell: "restricted" },
});

const handle = kernel.createRunHandle({
  messages: [
    { role: "user", content: "Tạo script hello world" },
  ],
});

for await (const event of handle.events()) {
  if (event.type === "text_delta") {
    process.stdout.write(event.data);
  }
}

const result = await handle.result();
```
