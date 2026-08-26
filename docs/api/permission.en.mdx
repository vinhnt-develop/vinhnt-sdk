---
title: "@vinhnt-sdk/permission"
description: "Permission rules and approval stores"
lang: "en"
type: "reference"
category: "API Reference"
version: "0.1.3"
sidebarLabel: "permission"
---

# @vinhnt-sdk/permission

Permission system for controlling tool access and approval workflows.

## Exports

### PermissionChecker

Evaluates permission rules against tool call requests. Returns allow, deny, or ask decisions.

```ts
const checker = new PermissionChecker(ruleset);
const result = checker.check(toolCall);
// { effect: "allow" } | { effect: "deny", reason: string } | { effect: "ask" }
```

| Method | Description |
| --- | --- |
| `check(toolCall)` | Evaluate a single tool call |
| `checkBatch(toolCalls)` | Evaluate multiple tool calls |
| `addRule(rule)` | Add a rule at runtime |
| `removeRule(id)` | Remove a rule by ID |

### InMemoryApprovalStore

In-memory storage for pending approval requests. Suitable for single-instance deployments.

```ts
const store = new InMemoryApprovalStore();
await store.create(request);
const approval = await store.get(requestId);
await store.resolve(requestId, decision);
```

## Types

### PermissionRule

Defines a single permission rule with action, resource, and effect.

```ts
type PermissionRule = {
  id: string;
  action: string;        // e.g., "read", "write", "execute"
  resource: string;      // e.g., "file:*", "file:src/**"
  effect: PermissionEffect;
  metadata?: Record<string, unknown>;
};
```

### PermissionEffect

The decision effect for a matched rule.

```ts
type PermissionEffect = "allow" | "deny" | "ask" | string;
```

| Value | Behavior |
| --- | --- |
| `"allow"` | Automatically approve matching requests |
| `"deny"` | Block matching requests without prompt |
| `"ask"` | Prompt user for approval |
| Custom string | Extension-defined behavior |

### PermissionRuleset

Collection of permission rules evaluated in order.

```ts
type PermissionRuleset = {
  rules: PermissionRule[];
  defaultEffect?: PermissionEffect;
};
```

### ApprovalStore

Interface for persisting approval requests and decisions.

```ts
type ApprovalStore = {
  create(request: ApprovalRequest): Promise<string>;
  get(id: string): Promise<ApprovalRequest | null>;
  resolve(id: string, decision: ApprovalDecision): Promise<void>;
  listPending(): Promise<ApprovalRequest[]>;
};
```

### ApprovalRequest

Represents a pending approval for a tool call.

```ts
type ApprovalRequest = {
  id: string;
  toolCall: ToolCall;
  sessionId: string;
  reason?: string;
  createdAt: Date;
  resolvedAt?: Date;
  decision?: ApprovalDecision;
};
```

## Matching

### Wildcard Patterns

Resource matching supports wildcard patterns for flexible rule definitions.

```ts
// Match all files
resource: "file:*"

// Match files in src directory
resource: "file:src/**"

// Match specific extension
resource: "file:*.ts"
```

### Resource Matching

The `PermissionChecker` evaluates rules in order. First matching rule determines the effect.

```ts
const ruleset: PermissionRuleset = {
  rules: [
    { id: "1", action: "read", resource: "file:src/**", effect: "allow" },
    { id: "2", action: "write", resource: "file:src/**", effect: "ask" },
    { id: "3", action: "*", resource: "file:*.env", effect: "deny" },
  ],
  defaultEffect: "ask",
};
```

## Dependencies

- `schema` — shared type definitions and validation
