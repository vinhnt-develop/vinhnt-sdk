# @vinhnt-sdk/store

> Drizzle ORM persistence for SQLite and PostgreSQL.

**npm:** `npm install @vinhnt-sdk/store`  
**Size:** ~35 KB  
**Dependencies:** `@vinhnt-sdk/core`, `@vinhnt-sdk/schema`, `drizzle-orm`  
**Peer deps:** `better-sqlite3`, `pg`

---

## Overview

`store` provides durable storage implementations for all core interfaces using Drizzle ORM.

## Installation

```bash
# SQLite
npm install @vinhnt-sdk/store better-sqlite3

# PostgreSQL
npm install @vinhnt-sdk/store pg
```

## SQLite Setup

```typescript
import {
  createDb,
  applyMigrations,
  DrizzleRunEventStore,
  DrizzleSessionStore,
  DrizzleAgentStore,
  DrizzlePermissionStore,
} from "@vinhnt-sdk/store";

const db = createDb("./data/agent.sqlite");
applyMigrations(db);

const kernel = new AgentKernel({
  model,
  runEventStore: new DrizzleRunEventStore(db),
  sessionStore: new DrizzleSessionStore(db),
  agentStore: new DrizzleAgentStore(db),
  permissionStore: new DrizzlePermissionStore(db),
});
```

## PostgreSQL Setup

```typescript
import {
  createPgDb,
  pushPgSchema,
  DrizzlePgRunEventStore,
  DrizzlePgSessionStore,
  DrizzlePgAgentStore,
  DrizzlePgPermissionStore,
} from "@vinhnt-sdk/store";

const db = createPgDb({
  connectionString: process.env.DATABASE_URL,
});

await pushPgSchema(db);

const kernel = new AgentKernel({
  model,
  runEventStore: new DrizzlePgRunEventStore(db),
  sessionStore: new DrizzlePgSessionStore(db),
  agentStore: new DrizzlePgAgentStore(db),
  permissionStore: new DrizzlePgPermissionStore(db),
});
```

## Store Implementations

| Store | SQLite | PostgreSQL | Description |
|-------|--------|------------|-------------|
| `RunEventStore` | `DrizzleRunEventStore` | `DrizzlePgRunEventStore` | Run lifecycle events |
| `SessionStore` | `DrizzleSessionStore` | `DrizzlePgSessionStore` | Session metadata |
| `AgentStore` | `DrizzleAgentStore` | `DrizzlePgAgentStore` | Agent definitions |
| `PermissionStore` | `DrizzlePermissionStore` | `DrizzlePgPermissionStore` | Permission rules |
| `ApprovalStore` | `DrizzleApprovalStore` | — | Approval decisions |
| `ShareStore` | `DrizzleShareStore` | `DrizzlePgShareStore` | Shared sessions |

## Schema Tables

| Table | Description |
|-------|-------------|
| `run_events` | Run lifecycle events |
| `sessions` | Session metadata |
| `messages` | Session messages |
| `agents` | Agent definitions |
| `permission_rules` | Permission rules |
| `run_snapshots` | Run state snapshots |
| `shares` | Shared sessions |
| `saved_approvals` | Saved approval decisions |

## Custom Store

Implement the interface from `@vinhnt-sdk/core`:

```typescript
import { RunEventStore, RunEvent } from "@vinhnt-sdk/core";

class MongoRunEventStore implements RunEventStore {
  constructor(private db: MongoClient) {}

  async append(event: RunEvent): Promise<void> {
    await this.db.db().collection("run_events").insertOne(event);
  }

  async getByRun(runId: string): Promise<RunEvent[]> {
    return this.db.db().collection("run_events").find({ runId }).toArray();
  }

  async getBySession(sessionId: string): Promise<RunEvent[]> {
    return this.db.db().collection("run_events").find({ sessionId }).toArray();
  }
}
```
