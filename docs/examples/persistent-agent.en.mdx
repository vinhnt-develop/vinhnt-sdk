---
title: "Persistent Agent"
description: "Agent with database persistence and session management"
lang: "en"
type: "example"
category: "Examples"
sidebarPosition: 5
---

# Persistent Agent

Build agents with database persistence for session resumption, conversation history, and audit trails.

## Overview

This example demonstrates how to:

- Implement SQLite/Drizzle store for local persistence
- Use PostgreSQL store for production deployments
- Resume sessions across restarts
- Maintain conversation history
- Track audit trails for compliance

## Setup

```bash
npm install vinhnt-sdk drizzle-orm better-sqlite3
npm install -D @types/better-sqlite3 drizzle-kit
```

## SQLite with Drizzle Store

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
  systemPrompt: "You are a helpful assistant with memory.",
});

const session1 = await agent.createSession({
  metadata: { userId: "user-123", userAgent: "Mozilla/5.0" },
});

const result1 = await session1.chat({
  message: "My name is Alice and I work at Acme Corp.",
});

console.log(session1.id);
```

## Session Resume

```typescript
const session2 = await agent.resumeSession(session1.id);

const result2 = await session2.chat({
  message: "What is my name and where do I work?",
});

// Response: "Your name is Alice and you work at Acme Corp."
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
  systemPrompt: "You are a production assistant.",
});

const session = await agent.createSession({
  metadata: {
    userId: "user-456",
    organizationId: "org-789",
    environment: "production",
  },
});

const result = await session.chat({
  message: "Help me draft an email",
});
```

## Conversation History

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

await session.chat({ message: "What is React?" });
await session.chat({ message: "How does useState work?" });
await session.chat({ message: "Show me an example" });

const history = await session.getHistory();
console.log(history.messages.length);

const exportData = await session.exportHistory({
  format: "json",
  includeTimestamps: true,
});
```

## Audit Trail

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

await session.chat({ message: "Help me with a task" });

const auditTrail = await session.getAuditTrail();
console.log(auditTrail.entries);
```

## Multi-Session Management

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

## Session States

```typescript
const session = await agent.createSession({
  initialState: {
    preferences: { language: "en", responseStyle: "concise" },
    context: { currentTask: "email-drafting" },
  },
});

await session.updateState({
  preferences: { language: "en", responseStyle: "detailed" },
  context: {
    currentTask: "code-review",
    filesReviewed: ["src/index.ts"],
  },
});

const state = await session.getState();
console.log(state.context.currentTask);
```

## Store Migration

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

## Error Recovery

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
  await session.chat({ message: "This might fail" });
} catch (error) {
  const recoveredSession = await agent.resumeSession(session.id);
  await recoveredSession.chat({ message: "Try again" });
}
```

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/agent_db
SQLITE_PATH=./agent.db
```

## Summary

Persistent agents provide:

- **Session Resumption**: Continue conversations across restarts
- **Conversation History**: Full message history with metadata
- **Audit Trail**: Track all actions for compliance
- **Multi-Session**: Manage multiple concurrent sessions
- **State Management**: Persist custom state across messages
- **Error Recovery**: Automatic recovery from failures
