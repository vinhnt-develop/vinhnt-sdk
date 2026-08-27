---
title: "Tool Permissions"
description: "Fine-grained permission control for tools"
lang: "en"
type: "guide"
category: "Guides"
sidebarPosition: 2
sidebarLabel: "Tool Permissions"
tags: [permissions, security, risk]
version: "0.1.3"
lastUpdated: "2026-08-26"
---

# Tool Permissions

Control what tools can do with permission rules.

## Permission Actions

Every tool call results in one of:

| Action | Description |
|--------|-------------|
| `allow` | Execute immediately |
| `ask` | Request user approval |
| `deny` | Block execution |

## Risk-Based Defaults

Set defaults by risk level:

```typescript
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  permissions: {
    permissionRiskDefaults: {
      read: "allow",        // Auto-approve all read tools
      write: "ask",         // Ask before writing
      destructive: "deny",  // Block destructive operations
      external: "ask",      // Ask before external calls
    },
  },
});
```

## Tool-Specific Rules

Override for specific tools:

```typescript
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  permissions: {
    globalPermissionRules: {
      // Allow git operations
      "git_status": "allow",
      "git_diff": "allow",
      "git_log": "allow",

      // Ask for dangerous git operations
      "git_commit": "ask",
      "git_push": "ask",

      // Deny destructive operations
      "delete_file": "deny",
      "drop_table": "deny",
    },
  },
});
```

## Category Rules

Group rules by category:

```typescript
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  permissions: {
    topLevelPermissionRules: {
      allow: [
        "read_file",
        "list_directory",
        "git_status",
        "git_diff",
      ],
      ask: [
        "write_file",
        "edit_file",
        "execute_command",
        "git_commit",
      ],
      deny: [
        "delete_file",
        "format_disk",
      ],
    },
  },
});
```

## Auto-Approval Mode

Skip approval for low-risk operations:

```typescript
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  permissions: {
    autoApprovalEnabled: true,
    permissionRiskDefaults: {
      read: "allow",
      write: "allow",
      destructive: "ask",
    },
  },
});
```

## External Directory Access

Control access outside workspace:

```typescript
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  permissions: {
    externalDirectoryAccess: false,  // Deny access outside workspace
  },
});
```

## Plugin-Based Permissions

Use plugins for dynamic permissions:

```typescript
import { definePlugin } from "@vinhnt-sdk/plugin";

const permissionPlugin = definePlugin(
  {
    id: "smart-permissions",
    name: "Smart Permissions",
    version: "0.1.0",
  },
  {
    hooks: {
      onPermissionAsk: async ({ permission, resource, reason }) => {
        // Auto-approve reads
        if (permission === "read") {
          return { reply: "always" };
        }

        // Ask for writes during business hours
        const hour = new Date().getHours();
        if (permission === "write" && hour >= 9 && hour <= 17) {
          return { reply: "always" };
        }

        // Default: ask once
        return { reply: "once" };
      },
    },
  }
);
```

## Complete Example

```typescript
import { AgentKernel } from "@vinhnt-sdk/core";
import { NullRunEventStore } from "@vinhnt-sdk/session";

const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  permissions: {
    // Risk defaults
    permissionRiskDefaults: {
      read: "allow",
      write: "ask",
      destructive: "deny",
    },

    // Tool-specific rules
    globalPermissionRules: {
      "shell": "ask",
      "git": "allow",
    },

    // Category rules
    topLevelPermissionRules: {
      allow: ["read_file", "list_directory"],
      ask: ["write_file", "execute_command"],
      deny: ["delete_file"],
    },

    // Other settings
    autoApprovalEnabled: false,
    externalDirectoryAccess: false,
  },
});
```

## Next Steps

- [Creating Tools](/guides/creating-tools) — Build tools with risk levels
- [Security](/guides/security) — Prompt injection protection
- [Creating Plugins](/guides/creating-plugins) — Dynamic permission plugins
