---
title: "@vinhnt-sdk/session"
description: "Quản lý trạng thái session và store"
lang: "vi"
type: "reference"
category: "API Reference"
version: "0.1.3"
sidebarLabel: "session"
---

# @vinhnt-sdk/session

Lớp lưu trữ và quản lý trạng thái session cho hội thoại agent.

## Exports

### InMemorySessionState

Triển khai trạng thái session trong bộ nhớ. Hữu ích cho testing và session ngắn hạn.

```ts
const state = new InMemorySessionState(sessionId);
```

| Phương thức | Mô tả |
| --- | --- |
| `getState()` | Trả về trạng thái session hiện tại |
| `updateState(partial)` | Hợp nhất cập nhật trạng thái một phần |
| `reset()` | Xóa toàn bộ trạng thái |

### NullRunEventStore

Store sự kiện run không hoạt động (no-op). Sử dụng khi không cần theo dõi sự kiện.

```ts
const store = new NullRunEventStore();
await store.append(event); // no-op
await store.list(sessionId); // trả về []
```

### SessionRunCoordinator

Điều phối thực thi run trong session. Quản lý vòng đời run và đồng thời.

```ts
const coordinator = new SessionRunCoordinator(config);
const run = await coordinator.startRun(session, messages);
await coordinator.completeRun(run.id);
```

### SessionRuntimeSnapshot

Snapshot chỉ đọc của trạng thái runtime hiện tại. Cung cấp truy cập dữ liệu session mà không thay đổi.

```ts
const snapshot = coordinator.getSnapshot(sessionId);
console.log(snapshot.activeRuns);
console.log(snapshot.messageCount);
```

## Types

### SessionProvider

```ts
type SessionProvider = {
  getSession(id: string): Promise<Session | null>;
  createSession(config: SessionConfig): Promise<Session>;
  deleteSession(id: string): Promise<void>;
};
```

### SessionStore

```ts
type SessionStore = {
  load(id: string): Promise<SessionState | null>;
  save(id: string, state: SessionState): Promise<void>;
  list(): Promise<string[]>;
};
```

### RunEventStore

```ts
type RunEventStore = {
  append(event: RunEvent): Promise<void>;
  list(sessionId: string): Promise<RunEvent[]>;
  clear(sessionId: string): Promise<void>;
};
```

### Session

```ts
type Session = {
  id: string;
  config: SessionConfig;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
};
```

### Message

```ts
type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolResult?: ToolResult;
  timestamp: Date;
};
```

### SessionConfig

```ts
type SessionConfig = {
  model: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  tools?: string[];
};
```

## Compaction (Nén hội thoại)

### ConversationCompactor

Giảm độ dài hội thoại bằng cách tóm tắt các tin nhắn cũ hơn đồng thời giữ lại ngữ cảnh quan trọng.

```ts
const compactor = new ConversationCompactor(config);
const summary = await compactor.compact(messages);
```

### CompressionSummary

```ts
type CompressionSummary = {
  originalCount: number;
  compressedCount: number;
  summary: string;
  retainedMessages: Message[];
};
```

## Durable Reload (Tải lại bền vững)

### DurableReloadConfig

Cấu hình tải lại session bền vững từ bộ nhớ持久化.

```ts
type DurableReloadConfig = {
  store: SessionStore;
  maxAge?: number;
  validate?: (state: SessionState) => boolean;
};
```

## Dependencies (Phụ thuộc)

- `schema` — định nghĩa type và validation chung
