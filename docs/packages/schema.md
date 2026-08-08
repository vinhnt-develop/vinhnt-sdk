# @vinhnt-sdk/schema

> Foundational Zod schemas, branded IDs, event types, and error classes.

**npm:** `npm install @vinhnt-sdk/schema`  
**Size:** ~44 KB  
**Dependencies:** `zod` only (no internal dependencies)

---

## Overview

`schema` is the leaf node of the dependency tree. Every other package imports types and schemas from here. It defines the canonical type system for:

- Runs, sessions, and messages
- Agents and their configurations
- Tools and tool calls
- Permissions and approvals
- Events and event schemas
- Error types

## Installation

```bash
npm install @vinhnt-sdk/schema
```

## Exports

### Branded IDs

Type-safe IDs that prevent mixing up different entity types:

```typescript
import type { RunId, SessionId, AgentId, ToolCallId } from "@vinhnt-sdk/schema";

// These are branded types — can't accidentally pass a SessionId where a RunId is expected
const runId: RunId = createRunId("run-123");
const sessionId: SessionId = createSessionId("session-456");
```

| ID Type | Description |
|---------|-------------|
| `RunId` | Unique run identifier |
| `SessionId` | Unique session identifier |
| `AgentId` | Unique agent identifier |
| `ToolCallId` | Unique tool call identifier |
| `MessageId` | Unique message identifier |
| `TraceId` | Distributed trace identifier |
| `RequestId` | Request identifier |
| `WorkspaceId` | Workspace identifier |

### ID Guards and Asserters

```typescript
import { isRunId, assertRunId } from "@vinhnt-sdk/schema";

// Guard — returns boolean
if (isRunId(someId)) {
  // someId is RunId
}

// Asserter — throws if invalid
assertRunId(someId); // throws AgentValidationError if not a RunId
```

### Error Classes

```typescript
import {
  VntError,
  AgentNotFoundError,
  ToolExecutionError,
  RunTimeoutError,
} from "@vinhnt-sdk/schema";

// All errors extend VntError
try {
  await agent.run(prompt);
} catch (error) {
  if (error instanceof RunTimeoutError) {
    console.log("Run timed out:", error.runId);
  } else if (error instanceof ToolExecutionError) {
    console.log("Tool failed:", error.toolName, error.cause);
  }
}
```

| Error | Description |
|-------|-------------|
| `VntError` | Base error class |
| `AgentNotFoundError` | Agent ID not in registry |
| `AgentValidationError` | Invalid agent config |
| `AgentPermissionDenied` | Agent lacks permission |
| `ToolNotFoundError` | Tool name not in registry |
| `ToolExecutionError` | Tool execution failed |
| `ToolPermissionDenied` | Tool blocked by permission gate |
| `RunNotFoundError` | Run ID not found |
| `RunAbortedError` | Run was aborted |
| `RunTimeoutError` | Run exceeded time limit |

### Run Events

```typescript
import type { RunEvent, RunStartedData, ToolInvokedData } from "@vinhnt-sdk/schema";

// Events are emitted throughout the run lifecycle
function handleEvent(event: RunEvent) {
  switch (event.type) {
    case "run.started":
      console.log("Run started:", event.data.runId);
      break;
    case "tool.invoked":
      console.log("Tool called:", event.data.toolName);
      break;
    case "run.completed":
      console.log("Run completed:", event.data.result);
      break;
  }
}
```

### Domain Types

```typescript
import type {
  AgentConfig,
  AgentProfile,
  Session,
  Message,
  PermissionRule,
  SkillManifest,
} from "@vinhnt-sdk/schema";
```

### Zod Tool Schemas

Pre-defined Zod schemas for common tool inputs:

```typescript
import {
  ReadFileSchema,
  WriteFileSchema,
  ExecuteCommandSchema,
  WebFetchSchema,
} from "@vinhnt-sdk/schema/tool";

// Use directly in defineTool()
const readFileTool = defineTool({
  name: "read_file",
  input: ReadFileSchema,
  execute: async (input) => {
    // input.path is typed as string
  },
});
```

### Event System

```typescript
import { defineEvent, EventRegistry } from "@vinhnt-sdk/schema";

// Define custom events
const MyEvent = defineEvent("my.event", z.object({
  value: z.string(),
}));

// Register with event system
const registry = new EventRegistry();
registry.register(MyEvent);
```

### Utilities

```typescript
import { wildcardMatch, ok, fail } from "@vinhnt-sdk/schema";

// Wildcard matching for permission patterns
wildcardMatch("file_read", "file_*");   // true
wildcardMatch("git_commit", "file_*");  // false

// Result helpers
const result = ok({ data: "success" });  // { ok: true, data: "success" }
const error = fail(new Error("oops"));   // { ok: false, error: Error }
```

## Sub-exports

```typescript
import { /* ... */ } from "@vinhnt-sdk/schema/contracts";
import { /* ... */ } from "@vinhnt-sdk/schema/types";
import { /* ... */ } from "@vinhnt-sdk/schema/tool";
import { /* ... */ } from "@vinhnt-sdk/schema/wildcard";
```
