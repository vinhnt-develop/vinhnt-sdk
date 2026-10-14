---
title: "@vinhnt-sdk/core"
description: "AgentKernel, quản lý plugin, điều phối"
version: "0.10.9"
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
  ContextRegistry,
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

#### `run(prompt, ctx, sessionId?)`

Bắt đầu một run agent mới và trả về `RunHandle` (`runId`, promise `completed`, `abort()`). Tham số thứ hai là request context (`requestId`, `traceId`, `actorId`, `tenantId`).

```ts
const handle = kernel.run('Tóm tắt tệp này', ctx);
await handle.completed;
```

#### `createRunHandle(prompt, ctx, sessionId?)`

Tạo `AgentRunHandle` với quyền điều khiển vòng đời: `completed` (resolve về `AgentRunResult`), `cancel()`, `events()` và `onEvent()`.

```ts
const handle = kernel.createRunHandle('Tóm tắt tệp này', ctx);
const result = await handle.completed;
console.log(result.status);
```

#### `cancelCurrentRun()`

Hủy tất cả các session đang chạy.

```ts
kernel.cancelCurrentRun();
```

### Phát trực tuyến sự kiện

```ts
const handle = kernel.createRunHandle('Tóm tắt tệp này', ctx);
for await (const event of handle.events()) {
  console.log(event.type);
}
```

Phương thức `events()` trả về `AsyncIterable<AgentEvent>` với các cập nhật vòng đời (`agent.started`, `agent.completed`, `agent.error`). Để lấy stream sự kiện run đầy đủ (step, tool, token), xem `streamRun`.

---

## defineTool

Re-export từ `@vinhnt-sdk/tools`. Định nghĩa công cụ mà agent có thể gọi.

```ts
const myTool = defineTool({
  name: "my_tool",
  description: "Thực hiện việc hữu ích",
  risk: "read",
  input: z.object({ input: z.string() }),
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

## ContextRegistry

Quản lý nguồn prompt và tiêm ngữ cảnh hệ thống cho phiên agent.

```ts
import { createContextRegistry } from "@vinhnt-sdk/core";

const registry = createContextRegistry();
registry.register(source); // ContextSourceValue: { key, load, renderBaseline, renderUpdate, renderRemoval }
const context = await registry.initialize(); // resolves the SystemContext
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
import { NullRunEventStore } from "@vinhnt-sdk/session";
import { createDeepSeekProvider } from "@vinhnt-sdk/provider-openai-compatible";

const model = createDeepSeekProvider({ apiKey: process.env.DEEPSEEK_API_KEY! });
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
});

const ctx = {
  requestId: "req-1",
  traceId: "trace-1",
  actorId: "user-1",
  tenantId: "default",
};

// Luồng sự kiện run đầy đủ (KnownRunEvent) — stream văn bản ra stdout:
const { runId, events } = kernel.streamRun("Tạo script hello world", ctx);

for await (const event of events) {
  if (event.type === "token.streamed") {
    process.stdout.write(event.data.content);
  }
  if (event.type === "run.completed") {
    console.log(`\nRun ${runId} kết thúc: ${event.data.status}`);
  }
}
```
