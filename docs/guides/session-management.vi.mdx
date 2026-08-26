---
title: "Quản lý phiên"
description: "Quản lý trạng thái hội thoại và phiên"
lang: "vi"
type: "guide"
category: "Guides"
sidebarPosition: 8
---

# Quản lý phiên

vinhnt-sdk cung cấp lớp phiên để theo dõi trạng thái hội thoại, lịch sử tin nhắn và vòng đời chạy. Phiên cô lập các hội thoại và kích hoạt các tính năng như nén, tải lại bền vững và sử dụng đa tenant.

## Khái niệm phiên

Một phiên nhóm các tương tác liên quan:

| Khái niệm | Mô tả |
|-----------|-------|
| **Session** | Container chứa tin nhắn và metadata cho một hội thoại |
| **Message** | Một câu nói của người dùng, trợ lý hoặc hệ thống |
| **Run** | Một chu kỳ thực thi hoàn chỉnh từ đầu vào người dùng đến phản hồi cuối cùng |

```typescript
import { Session } from "vinhnt-sdk";

const session = new Session({ id: "user-123" });
session.addMessage({ role: "user", content: "Xin chào" });
```

## InMemorySessionState

`InMemorySessionState` lưu trữ dữ liệu phiên trong bộ nhớ tiến trình. Thích hợp cho phát triển và triển khai đơn tiến trình:

```typescript
import { InMemorySessionState } from "vinhnt-sdk";

const state = new InMemorySessionState();

// Lưu phiên
await state.save(session);

// Truy xuất phiên
const loaded = await state.load("user-123");
```

Cho sản xuất, hãy triển khai giao diện `SessionState` với backend cơ sở dữ liệu (Redis, PostgreSQL, v.v.).

## NullRunEventStore

`NullRunEventStore` loại bỏ tất cả sự kiện chạy. Sử dụng khi bạn không cần lịch sử sự kiện hoặc phát lại:

```typescript
import { NullRunEventStore } from "@vinhnt-sdk/session";

const eventStore = new NullRunEventStore();

const kernel = new Kernel({
  session: { eventStore },
});
```

Điều này giảm sử dụng bộ nhớ và tránh lưu các sự kiện tạm thời không cần thiết.

## SessionRunCoordinator

`SessionRunCoordinator` quản lý vòng đời của một chạy trong phiên. Nó phối hợp lưu tin nhắn, thực thi công cụ và tạo phản hồi:

```typescript
import { SessionRunCoordinator } from "vinhnt-sdk";

const coordinator = new SessionRunCoordinator({
  session,
  kernel,
  eventStore,
});

const run = await coordinator.start({
  messages: session.getMessages(),
});

await coordinator.complete(run.id);
```

Coordinator đảm bảo rằng các chạy bị gián đoạn có thể được khôi phục nếu tiến trình khởi động lại.

## Tải lại bền vững

Tải lại bền vững khôi phục trạng thái phiên từ lưu trữ bền vững sau sự cố hoặc khởi động lại:

```typescript
import { DurableSessionReloader } from "vinhnt-sdk";

const reloader = new DurableSessionReloader({ state: persistentState });

// Khi khởi động, tải lại các phiên đang hoạt động
const sessions = await reloader.reloadAll();

for (const session of sessions) {
  console.log(`Đã khôi phục phiên ${session.id} với ${session.messageCount} tin nhắn`);
}
```

Kết hợp với `SessionRunCoordinator` để tự động khôi phục các chạy bị gián đoạn.

## Nén phiên

Hội thoại dài tiêu tốn không gian cửa sổ ngữ cảnh ngày càng lớn. Nén phiên tóm tắt các tin nhắn cũ hơn để giải phóng token:

```typescript
import { ContextCompressor, LlmCompactor } from "vinhnt-sdk";

const compactor = new LlmCompactor({
  model: "gpt-4",
  targetTokens: 2000,
});

const compressor = new ContextCompressor({ compactor });

// Nén tin nhắn phiên
const compressed = await compressor.compress(session.getMessages());
session.setMessages(compressed);
```

| Thành phần | Vai trò |
|------------|---------|
| `ContextCompressor` | Điều phối chiến lược nén và lựa chọn tin nhắn |
| `LlmCompactor` | Sử dụng LLM để tạo tóm tắt các tin nhắn cũ hơn |

Cấu hình ngưỡng nén để tự động kích hoạt khi số lượng tin nhắn hoặc sử dụng token vượt quá giới hạn.

## Quản lý đa phiên

Quản lý nhiều phiên đồng thời với trình quản lý phiên:

```typescript
import { SessionManager } from "vinhnt-sdk";

const manager = new SessionManager({ state: persistentState });

// Tạo hoặc truy xuất phiên
const sessionA = await manager.getOrCreate("tenant-a");
const sessionB = await manager.getOrCreate("tenant-b");

// Chạy các hội thoại độc lập
await coordinator.start({ session: sessionA, messages: [...] });
await coordinator.start({ session: sessionB, messages: [...] });

// Liệt kê các phiên đang hoạt động
const active = await manager.listActive();
```

Mỗi phiên được cô lập hoàn toàn. Tin nhắn, quyền hạn và trạng thái chạy không bị rò rỉ giữa các phiên.
