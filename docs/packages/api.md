# @vinhnt-sdk/api

> WebSocket and REST API contracts for agent communication.

**npm:** `npm install @vinhnt-sdk/api`  
**Size:** ~5 KB  
**Dependencies:** `zod` only (no internal dependencies)

---

## Overview

`api` provides shared Zod schemas for type-safe communication between agent servers and clients.

## Installation

```bash
npm install @vinhnt-sdk/api
```

## Exports

### WebSocket Events

```typescript
import {
  WsConnectSchema,
  WsHeartbeatSchema,
  WsRunEventSchema,
  WsMessageSchema,
  parseWsMessage,
  runEventToWs,
} from "@vinhnt-sdk/api";

// Parse incoming WebSocket message
const message = parseWsMessage(rawData);

// Convert run event to WebSocket format
const wsEvent = runEventToWs(runEvent);
```

### Webview

```typescript
import {
  WebviewAppendSchema,
  WebviewDoneSchema,
  WebviewErrorSchema,
  WebviewChatSchema,
} from "@vinhnt-sdk/api";
```

### REST API

```typescript
import {
  PaginationSchema,
  RunResultSchema,
  ErrorResponseSchema,
  CreateShareSchema,
  ShareResponseSchema,
} from "@vinhnt-sdk/api";
```

### Types

```typescript
import type {
  WsMessage,
  WsRunEvent,
  WebviewResponse,
  WebviewMessage,
  RunResult,
  ErrorResponse,
} from "@vinhnt-sdk/api";
```
