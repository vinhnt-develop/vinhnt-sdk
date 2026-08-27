---
title: "@vinhnt-sdk/step-executor"
description: "Execution kernel and self-correction"
lang: "en"
type: "reference"
category: "API Reference"
version: "0.1.3"
sidebarLabel: "step-executor"
---

# @vinhnt-sdk/step-executor

Execution kernel that orchestrates agent steps, tool dispatch, and self-correction.

## Exports

### StepExecutor

Core executor that runs agent steps with tool dispatch and permission enforcement.

```ts
const executor = new StepExecutor(config);
const result = await executor.execute(step, context);
```

| Method | Description |
| --- | --- |
| `execute(step, context)` | Execute a single agent step |
| `executeBatch(steps, context)` | Execute multiple steps sequentially |
| `cancel(runId)` | Cancel an active run |
| `getRunState(runId)` | Get current run state |

### RunState

Tracks the state of an active run through its lifecycle.

```ts
type RunState = {
  id: string;
  status: "running" | "paused" | "completed" | "failed";
  startedAt: Date;
  completedAt?: Date;
  error?: Error;
  stepsExecuted: number;
};
```

| Status | Description |
| --- | --- |
| `"running"` | Step execution in progress |
| `"paused"` | Execution paused (e.g., waiting for approval) |
| `"completed"` | All steps finished successfully |
| `"failed"` | Execution terminated with error |

### SelfCorrection

Handles automatic retry and model-based correction when tool execution fails.

```ts
const corrector = new SelfCorrection(config);
const corrected = await corrector.attempt(toolCall, error);
```

| Method | Description |
| --- | --- |
| `attempt(toolCall, error)` | Try to correct a failed tool call |
| `canRetry(error)` | Check if error is retryable |
| `getRetryCount(toolCallId)` | Get retry count for a tool call |

### PathPolicy

Enforces file path access policies for tool execution.

```ts
const policy = new PathPolicy(rules);
const allowed = policy.isAllowed("/src/index.ts", "write");
```

| Method | Description |
| --- | --- |
| `isAllowed(path, action)` | Check if path access is permitted |
| `addRule(rule)` | Add a path policy rule |
| `removeRule(pattern)` | Remove a path policy rule |

### PermissionGate

Enforces permissions before tool execution. Integrates with `@vinhnt-sdk/permission`.

```ts
const gate = new PermissionGate(checker, approvalStore);
const decision = await gate.evaluate(toolCall);
```

| Method | Description |
| --- | --- |
| `evaluate(toolCall)` | Evaluate permission for a tool call |
| `requestApproval(toolCall)` | Request user approval |
| `getPendingApprovals()` | List pending approval requests |

## Types

### StepExecutorConfig

```ts
type StepExecutorConfig = {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  selfCorrection?: boolean;
  pathPolicy?: PathPolicy;
  permissionGate?: PermissionGate;
};
```

### StepResult

```ts
type StepResult = {
  stepId: string;
  success: boolean;
  output?: unknown;
  error?: Error;
  toolCalls: ToolCallResult[];
  duration: number;
};
```

### ToolContextBuilder

```ts
type ToolContextBuilder = {
  build(step: Step, session: Session): ToolContext;
  registerTool(name: string, handler: ToolHandler): void;
  getTools(): Map<string, ToolHandler>;
};
```

## Dependencies

| Package | Purpose |
| --- | --- |
| `schema` | Shared type definitions and validation |
| `llm` | Language model integration for self-correction |
| `tools` | Tool definitions and handlers |
| `sandbox` | Isolated execution environment |
| `guard` | Safety guardrails |
| `session` | Session state management |
| `permission` | Permission rules and approval |
