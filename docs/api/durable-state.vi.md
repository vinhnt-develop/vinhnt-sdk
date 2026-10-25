---
title: "@vinhnt-sdk/durable-state"
description: "Quản lý trạng thái bền vững — StateChannel, Reducer, Checkpointer, Interrupt/Resume, AttachmentRef"
lang: vi
type: "reference"
category: "API Reference"
sidebarLabel: durable-state
version: "0.1.0-beta.0"
---

# @vinhnt-sdk/durable-state

> **Trạng thái:** BETA  
> Quản lý trạng thái bền vững cho agent orchestration — StateChannel, Reducer, Checkpointer, Interrupt/Resume, AttachmentRef.

Gói này mang **trạng thái có thể checkpoint** đến vinhnt-sdk như một gói tùy chọn riêng biệt. Nó **KHÔNG thay thế** `SessionRuntimeState`, `RunEventSnapshot`, hoặc `SerializedRunState` hiện có — nó chạy song song với chúng như một lớp trạng thái dựa trên channel có thể được checkpoint, time-travel, và bị gián đoạn/tiếp tục.

## Tại sao là gói riêng?

- `@vinhnt-sdk/workflow` là các nguyên thủy orchestration nhẹ (`parallel`, `sequential`, `conditional`) — không có trạng thái, không có checkpointing.
- Một gói riêng giữ mô hình immutable-delta + reducer-per-channel được tách biệt rõ ràng khỏi `SessionRuntimeState` có thể biến đổi được của vinhnt.
- Gói này phụ thuộc nhẹ (chỉ `@vinhnt-sdk/schema`; `@vinhnt-sdk/session` là peer dep tùy chọn), nên người dùng chỉ cài khi cần durable state.

## Cài đặt

```bash
# npm
npm install @vinhnt-sdk/durable-state@beta

# pnpm
pnpm add @vinhnt-sdk/durable-state@beta
```

## Quick Start

```typescript
import {
  StateGraphBuilder,
  StateGraphExecutor,
  createChannel,
  appendReducer,
  overwriteReducer,
  createMemoryCheckpointer,
  interrupt,
  Command,
} from "@vinhnt-sdk/durable-state";
import type { MessageContentPart } from "@vinhnt-sdk/schema";

// 1. Định nghĩa schema trạng thái (các channel được kiểu)
const builder = new StateGraphBuilder("my-graph", "My Graph");
builder.addChannel("messages", createChannel<MessageContentPart[]>("messages", {
  reducer: appendReducer(),
  default: [],
}));
builder.addChannel("step", createChannel<number>("step", {
  reducer: overwriteReducer(),
  default: 0,
}));
const graph = builder.build();

// 2. Tạo checkpointer (MemoryCheckpointer cho dev; SQLite/Postgres cho prod)
const checkpointer = createMemoryCheckpointer();

// 3. Tạo executor và đăng ký các node
const executor = new StateGraphExecutor(graph, checkpointer);
executor.addNode("process", async (state, config) => {
  // ... logic node, trả về PartialState hoặc Command
  return { messages: [...state.messages, { type: "text", text: "done" }] };
});

// 4. Chạy — threadId ánh xạ đến vinhnt sessionId
const result = await executor.run("process", {
  threadId: "session_123",
  checkpointNs: "",
});

// 5. Tiếp tục sau interrupt (nếu result.interrupt được thiết lập)
const resumed = await executor.resume(
  { threadId: "session_123", checkpointNs: "" },
  Command.resume("user approved"),
);
```

## Exports

### StateChannel & Reducer

| Export | Mô tả |
|--------|-------|
| `StateChannel<T, D>` | Channel được kiểu với tên, reducer, giá trị mặc định |
| `Reducer<S, D>` | Chữ ký `(current, delta) => newValue` |
| `Overwrite<T>` | Đánh dấu để bỏ qua reducer và thiết lập giá trị trực tiếp |
| `createChannel(name, default)` | Channel ghi đè cuối cùng |
| `createChannelWithReducer(name, reducer, default)` | Channel với reducer tùy chỉnh |
| `overwriteReducer()`, `appendReducer()`, `mergeReducer()` | Reducer có sẵn |
| `channelName(name)` | Tên channel được brand |

### StateGraph

| Export | Mô tả |
|--------|-------|
| `StateGraphBuilder` | Xây dựng schema trạng thái typed (channels + reducers) |
| `StateGraphDefinition` | Chữ ký graph đã được xây dựng và xác thực |
| `build()` | Xác thực và tạo định nghĩa |
| `initialState(definition)` | Khởi tạo tất cả channels với giá trị mặc định |
| `applyDelta(definition, current, delta)` | Áp dụng delta trạng thái phầnial qua reducers |

### Checkpointer & Snapshot

| Export | Mô tả |
|--------|-------|
| `GraphConfig` | Thread id, checkpoint namespace, checkpoint id |
| `StateSnapshot` | values, next, config, metadata, createdAt, parentConfig, tasks |
| `Checkpointer` | put, putWrites, getTuple, list, (delete) |
| `MemoryCheckpointer` | Triển khai in-memory (chỉ cho dev) |
| `createMemoryCheckpointer()` | Factory |
| `createSnapshot(config, values, opts)` | Tạo snapshot |

### Executor

| Export | Mô tả |
|--------|-------|
| `StateGraphExecutor` | Chạy graph từng node, áp dụng delta, checkpoint |
| `StepResult` | snapshot, completed, output, interrupt |
| `GraphNode<S>` | Kiểu hàm node: `(state, config) => PartialState \| Command` |

### Interrupt & Command

| Export | Mô tả |
|--------|-------|
| `interrupt(value, opts)` | Tạm dừng graph, ném GraphInterrupt, chờ tiếp tục |
| `Command` | `resume(value)`, `update(state)`, `goto(node)`, `graph(PARENT)` |
| `Command.resume(value)` | Tiếp tục sau interrupt |
| `Command.resumeWithUpdate(value, update)` | Tiếp tục + cập nhật trạng thái |
| `Command.resumeAndGoto(value, goto)` | Tiếp tục + nhảy đến node |
| `Command.update(update)` | Chỉ cập nhật trạng thái |
| `Command.goto(node)` | Chỉ nhảy |
| `Command.PARENT` | Điều hướng đến parent graph từ subgraph |
| `isCommand(value)` | Kiểm tra kiểu |

### Attachment / Binary Store

| Export | Mô tả |
|--------|-------|
| `AttachmentRef` | Tham chiếu nhẹ đến binary lưu ngoài JSON |
| `BinaryAttachmentStore` | save, get, list, delete, exists |
| `InMemoryBinaryAttachmentStore` | Triển khai in-memory (chỉ cho dev) |
| `createAttachmentRef(init)` | Factory |
| `createInMemoryBinaryAttachmentStore()` | Factory |

### Session Adapter (cần `@vinhnt-sdk/session` peer dep)

| Export | Mô tả |
|--------|-------|
| `runStateToSnapshot(runState, config)` | Chuyển `SerializedRunState` → `StateSnapshot` |
| `snapshotToRunState(snapshot)` | Chuyển `StateSnapshot` → `SerializedRunState` |
| `snapshotFromDefinition(definition, config)` | Xây dựng snapshot ban đầu từ graph definition |
| `applyDeltaToSnapshot(definition, snapshot, delta)` | Áp dụng delta lên snapshot qua reducers |
| `SessionStoreCheckpointer` | Checkpointer được supported bởi `RunEventStore` + `SessionStore` |

### Lỗi

| Export | Mô tả |
|--------|-------|
| `DurableStateError` | Lỗi cơ sở (code, category, retryable, context) |
| `ChannelNotFoundError` | Channel chưa được khai báo trong graph |
| `CheckpointError` | Lỗi lưu trữ checkpoint |
| `GraphInterrupt` | Control-flow interrupt (không phải lỗi) |
| `CommandError` | Trạng thái lệnh không hợp lệ |
| `AttachmentRefError` | Tham chiếu attachment không thể giải quyết |
| `isDurableStateError(value)` | Kiểm tra kiểu |
| `hasDurableStateErrorCode(value, code)` | Kiểm tra mã lỗi cấu trúc |

## Ghi chú Thiết kế

### Mô hình Trạng thái

Trạng thái bền vững sử dụng **immutable deltas + reducer-per-channel**. Một node trả về `PartialState` (cập nhật cho các channel cụ thể), và reducer của mỗi channel hợp nhất delta:

```
newValue = reducer(currentValue, delta)
```

Các channel có thể sử dụng `Overwrite<T>` để bỏ qua reducer và thay thế giá trị hoàn toàn.

### Checkpoint / Time-Travel

`StateSnapshot` ghi lại `values`, `next` (các node tiếp theo), `config` (thread/checkpoint ids), `metadata`, `createdAt`, `parentConfig`, và `tasks`. Việc liệt kê các snapshot cho một thread cho phép bạn đi qua các checkpoint và phát lại từ bất kỳ điểm nào.

### Interrupt / Resume

`interrupt()` tạm dừng thực thi và lưu checkpoint. `Command({ resume: value })` tiếp tục từ interrupt, truyền `value` ngược lại cho node bị gián đoạn. Đây là primitive HITL bền vững sạch sẽ — lượt kết thúc thay vì giữ process promise.

### Attachment Nhị Phân

`AttachmentRef` trỏ đến lưu trữ bên ngoài (filesystem, S3, v.v.). Checkpoint JSON chỉ lưu ref, tránh base64 bloat. Sử dụng `BinaryAttachmentStore` để lưu/lấy bytes thực.

## Tương thích với vinhnt-sdk

- **Lớp:** Extension (phụ thuộc vào `@vinhnt-sdk/schema`; `@vinhnt-sdk/session` là peer dep tùy chọn).
- **Không có breaking change** đối với các gói hiện có.
- **`SerializedRunState`** vẫn là run-loop checkpoint; snapshot durable-state là một channel-state checkpoint trực giao.
- **`threadId`** trong `GraphConfig` ánh xạ đến `sessionId` của vinhnt.

## Giấy phép

MIT
