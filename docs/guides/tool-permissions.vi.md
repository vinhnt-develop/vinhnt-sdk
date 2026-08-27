---
title: "Tool Permissions"
description: "Kiểm soát permission chi tiết cho tools"
lang: "vi"
type: "guide"
category: "Guides"
sidebarPosition: 2
sidebarLabel: "Tool Permissions"
tags: [permissions, security, risk]
version: "0.1.3"
lastUpdated: "2026-08-26"
---

# Tool Permissions

Kiểm soát những gì tools có thể làm với permission rules.

## Permission Actions

Mỗi tool call sẽ có một trong các kết quả:

| Action | Mô tả |
|--------|-------|
| `allow` | Thực hiện ngay lập tức |
| `ask` | Yêu cầu user approval |
| `deny` | Chặn thực hiện |

## Risk-Based Defaults

Đặt mặc định theo risk level:

```typescript
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  permissions: {
    permissionRiskDefaults: {
      read: "allow",        // Tự approve tất cả read tools
      write: "ask",         // Hỏi trước khi write
      destructive: "deny",  // Chặn destructive operations
      external: "ask",      // Hỏi trước khi gọi external
    },
  },
});
```

## Tool-Specific Rules

Ghi đè cho tools cụ thể:

```typescript
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  permissions: {
    globalPermissionRules: {
      // Cho phép git operations
      "git_status": "allow",
      "git_diff": "allow",
      "git_log": "allow",

      // Hỏi cho git operations nguy hiểm
      "git_commit": "ask",
      "git_push": "ask",

      // Chặn destructive operations
      "delete_file": "deny",
      "drop_table": "deny",
    },
  },
});
```

## Category Rules

Nhóm rules theo category:

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

Bỏ qua approval cho low-risk operations:

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

Kiểm soát truy cập ngoài workspace:

```typescript
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  permissions: {
    externalDirectoryAccess: false,  // Chặn truy cập ngoài workspace
  },
});
```

## Plugin-Based Permissions

Sử dụng plugins cho dynamic permissions:

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
        // Tự approve reads
        if (permission === "read") {
          return { reply: "always" };
        }

        // Hỏi cho writes trong giờ làm việc
        const hour = new Date().getHours();
        if (permission === "write" && hour >= 9 && hour <= 17) {
          return { reply: "always" };
        }

        // Mặc định: hỏi một lần
        return { reply: "once" };
      },
    },
  }
);
```

## Ví Dụ Đầy Đủ

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

## Bước Tiếp Theo

- [Creating Tools](/guides/creating-tools) — Xây dựng tools với risk levels
- [Security](/guides/security) — Prompt injection protection
- [Creating Plugins](/guides/creating-plugins) — Dynamic permission plugins
