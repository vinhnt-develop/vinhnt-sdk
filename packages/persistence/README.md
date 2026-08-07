# @vnt/persistence

Persistence layer for VNT Agent — SQLite and PostgreSQL stores via Drizzle ORM.

## Install

```bash
# npm
npm install @vnt/persistence

# pnpm (monorepo)
pnpm add @vnt/persistence
```

## Quick Start

```typescript
import { createDb, DrizzleRunEventStore, DrizzleSessionStore } from '@vnt/persistence';

const db = createDb('./data/vnt.db');
const runStore = new DrizzleRunEventStore(db);
const sessionStore = new DrizzleSessionStore(db);
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `createDb` | Function | Create SQLite database connection |
| `createPgDb` | Function | Create PostgreSQL database connection |
| `DrizzleRunEventStore` | Class | Run event persistence (SQLite) |
| `DrizzleSessionStore` | Class | Session persistence (SQLite) |
| `DrizzleAgentStore` | Class | Agent config persistence (SQLite) |
| `DrizzlePermissionStore` | Class | Permission rules persistence (SQLite) |
| `DrizzleShareStore` | Class | Shared snapshots persistence (SQLite) |
| `DrizzlePg*` variants | Class | PostgreSQL equivalents for all stores |
| `applyMigrations`, `runSqliteMigrations` | Function | Migration runners |
| `pushSchema`, `pushPgSchema` | Function | Schema push utilities |

## License

MIT
