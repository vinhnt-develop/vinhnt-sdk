# @vinhnt-sdk/store-drizzle

SQLite persistence for VNT Agent via Drizzle ORM.

## Install

```bash
pnpm add @vinhnt-sdk/store-drizzle
pnpm add better-sqlite3
```

## Usage

```typescript
import { DrizzleRunEventStore, DrizzleSessionStore } from "@vinhnt-sdk/store-drizzle";

const events = new DrizzleRunEventStore("./data.db");
const sessions = new DrizzleSessionStore("./data.db");
```
