---
title: "Persistent Agent"
description: "Agent với lưu trữ cơ sở dữ liệu và quản lý phiên"
lang: "vi"
type: "example"
category: "Examples"
sidebarPosition: 5
---

# Agent có lưu trữ

Xây dựng agent với lưu trữ cơ sở dữ liệu để.onResume phiên, lịch sử hội thoại và nhật ký kiểm toán.

## Tổng quan

Ví dụ này hướng dẫn cách:

- Triển khai SQLite/Drizzle store cho lưu trữ cục bộ
- Sử dụng PostgreSQL store cho triển khai sản phẩm
- onResume phiên qua các lần khởi động lại
- Duy trì lịch sử hội thoại
- Theo dõi nhật ký kiểm toán để tuân thủ

## Cài đặt

```bash
npm install vinhnt-sdk drizzle-orm better-sqlite3
npm install -D @types/better-sqlite3 drizzle-kit
```

## SQLite với Drizzle Store

```typescript
import { Agent, SQLiteStore } from "vinhnt-sdk";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";

const sqlite = new Database("agent.db");
const db = drizzle(sqlite);

const store = new SQLiteStore({
  db,
  tableName: "agent_sessions",
});

const agent = new Agent({
  name: "assistant",
  model: "gpt-4o",
  store,
  systemPrompt: "Bạn là trợ lý hữu ích với bộ nhớ.",
});

const session1 = await agent.createSession({
  metadata: { userId: "user-123", userAgent: "Mozilla/5.0" },
});

const result1 = await session1.chat({
  message: "Tên tôi là Alice và tôi làm việc tại Acme Corp.",
});

console.log(session1.id);
```

## onResume phiên

```typescript
const session2 = await agent.resumeSession(session1.id);

const result2 = await session2.chat({
  message: "Tên tôi là gì và tôi làm việc ở đâu?",
});

// Phản hồi: "Tên bạn là Alice và bạn làm việc tại Acme Corp."
```

## PostgreSQL Store

```typescript
import { Agent, PostgresStore } from "vinhnt-sdk";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

const store = new PostgresStore({
  db,
  tableName: "agent_sessions",
});

const agent = new Agent({
  name: "production-agent",
  model: "gpt-4o",
  store,
  systemPrompt: "Bạn là trợ lý sản phẩm.",
});

const session = await agent.createSession({
  metadata: {
    userId: "user-456",
    organizationId: "org-789",
    environment: "production",
  },
});

const result = await session.chat({
  message: "Giúp tôi soạn email",
});
```

## Lịch sử hội thoại

```typescript
const agent = new Agent({
  name: "assistant",
  model: "gpt-4o",
  store,
  historyConfig: {
    maxMessages: 100,
    includeMetadata: true,
    retentionDays: 30,
  },
});

const session = await agent.createSession();

await session.chat({ message: "React là gì?" });
await session.chat({ message: "useState hoạt động như thế nào?" });
await session.chat({ message: "Cho tôi xem ví dụ" });

const history = await session.getHistory();
console.log(history.messages.length);

const exportData = await session.exportHistory({
  format: "json",
  includeTimestamps: true,
});
```

## Nhật ký kiểm toán

```typescript
const agent = new Agent({
  name: "compliant-agent",
  model: "gpt-4o",
  store,
  auditConfig: {
    enabled: true,
    trackActions: true,
    trackErrors: true,
    retentionDays: 365,
  },
});

const session = await agent.createSession({
  metadata: { userId: "user-789", ipAddress: "192.168.1.100" },
});

await session.chat({ message: "Giúp tôi với một tác vụ" });

const auditTrail = await session.getAuditTrail();
console.log(auditTrail.entries);
```

## Quản lý nhiều phiên

```typescript
const agent = new Agent({
  name: "multi-session-agent",
  model: "gpt-4o",
  store,
  maxSessions: 1000,
});

const session1 = await agent.createSession({
  metadata: { userId: "user-1" },
});

const session2 = await agent.createSession({
  metadata: { userId: "user-2" },
});

const sessions = await agent.listSessions({
  status: "active",
  limit: 50,
  offset: 0,
});

const count = await agent.getSessionCount({ status: "active" });

await agent.cleanupSessions({
  olderThanDays: 90,
  status: "archived",
});
```

## Trạng thái phiên

```typescript
const session = await agent.createSession({
  initialState: {
    preferences: { language: "vi", responseStyle: "concise" },
    context: { currentTask: "email-drafting" },
  },
});

await session.updateState({
  preferences: { language: "vi", responseStyle: "detailed" },
  context: {
    currentTask: "code-review",
    filesReviewed: ["src/index.ts"],
  },
});

const state = await session.getState();
console.log(state.context.currentTask);
```

## Di chuyểnystore

```typescript
import { Agent, SQLiteStore, PostgresStore } from "vinhnt-sdk";

const sqliteStore = new SQLiteStore({
  db: sqliteDb,
  tableName: "agent_sessions",
});

const agent = new Agent({
  name: "migrating-agent",
  model: "gpt-4o",
  store: sqliteStore,
});

const postgresStore = new PostgresStore({
  db: postgresDb,
  tableName: "agent_sessions",
});

await agent.migrateStore({
  from: sqliteStore,
  to: postgresStore,
  batchSize: 100,
});
```

## Khôi phục lỗi

```typescript
const agent = new Agent({
  name: "resilient-agent",
  model: "gpt-4o",
  store,
  recoveryConfig: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000,
    checkpointOnError: true,
  },
});

const session = await agent.createSession();

try {
  await session.chat({ message: "Điều này có thể thất bại" });
} catch (error) {
  const recoveredSession = await agent.resumeSession(session.id);
  await recoveredSession.chat({ message: "Thử lại" });
}
```

## Biến môi trường

```env
DATABASE_URL=postgresql://user:password@localhost:5432/agent_db
SQLITE_PATH=./agent.db
```

## Tóm tắt

Agent có lưu trữ cung cấp:

- **onResume phiên**: Tiếp tục trò chuyện qua các lần khởi động lại
- **Lịch sử hội thoại**: Toàn bộ lịch sử tin nhắn với metadata
- **Nhật ký kiểm toán**: Theo dõi tất cả hành động để tuân thủ
- **Nhiều phiên**: Quản lý nhiều phiên đồng thời
- **Quản lý trạng thái**: Lưu trữ trạng thái tùy chỉnh qua các tin nhắn
- **Khôi phục lỗi**: Tự động khôi phục từ lỗi
