---
title: "Permissions"
description: "Control tool access with permission rules"
lang: "en"
type: "guide"
category: "Guides"
sidebarPosition: 7
---

# Permissions

vinhnt-sdk provides a fine-grained permission system that controls which tools can be invoked, under what conditions, and with what approval level. Permissions are evaluated before every tool execution.

## PermissionRule Structure

A `PermissionRule` defines a single access control entry:

```typescript
import type { PermissionRule } from "vinhnt-sdk";

const rule: PermissionRule = {
  action: "execute",
  resource: "tool:filesystem.*",
  effect: "allow",
  metadata: {
    description: "Allow all filesystem operations",
    source: "admin-config",
  },
};
```

| Field | Type | Description |
|-------|------|-------------|
| `action` | `string` | The operation to control (e.g., `execute`, `read`, `write`) |
| `resource` | `string` | Target resource pattern with optional wildcards |
| `effect` | `PermissionEffect` | Result of the rule match |
| `metadata` | `Record<string, unknown>` | Optional additional info |

## PermissionEffect Values

The `PermissionEffect` type accepts these values:

| Value | Behavior |
|-------|----------|
| `"allow"` | Silently permits the action |
| `"deny"` | Blocks the action and throws `PermissionDeniedError` |
| `"ask"` | Prompts the user for approval at runtime |
| Custom string | Plugin-defined effect handled by custom evaluators |

```typescript
type PermissionEffect = "allow" | "deny" | "ask" | (string & {});
```

## Wildcard Patterns

Resources support glob-style wildcards for pattern matching:

```typescript
const rules: PermissionRule[] = [
  { action: "execute", resource: "tool:http.*", effect: "allow" },
  { action: "execute", resource: "tool:db.query", effect: "ask" },
  { action: "execute", resource: "tool:admin.*", effect: "deny" },
  { action: "read", resource: "file:./secrets/**", effect: "deny" },
];
```

- `*` matches any single segment
- `**` matches any number of segments
- Exact strings match literally

## InMemoryApprovalStore

When a rule uses the `"ask"` effect, approval decisions are stored in an `ApprovalStore`. The SDK provides `InMemoryApprovalStore` for non-persistent scenarios:

```typescript
import { InMemoryApprovalStore } from "vinhnt-sdk";

const approvalStore = new InMemoryApprovalStore();

const kernel = new Kernel({
  permissions: { rules, approvalStore },
});
```

This store remembers approvals for the lifetime of the process. For durable approvals, implement the `ApprovalStore` interface with a database backend.

## PermissionGate Integration

`PermissionGate` wraps `StepExecutor` and evaluates rules before each tool call:

```typescript
import { PermissionGate, StepExecutor } from "vinhnt-sdk";

const executor = new StepExecutor({ kernel });
const gate = new PermissionGate({ rules, approvalStore });

const result = await gate.evaluate({
  action: "execute",
  resource: "tool:http.get",
});
// result.effect === "allow" or "deny" or triggers "ask" flow
```

Rules are evaluated top-to-bottom. The first matching rule determines the effect. If no rule matches, the default effect is `"deny"`.

## User Approval Flow

When a rule returns `"ask"`, the system invokes the configured approval handler:

```typescript
const kernel = new Kernel({
  permissions: {
    rules,
    approvalStore,
    onAsk: async (request) => {
      console.log(`Tool "${request.resource}" requests permission.`);
      const approved = await promptUser("Allow? (y/n)");
      return approved === "y";
    },
  },
});
```

If the user approves, the decision is cached in the `ApprovalStore`. Subsequent calls with the same resource skip the prompt.

## Common Permission Patterns

**Read-only agent:**

```typescript
const readOnlyRules: PermissionRule[] = [
  { action: "read", resource: "file:**", effect: "allow" },
  { action: "execute", resource: "tool:**", effect: "deny" },
];
```

**Prompt for dangerous operations:**

```typescript
const safeRules: PermissionRule[] = [
  { action: "execute", resource: "tool:http.*", effect: "allow" },
  { action: "execute", resource: "tool:db.*", effect: "ask" },
  { action: "execute", resource: "tool:admin.*", effect: "deny" },
];
```

**Environment-based rules:**

```typescript
const rules = process.env.NODE_ENV === "production"
  ? productionRules
  : developmentRules;
```
