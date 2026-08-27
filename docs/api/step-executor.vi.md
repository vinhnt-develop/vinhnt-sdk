---
title: "@vinhnt-sdk/step-executor"
description: "Hạt nhân thực thi và tự sửa lỗi"
lang: "vi"
type: "reference"
category: "API Reference"
version: "0.1.3"
sidebarLabel: "step-executor"
---

# @vinhnt-sdk/step-executor

Hạt nhân thực thi điều phối các bước agent, phân phối tool và tự sửa lỗi.

## Exports

### StepExecutor

Trình thực thi cốt lõi chạy các bước agent với phân phối tool và thực thi permission.

```ts
const executor = new StepExecutor(config);
const result = await executor.execute(step, context);
```

| Phương thức | Mô tả |
| --- | --- |
| `execute(step, context)` | Thực thi một bước agent |
| `executeBatch(steps, context)` | Thực thi nhiều bước tuần tự |
| `cancel(runId)` | Hủy một run đang hoạt động |
| `getRunState(runId)` | Lấy trạng thái run hiện tại |

### RunState

Theo dõi trạng thái của một run đang hoạt động qua vòng đời.

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

| Trạng thái | Mô tả |
| --- | --- |
| `"running"` | Đang thực thi bước |
| `"paused"` | Thực thi bị tạm dừng (ví dụ: chờ phê duyệt) |
| `"completed"` | Tất cả bước hoàn thành thành công |
| `"failed"` | Thực thi bị terminates với lỗi |

### SelfCorrection

Xử lý tự động thử lại và sửa lỗi dựa trên model khi thực thi tool thất bại.

```ts
const corrector = new SelfCorrection(config);
const corrected = await corrector.attempt(toolCall, error);
```

| Phương thức | Mô tả |
| --- | --- |
| `attempt(toolCall, error)` | Thử sửa lệnh gọi tool thất bại |
| `canRetry(error)` | Kiểm tra xem lỗi có thể thử lại không |
| `getRetryCount(toolCallId)` | Lấy số lần thử lại cho lệnh gọi tool |

### PathPolicy

Thực thi chính sách truy cập đường dẫn file cho thực thi tool.

```ts
const policy = new PathPolicy(rules);
const allowed = policy.isAllowed("/src/index.ts", "write");
```

| Phương thức | Mô tả |
| --- | --- |
| `isAllowed(path, action)` | Kiểm tra xem truy cập đường dẫn có được phép không |
| `addRule(rule)` | Thêm quy tắc chính sách đường dẫn |
| `removeRule(pattern)` | Xóa quy tắc chính sách đường dẫn |

### PermissionGate

Thực thi permission trước khi thực thi tool. Tích hợp với `@vinhnt-sdk/permission`.

```ts
const gate = new PermissionGate(checker, approvalStore);
const decision = await gate.evaluate(toolCall);
```

| Phương thức | Mô tả |
| --- | --- |
| `evaluate(toolCall)` | Đánh giá permission cho lệnh gọi tool |
| `requestApproval(toolCall)` | Yêu cầu người dùng phê duyệt |
| `getPendingApprovals()` | Liệt kê các yêu cầu phê duyệt đang chờ |

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

## Dependencies (Phụ thuộc)

| Gói | Mục đích |
| --- | --- |
| `schema` | Định nghĩa type và validation chung |
| `llm` | Tích hợp mô hình ngôn ngữ cho tự sửa lỗi |
| `tools` | Định nghĩa và handler tool |
| `sandbox` | Môi trường thực thi cách ly |
| `guard` | Rào cản an toàn |
| `session` | Quản lý trạng thái session |
| `permission` | Quy tắc permission và phê duyệt |
