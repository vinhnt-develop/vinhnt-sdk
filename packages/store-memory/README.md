# @vinhnt-sdk/store-memory

In-memory persistence layer for VNT Agent.

## Install

```bash
pnpm add @vinhnt-sdk/store-memory
```

## Usage

```typescript
import { InMemoryRunEventStore, InMemorySessionStore } from "@vinhnt-sdk/store-memory";

const sessions = new InMemorySessionStore();
const events = new InMemoryRunEventStore(sessions);
```
