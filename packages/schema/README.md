# @vnt/schema

Shared Zod schemas and types for VNT Agent — tool definitions, event types, and ACP protocol.

## Install

```bash
# npm
npm install @vnt/schema

# pnpm (monorepo)
pnpm add @vnt/schema
```

## Quick Start

```typescript
import { RunEventSchema, ReadFileSchema, defineEvent } from '@vnt/schema';

// Validate tool input
const input = ReadFileSchema.parse({ filePath: './src/index.ts' });

// Define a typed event
const userJoined = defineEvent('user.joined', { userId: string });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `ReadFileSchema`, `WriteFileSchema`, `EditFileSchema`, ... | Zod schemas | Tool input validation schemas (22 tools) |
| `EventRegistry`, `defineEvent` | Function | Typed event definition and registry |
| `RunEvent`, `KnownRunEvent` | Type | Event types for run lifecycle |
| `AgentId`, `RunId`, `SessionId`, ... | Branded types | Type-safe branded identifiers |
| `VntError`, `AgentNotFoundError`, ... | Error classes | Typed error hierarchy |
| `SchemaVersionedBaseSchema`, `upcastEventToCurrent` | Function | Schema versioning with migration chain |
| `wildcardMatch` | Function | Wildcard pattern matching utility |

## Subpath Imports

```typescript
import { ReadFileSchema } from '@vnt/schema';               // main
import { WsConnectSchema } from '@vnt/schema/contracts/ws'; // deep import
```

## License

MIT
