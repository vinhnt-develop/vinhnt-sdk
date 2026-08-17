# @vinhnt-sdk/store-drizzle-pg

PostgreSQL persistence for VNT Agent via Drizzle ORM.

## Install

```bash
pnpm add @vinhnt-sdk/store-drizzle-pg
```

## Usage

```typescript
import { createPgDb, pushPgSchemaFromConnection, getPgPool, DrizzlePgRunEventStore, DrizzlePgSessionStore } from "@vinhnt-sdk/store-drizzle-pg";

connectionString = "postgres://user:pass@localhost:5432/vnt";

await pushPgSchemaFromConnection(connectionString);
const pool = getPgPool(connectionString);
const db = createPgDb(connectionString);

const events = new DrizzlePgRunEventStore(db);
const sessions = new DrizzlePgSessionStore(db);
```