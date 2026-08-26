---
title: "Quyền hạn"
description: "Kiểm soát truy cập công cụ bằng quy tắc quyền"
lang: "vi"
type: "guide"
category: "Guides"
sidebarPosition: 7
---

# Quyền hạn

vinhnt-sdk cung cấp hệ thống quyền chi tiết để kiểm soát công cụ nào được gọi, trong điều kiện nào và ở mức độ phê duyệt nào. Quyền được đánh giá trước mỗi lần thực thi công cụ.

## Cấu trúc PermissionRule

`PermissionRule` định nghĩa một mục kiểm soát truy cập:

```typescript
import type { PermissionRule } from "vinhnt-sdk";

const rule: PermissionRule = {
  action: "execute",
  resource: "tool:filesystem.*",
  effect: "allow",
  metadata: {
    description: "Cho phép tất cả thao tác filesystem",
    source: "admin-config",
  },
};
```

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `action` | `string` | Thao tác cần kiểm soát (ví dụ: `execute`, `read`, `write`) |
| `resource` | `string` | Mẫu tài nguyên đích với wildcard tùy chọn |
| `effect` | `PermissionEffect` | Kết quả của việc khớp quy tắc |
| `metadata` | `Record<string, unknown>` | Thông tin bổ sung tùy chọn |

## Các giá trị PermissionEffect

Kiểu `PermissionEffect` chấp nhận các giá trị sau:

| Giá trị | Hành vi |
|---------|---------|
| `"allow"` | Cho phép hành động một cách im lặng |
| `"deny"` | Chặn hành động và ném lỗi `PermissionDeniedError` |
| `"ask"` | Yêu cầu người dùng phê duyệt tại thời điểm chạy |
| Chuỗi tùy chỉnh | Hiệu ứng do plugin xác định, xử lý bởi evaluator tùy chỉnh |

```typescript
type PermissionEffect = "allow" | "deny" | "ask" | (string & {});
```

## Mẫu Wildcard

Tài nguyên hỗ trợ wildcard kiểu glob để khớp mẫu:

```typescript
const rules: PermissionRule[] = [
  { action: "execute", resource: "tool:http.*", effect: "allow" },
  { action: "execute", resource: "tool:db.query", effect: "ask" },
  { action: "execute", resource: "tool:admin.*", effect: "deny" },
  { action: "read", resource: "file:./secrets/**", effect: "deny" },
];
```

- `*` khớp một phân đoạn bất kỳ
- `**` khớp nhiều phân đoạn bất kỳ
- Chuỗi chính xác khớp theo nghĩa đen

## InMemoryApprovalStore

Khi quy tắc sử dụng hiệu ứng `"ask"`, quyết định phê duyệt được lưu trong `ApprovalStore`. SDK cung cấp `InMemoryApprovalStore` cho trường hợp không cần lưu trữ:

```typescript
import { InMemoryApprovalStore } from "vinhnt-sdk";

const approvalStore = new InMemoryApprovalStore();

const kernel = new Kernel({
  permissions: { rules, approvalStore },
});
```

Kho này nhớ quyết định phê duyệt trong suốt vòng đời tiến trình. Để phê duyệt bền vững, hãy triển khai giao diện `ApprovalStore` với backend cơ sở dữ liệu.

## Tích hợp PermissionGate

`PermissionGate` bọc `StepExecutor` và đánh giá quy tắc trước mỗi lệnh gọi công cụ:

```typescript
import { PermissionGate, StepExecutor } from "vinhnt-sdk";

const executor = new StepExecutor({ kernel });
const gate = new PermissionGate({ rules, approvalStore });

const result = await gate.evaluate({
  action: "execute",
  resource: "tool:http.get",
});
// result.effect === "allow" hoặc "deny" hoặc kích hoạt luồng "ask"
```

Quy tắc được đánh giá theo thứ tự trên xuống dưới. Quy tắc khớp đầu tiên xác định hiệu ứng. Nếu không có quy tắc nào khớp, hiệu ứng mặc định là `"deny"`.

## Luồng phê duyệt người dùng

Khi quy tắc trả về `"ask"`, hệ thống gọi handler phê duyệt đã cấu hình:

```typescript
const kernel = new Kernel({
  permissions: {
    rules,
    approvalStore,
    onAsk: async (request) => {
      console.log(`Công cụ "${request.resource}" yêu cầu quyền.`);
      const approved = await promptUser("Cho phép? (y/n)");
      return approved === "y";
    },
  },
});
```

Nếu người dùng chấp thuận, quyết định được lưu trong `ApprovalStore`. Các lệnh gọi tiếp theo với cùng tài nguyên sẽ bỏ qua prompt.

## Các mẫu quyền phổ biến

**Agent chỉ đọc:**

```typescript
const readOnlyRules: PermissionRule[] = [
  { action: "read", resource: "file:**", effect: "allow" },
  { action: "execute", resource: "tool:**", effect: "deny" },
];
```

**Yêu cầu phê duyệt cho thao tác nguy hiểm:**

```typescript
const safeRules: PermissionRule[] = [
  { action: "execute", resource: "tool:http.*", effect: "allow" },
  { action: "execute", resource: "tool:db.*", effect: "ask" },
  { action: "execute", resource: "tool:admin.*", effect: "deny" },
];
```

**Quy tắc dựa trên môi trường:**

```typescript
const rules = process.env.NODE_ENV === "production"
  ? productionRules
  : developmentRules;
```
