---
title: "Persistence"
description: "Persist agent state to databases"
lang: "en"
type: "guide"
category: "Guides"
sidebarPosition: 5
---

# Persistence

Persistence lets you save agent state across restarts, resume conversations, and maintain audit trails. This guide covers implementing `RunEventStore` and `SessionStore` for different backends.

## Why Persist

Without persistence, all agent state lives in memory and is lost when the process exits. Persistence enables:

- **Resume conversations** — Users can close a browser tab and come back to the same session later.
- **Audit trail** — Every tool call, LLM response, and decision is recorded for compliance and debugging.
- **Analytics** — Aggregate usage patterns, costs, and error rates across thousands of runs.
- **Replay** — Debug issues by replaying the exact sequence of events that led to a failure.

## Store Interfaces

The SDK defines two core store interfaces in `@vinhnt-sdk/session`:

### RunEventStore

Stores every event emitted during a run:

```ts
type RunEventStore = {
  append(event: RunEvent): Promise<void>;
  list(sessionId: string): Promise<RunEvent[]>;
  clear(sessionId: string): Promise<void>;
};
```

### SessionStore

Persists session state (messages, config, metadata):

```ts
type SessionStore = {
  load(id: string): Promise<SessionState | null>;
  save(id: string, state: SessionState): Promise<void>;
  list(): Promise<string[]>;
};
```

## SQLite with Drizzle

Drizzle ORM provides a type-safe way to work with SQLite:

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

## PostgreSQL with Drizzle

For production workloads, PostgreSQL offers better concurrency and scalability. The schema uses `jsonb` columns for flexible payload storage:

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

## MongoDB Implementation

MongoDB works well for document-oriented storage with flexible schemas:

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
      type: d.type,
      sessionId: d.sessionId,
      payload: d.payload,
      timestamp: d.timestamp.getTime(),
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

## Kernel Integration

Wire your stores into the `AgentKernel`:

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

Once configured, every run automatically appends events and saves session state. You can reload history later:

```ts
const events = await runEventStore.list(sessionId);
```

## In-Memory vs Persistent Tradeoffs

| Aspect | In-Memory | Persistent |
|--------|-----------|------------|
| **Latency** | Nanoseconds | Milliseconds |
| **Durability** | Lost on restart | Survives restarts |
| **Complexity** | Zero config | Requires DB setup |
| **Cost** | Free | Infrastructure costs |
| **Scalability** | Single process | Horizontal scaling |
| **Best for** | Dev, testing, short tasks | Production, audit, analytics |

For most production deployments, start with SQLite for simplicity and move to PostgreSQL when you need concurrent access or horizontal scaling. MongoDB is a good fit when your event payloads vary widely in shape.

## Next Steps

- Review the [Observability](/guides/observability) guide for tracing and logging
- Check the `@vinhnt-sdk/session` API reference for full type definitions
- Explore the `@vinhnt-sdk/event` module for durable event replay
