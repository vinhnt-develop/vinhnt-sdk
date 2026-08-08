# @vnt/api-contract

Shared Zod schemas for VNT Agent HTTP/WS/job API contracts.

## Install

```bash
# npm
npm install @vnt/api-contract

# pnpm (monorepo)
pnpm add @vnt/api-contract
```

## Quick Start

```typescript
import { WsConnectSchema, parseWsMessage, PaginationSchema } from '@vnt/api-contract';

// Validate WebSocket messages
const msg = parseWsMessage(rawData);

// Validate pagination params
const pagination = PaginationSchema.parse({ page: 1, limit: 20 });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `WsConnectSchema`, `WsHeartbeatSchema`, `WsRunEventSchema` | Zod schemas | WebSocket protocol schemas |
| `parseWsMessage`, `runEventToWs` | Function | WS message parsing and conversion |
| `WebviewAppendSchema`, `WebviewDoneSchema`, `WebviewErrorSchema` | Zod schemas | Webview event schemas |
| `WebviewChatSchema`, `WebviewReadySchema` | Zod schemas | Webview lifecycle schemas |
| `PaginationSchema` | Zod schema | API pagination parameters |
| `RunResultSchema`, `ErrorResponseSchema` | Zod schemas | API response schemas |
| `CreateShareSchema`, `ShareResponseSchema` | Zod schemas | Share link schemas |

## License

MIT
