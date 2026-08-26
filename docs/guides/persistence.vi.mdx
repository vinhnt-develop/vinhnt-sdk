---
title: "Lưu Trữ Dữ Liệu"
description: "Lưu trữ trạng thái agent xuống cơ sở dữ liệu"
lang: "vi"
type: "guide"
category: "Guides"
sidebarPosition: 5
---

# Lưu Trữ Dữ Liệu

Lưu trữ dữ liệu cho phép bạn lưu trạng thái agent qua các lần khởi động lại, khôi phục cuộc trò chuyện và duy trì nhật ký kiểm tra. Hướng dẫn này đề cập đến cách triển khai `RunEventStore` và `SessionStore` cho các backend khác nhau.

## Tại Sao Cần Lưu Trữ

Nếu không có lưu trữ, tất cả trạng thái agent chỉ sống trong bộ nhớ và bị mất khi quá trình thoát. Lưu trữ cho phép:

- **Khôi phục cuộc trò chuyện** — Người dùng có thể đóng tab trình duyệt và quay lại cùng phiên làm việc sau đó.
- **Nhật ký kiểm tra** — Mỗi lần gọi công cụ, phản hồi LLM và quyết định đều được ghi lại để phục vụ kiểm tra và gỡ lỗi.
- **Phân tích** — Tổng hợp mô hình sử dụng, chi phí và tỷ lệ lỗi trên hàng nghìn lần chạy.
- **Phát lại** — Gỡ lỗi bằng cách phát lại chính xác chuỗi sự kiện dẫn đến lỗi.

## Giao Diện Store

SDK định nghĩa hai giao diện store cốt lõi trong `@vinhnt-sdk/session`:

### RunEventStore

Lưu mọi sự kiện được phát trong một lần chạy:

```ts
type RunEventStore = {
  append(event: RunEvent): Promise<void>;
  list(sessionId: string): Promise<RunEvent[]>;
  clear(sessionId: string): Promise<void>;
};
```

### SessionStore

Lưu trữ trạng thái phiên (tin nhắn, cấu hình, metadata):

```ts
type SessionStore = {
  load(id: string): Promise<SessionState | null>;
  save(id: string, state: SessionState): Promise<void>;
  list(): Promise<string[]>;
};
```

## SQLite Với Drizzle

Drizzle ORM cung cấp cách làm việc type-safe với SQLite:

```ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

const runEvents = sqliteTable("run_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  type: text("type").notNull(),
  payload: text("payload").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
});

const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  state: text("state").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

const db = drizzle("./agent.db");

export class SqliteRunEventStore implements RunEventStore {
  async append(event: RunEvent) {
    await db.insert(runEvents).values({
      sessionId: event.sessionId,
      type: event.type,
      payload: JSON.stringify(event.payload),
      timestamp: new Date(event.timestamp),
    });
  }
  async list(sessionId: string) {
    const rows = await db.select().from(runEvents).where(eq(runEvents.sessionId, sessionId));
    return rows.map((r) => ({ type: r.type, sessionId: r.sessionId, payload: JSON.parse(r.payload), timestamp: r.timestamp.getTime() }));
  }
  async clear(sessionId: string) {
    await db.delete(runEvents).where(eq(runEvents.sessionId, sessionId));
  }
}

export class SqliteSessionStore implements SessionStore {
  async load(id: string) {
    const row = await db.select().from(sessions).where(eq(sessions.id, id));
    return row[0] ? JSON.parse(row[0].state) : null;
  }
  async save(id: string, state: SessionState) {
    await db.insert(sessions).values({ id, state: JSON.stringify(state), updatedAt: new Date() })
      .onConflictDoUpdate({ target: sessions.id, set: { state: JSON.stringify(state), updatedAt: new Date() } });
  }
  async list() {
    const rows = await db.select({ id: sessions.id }).from(sessions);
    return rows.map((r) => r.id);
  }
}
```

## PostgreSQL Với Drizzle

Cho các tải lượng sản phẩm, PostgreSQL cung cấp khả năng đồng thời và mở rộng tốt hơn. Schema sử dụng cột `jsonb` để lưu trữ payload linh hoạt:

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, text, integer, jsonb } from "drizzle-orm/pg-core";

const runEvents = pgTable("run_events", {
  id: integer("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  timestamp: integer("timestamp").notNull(),
});

const db = drizzle(process.env.DATABASE_URL!);

export class PostgresRunEventStore implements RunEventStore {
  async append(event: RunEvent) {
    await db.insert(runEvents).values({
      sessionId: event.sessionId,
      type: event.type,
      payload: event.payload,
      timestamp: event.timestamp,
    });
  }

  async list(sessionId: string) {
    return db.select().from(runEvents).where(eq(runEvents.sessionId, sessionId));
  }

  async clear(sessionId: string) {
    await db.delete(runEvents).where(eq(runEvents.sessionId, sessionId));
  }
}
```

## Triển Khai MongoDB

MongoDB phù hợp cho lưu trữ tài liệu với schema linh hoạt:

```ts
import { MongoClient, Collection } from "mongodb";
import type { RunEventStore, SessionStore } from "@vinhnt-sdk/session";

export class MongoRunEventStore implements RunEventStore {
  private col: Collection;
  constructor(client: MongoClient, dbName: string) {
    this.col = client.db(dbName).collection("run_events");
  }
  async append(event: RunEvent) {
    await this.col.insertOne({
      sessionId: event.sessionId,
      type: event.type,
      payload: event.payload,
      timestamp: new Date(event.timestamp),
    });
  }
  async list(sessionId: string) {
    const docs = await this.col.find({ sessionId }).sort({ timestamp: 1 }).toArray();
    return docs.map((d) => ({
      type: d.type, sessionId: d.sessionId, payload: d.payload, timestamp: d.timestamp.getTime(),
    }));
  }
  async clear(sessionId: string) {
    await this.col.deleteMany({ sessionId });
  }
}

export class MongoSessionStore implements SessionStore {
  private col: Collection;
  constructor(client: MongoClient, dbName: string) {
    this.col = client.db(dbName).collection("sessions");
  }
  async load(id: string) {
    const doc = await this.col.findOne({ _id: id });
    return doc?.state ?? null;
  }
  async save(id: string, state: SessionState) {
    await this.col.updateOne({ _id: id }, { $set: { state, updatedAt: new Date() } }, { upsert: true });
  }
  async list() {
    const docs = await this.col.find({}, { projection: { _id: 1 } }).toArray();
    return docs.map((d) => d._id as string);
  }
}
```

## Tích Hợp Kernel

Kết nối các store của bạn vào `AgentKernel`:

```ts
import { AgentKernel } from "@vinhnt-sdk/core";

const kernel = new AgentKernel({
  runEventStore: new SqliteRunEventStore(db),
  sessionStore: new SqliteSessionStore(db),
  plugins: [/* ... */],
  tools: [/* ... */],
  models: [/* ... */],
});
```

Sau khi cấu hình, mỗi lần chạy tự động ghi lại sự kiện và lưu trạng thái phiên. Bạn có thể tải lại lịch sử sau:

```ts
const events = await runEventStore.list(sessionId);
```

## So Sánh Lưu Trữ Trong Memory Và Lưu Trữ Vĩnh Viễn

| Khía cạnh | Trong Memory | Lưu Trữ Vĩnh Viễn |
|-----------|--------------|-------------------|
| **Độ trễ** | Nanosecond | Millisecond |
| **Độ bền** | Mất khi khởi động lại | Tồn tại qua khởi động lại |
| **Độ phức tạp** | Không cần cấu hình | Cần thiết lập DB |
| **Chi phí** | Miễn phí | Chi phí hạ tầng |
| **Khả năng mở rộng** | Đơn processes | Mở rộng ngang |
| **Phù hợp nhất** | Dev, testing, tác vụ ngắn | Sản phẩm, kiểm tra, phân tích |

Đối với hầu hết triển khai sản phẩm, hãy bắt đầu với SQLite để đơn giản và chuyển sang PostgreSQL khi bạn cần truy cập đồng thời hoặc mở rộng ngang. MongoDB phù hợp khi payload sự kiện của bạn đa dạng về cấu trúc.

## Bước Tiếp Theo

- Xem hướng dẫn [Quan Sát](/guides/observability) về tracing và logging
- Xem tham chiếu API `@vinhnt-sdk/session` cho đầy đủ định nghĩa kiểu
- Khám phá module `@vinhnt-sdk/event` cho khả năng phát lại sự kiện bền vững
