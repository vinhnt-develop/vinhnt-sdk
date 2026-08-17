# @vinhnt-sdk/tool-saga

Saga tracking for tool execution in VNT Agent.

Records each tool call per step, lets you register a compensating action per
tool, and rolls back a step (or the whole run) in reverse order. Zero-dependency
kernel primitive.

```typescript
import { ToolSaga } from "@vinhnt-sdk/tool-saga";

const saga = new ToolSaga();
saga.record({ toolId: "t1", toolName: "read_file", input: {}, output: "…", timestamp: Date.now(), step: 1 });
saga.registerCompensation("t1", { entry: /* … */, compensate: async () => { /* undo */ } });

await saga.rollbackStep(1); // runs compensations in reverse order
```

## Features

- `record` / `getEntries` — entries grouped by step, newest step first when listing all.
- `registerCompensation` — pair a tool call with an undo action.
- `rollbackStep` / `rollbackAll` — reverse-order compensation with a 5s per-action timeout.
- `clear` — reset saga state (e.g. between runs).