---
title: "@vinhnt-sdk/guard"
description: "Circuit breaker, phát hiện vòng lặp, timeout công cụ"
lang: vi
type: "reference"
category: "API Reference"
sidebarLabel: guard
version: "0.1.3"
---

# @vinhnt-sdk/guard

Circuit breaker, phát hiện vòng lặp, và timeout công cụ cho thực thi agent resilent.

## Xuất (Exports)

### `CircuitBreaker`

Theo dõi số lỗi liên tiếp và mở circuit sau ngưỡng. Ngăn ngừa lỗi lan truyền trong các lệnh gọi công cụ lặp lại.

```ts
import { CircuitBreaker } from "@vinhnt-sdk/guard";

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 60000,
  halfOpenMaxAttempts: 3,
});

try {
  const result = await breaker.execute(async () => {
    return await riskyOperation();
  });
} catch (error) {
  if (error instanceof CircuitBreakerOpenError) {
    console.log("Circuit đang mở, thử lại sau");
  }
}
```

**Phương thức:**

- `execute(fn)` — Thực thi hàm qua circuit breaker. Ném `CircuitBreakerOpenError` khi circuit mở.
- `getState()` — Trả về trạng thái circuit hiện tại.
- `reset()` — Đặt lại thủ công circuit về trạng thái đóng.
- `getFailureCount()` — Trả về số lỗi liên tiếp hiện tại.

### `CircuitBreakerOpenError`

Lỗi bị ném khi circuit breaker mở. Lỗi này có thể retry — người gọi nên chờ và thử lại sau.

```ts
import { CircuitBreakerOpenError } from "@vinhnt-sdk/guard";

try {
  await breaker.execute(fn);
} catch (e) {
  if (e instanceof CircuitBreakerOpenError) {
    // Có thể retry — chờ và thử lại
    console.log(`Circuit mở đến ${e.retryAfter}`);
  }
}
```

**Thuộc tính:**

- `retryAfter` — Dấu thời gian (ms) khi circuit có thể chuyển sang half-open

### `LoopDetector`

Phát hiện các lệnh gọi công cụ lặp lại có thể chỉ ra vòng lặp agent. Theo dõi mẫu cuộc gọi và đánh dấu sự lặp lại đáng ngờ.

```ts
import { LoopDetector } from "@vinhnt-sdk/guard";

const detector = new LoopDetector({
  maxRepetitions: 3,
  windowMs: 60000,
  patternSize: 5,
});

detector.recordCall({ tool: "read_file", params: { path: "/foo" } });
detector.recordCall({ tool: "read_file", params: { path: "/foo" } });
detector.recordCall({ tool: "read_file", params: { path: "/foo" } });

if (detector.isLoopDetected()) {
  console.log("Phát hiện vòng lặp agent!");
}
```

**Phương thức:**

- `recordCall(call)` — Ghi lại lệnh gọi công cụ với metadata
- `isLoopDetected()` — Kiểm tra xem mẫu vòng lặp có bị phát hiện
- `getLoopInfo()` — Trả về chi tiết về vòng lặp đã phát hiện
- `reset()` — Xóa tất cả các lệnh gọi đã ghi lại

### `ToolTimeout`

Bọc thực thi công cụ với timeout. Tự động hủy nếu thực thi vượt quá giới hạn.

```ts
import { ToolTimeout } from "@vinhnt-sdk/guard";

const timeout = new ToolTimeout(10000); // 10 giây

const result = await timeout.execute(async (signal) => {
  return await longRunningTool(params, { abortSignal: signal });
});
```

**Phương thức:**

- `execute(fn)` — Thực thi hàm với timeout. Ném `ToolTimeoutError` khi hết thời gian.
- `getRemainingTime()` — Trả về thời gian còn lại (ms)

### `ToolTimeoutError`

Lỗi bị ném khi thực thi công cụ vượt quá timeout. Lỗi này không thể retry — retry ngay lập tức có thể sẽ timeout lại.

```ts
import { ToolTimeoutError } from "@vinhnt-sdk/guard";

try {
  await timeout.execute(fn);
} catch (e) {
  if (e instanceof ToolTimeoutError) {
    // Không thể retry
    console.log(`Hết thời gian sau ${e.timeoutMs}ms`);
  }
}
```

**Thuộc tính:**

- `timeoutMs` — Timeout đã bị vượt quá

## Kiểu dữ liệu

### `CircuitState`

```ts
type CircuitState = "closed" | "open" | "half_open";
```

- `closed` — Hoạt động bình thường, lệnh gọi đi qua
- `open` — Circuit đã.trip, lệnh gọi bị từ chối
- `half_open` — Kiểm tra phục hồi, cho phép số lượng lệnh gọi giới hạn

### `CircuitBreakerConfig`

```ts
interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  halfOpenMaxAttempts?: number;
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}
```

### `LoopDetectorConfig`

```ts
interface LoopDetectorConfig {
  maxRepetitions: number;
  windowMs: number;
  patternSize?: number;
  onLoopDetected?: (info: LoopInfo) => void;
}
```

## Mẫu Sử dụng

### Kết hợp các Guard

```ts
import { CircuitBreaker, LoopDetector, ToolTimeout } from "@vinhnt-sdk/guard";

const breaker = new CircuitBreaker({ failureThreshold: 3, recoveryTimeout: 30000 });
const detector = new LoopDetector({ maxRepetitions: 5, windowMs: 60000 });
const timeout = new ToolTimeout(15000);

async function safeToolCall(toolFn) {
  if (detector.isLoopDetected()) throw new Error("Phát hiện vòng lặp");
  return breaker.execute(() => timeout.execute(toolFn));
}
```

## Phụ thuộc

- `@vinhnt-sdk/schema` — Validation và định nghĩa kiểu JSON Schema
