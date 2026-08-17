# @vinhnt-sdk/session

Session runtime state, run event stores, durable reload and title generation for VNT Agent.

## Install

```bash
pnpm add @vinhnt-sdk/session
```

## Usage

```ts
import { InMemorySessionState, restoreRunFromStore, NullRunEventStore } from "@vinhnt-sdk/session";

const state = new InMemorySessionState();
state.pushMessage({ role: "user", content: "Hello" });

const restored = await restoreRunFromStore(store, sessionStore, runId);
```

## API

- `SessionRuntimeState` / `SessionRuntimeSnapshot` — runtime conversation state contract
- `InMemorySessionState` — default in-memory implementation
- `RunEventStore` / `SessionStore` (re-exported from `@vinhnt-sdk/schema`)
- `NullRunEventStore` / `NullSessionStore` — no-op stores
- `restoreRunFromStore` / `findActiveSessionIds` — durable run restore
- `InMemorySessionTree` / `SessionTree` — session tree tracking
- `ConversationCompactor` (re-exported from `@vinhnt-sdk/schema`)
- `createDefaultSessionTitleGenerator` — LLM-backed session title generation
