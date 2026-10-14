---
title: "@vinhnt-sdk/permission"
description: "Quy tắc permission và store phê duyệt"
lang: "vi"
type: "reference"
category: "API Reference"
version: "0.5.1"
sidebarLabel: "permission"
---

# @vinhnt-sdk/permission

Hệ thống permission để kiểm soát truy cập tool và quy trình phê duyệt.

## Exports

### PermissionChecker

Đánh giá quy tắc permission đối với các yêu cầu gọi tool. Trả về quyết định allow, deny hoặc ask.

```ts
const checker = new PermissionChecker(ruleset);
const result = checker.check(toolCall);
// { effect: "allow" } | { effect: "deny", reason: string } | { effect: "ask" }
```

| Phương thức | Mô tả |
| --- | --- |
| `check(toolCall)` | Đánh giá một lệnh gọi tool |
| `checkBatch(toolCalls)` | Đánh giá nhiều lệnh gọi tool |
| `addRule(rule)` | Thêm quy tắc tại thời điểm chạy |
| `removeRule(id)` | Xóa quy tắc theo ID |

### InMemoryApprovalStore

Lưu trữ trong bộ nhớ cho các yêu cầu phê duyệt đang chờ. Phù hợp cho triển khai đơn_instance.

```ts
const store = new InMemoryApprovalStore();
await store.create(request);
const approval = await store.get(requestId);
await store.resolve(requestId, decision);
```

## Types

### PermissionRule

Định nghĩa một quy tắc permission với action, resource và effect.

```ts
type PermissionRule = {
  id: string;
  action: string;        // ví dụ: "read", "write", "execute"
  resource: string;      // ví dụ: "file:*", "file:src/**"
  effect: PermissionEffect;
  metadata?: Record<string, unknown>;
};
```

### PermissionEffect

Quyết định effect cho quy tắc phù hợp.

```ts
type PermissionEffect = "allow" | "deny" | "ask" | string;
```

| Giá trị | Hành vi |
| --- | --- |
| `"allow"` | Tự động phê duyệt các yêu cầu phù hợp |
| `"deny"` | Chặn các yêu cầu phù hợp không có prompt |
| `"ask"` | Yêu cầu người dùng phê duyệt |
| Custom string | Hành vi mở rộng |

### PermissionMode

Chế độ phê duyệt cho một run — từ vựng security thuộc về SDK, ứng dụng không được sở hữu nó (P6.5).

```ts
type PermissionMode = "ask" | "edit" | "full" | string;
const KNOWN_PERMISSION_MODES: readonly PermissionMode[]; // ["ask", "edit", "full"]
```

| Giá trị | Hành vi |
| --- | --- |
| `"ask"` | Hỏi trước khi thực thi tool (mặc định fail-closed) |
| `"edit"` | Tự phê duyệt file edits; hỏi phần còn lại |
| `"full"` | Tự phê duyệt tất cả (destructive floor được nâng lên allow) |
| Custom string | Chế độ mở rộng do extension định nghĩa |

Validation và UI list phải dùng `KNOWN_PERMISSION_MODES` (tập known đóng); type là open union để chế độ mới thêm vào không breaking.

### PermissionRuleset

Tập hợp các quy tắc permission được đánh giá theo thứ tự.

```ts
type PermissionRuleset = {
  rules: PermissionRule[];
  defaultEffect?: PermissionEffect;
};
```

### ApprovalStore

Giao diện để lưu trữ các yêu cầu phê duyệt và quyết định.

```ts
type ApprovalStore = {
  create(request: ApprovalRequest): Promise<string>;
  get(id: string): Promise<ApprovalRequest | null>;
  resolve(id: string, decision: ApprovalDecision): Promise<void>;
  listPending(): Promise<ApprovalRequest[]>;
};
```

### ApprovalRequest

Đại diện cho một phê duyệt đang chờ cho lệnh gọi tool.

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

## Matching (Phù hợp)

### Wildcard Patterns (Mẫu wildcard)

Phù hợp resource hỗ trợ mẫu wildcard cho định nghĩa quy tắc linh hoạt.

```ts
// Phù hợp tất cả file
resource: "file:*"

// Phù hợp file trong thư mục src
resource: "file:src/**"

// Phù hợp phần mở rộng cụ thể
resource: "file:*.ts"
```

### Resource Matching (Phù hợp resource)

`PermissionChecker` đánh giá các quy tắc theo thứ tự. Quy tắc phù hợp đầu tiên xác định effect.

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

## Dependencies (Phụ thuộc)

- `schema` — định nghĩa type và validation chung
