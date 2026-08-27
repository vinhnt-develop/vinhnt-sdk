---
title: "@vinhnt-sdk/trace"
description: "Telemetry, timeline, chi phí"
lang: "vi"
type: "reference"
category: "API Reference"
version: "0.1.3"
sidebarLabel: "trace"
---

# @vinhnt-sdk/trace

Telemetry, ghi lại timeline và theo dõi chi phí cho việc thực thi agent. Tích hợp OpenTelemetry để tracing phân tán.

## Xuất

### `Tracer`

Theo dõi thực thi agent với các span phân cấp.

```ts
import { Tracer } from "@vinhnt-sdk/trace";

const tracer = new Tracer({ serviceName: "my-agent" });

const span = tracer.startSpan("process-query");
try {
  const result = await doWork();
  span.setStatus({ code: "OK" });
  return result;
} catch (err) {
  span.setStatus({ code: "ERROR", message: err.message });
  throw err;
} finally {
  span.end();
}
```

**Phương thức:**

| Phương thức | Mô tả |
| --- | --- |
| `startSpan(name, attributes?)` | Bắt đầu span mới và trả về |
| `withSpan(name, fn, attributes?)` | Thực thi hàm trong ngữ cảnh span |
| `getContext()` | Lấy ngữ cảnh span hiện tại |
| `shutdown()` | Flush span đang chờ và tắt |

---

### `Timeline`

Ghi lại và phát lại timeline thực thi để gỡ lỗi và phân tích.

```ts
import { Timeline } from "@vinhnt-sdk/trace";

const timeline = new Timeline();

timeline.record({
  timestamp: Date.now(),
  event: "llm.call",
  data: { model: "gpt-4", tokens: 150 },
});

const entries = timeline.getEntries();
const filtered = timeline.getEntries({ event: "llm.call" });
```

**Phương thức:**

| Phương thức | Mô tả |
| --- | --- |
| `record(entry)` | Ghi lại một mục timeline |
| `getEntries(filter?)` | Lấy các mục, có thể lọc |
| `clear()` | Xóa tất cả các mục đã ghi |
| `toJSON()` | Serialization timeline thành JSON |
| `replay(onEntry?)` | Phát lại các mục, gọi callback cho từng mục |

---

### `CostMeter`

Theo dõi sử dụng thực tế và chi phí. Khác với `TokenMeter` trong `@vinhnt-sdk/llm` chỉ ước tính — `CostMeter` ghi lại chi phí thực tế.

```ts
import { CostMeter } from "@vinhnt-sdk/trace";

const meter = new CostMeter();

meter.record({
  provider: "openai",
  model: "gpt-4",
  inputTokens: 500,
  outputTokens: 200,
  costUsd: 0.032,
  timestamp: Date.now(),
});

console.log(meter.totalCost()); // 0.032
console.log(meter.totalTokens()); // 700
console.log(meter.breakdown()); // nhóm theo model
```

**Phương thức:**

| Phương thức | Mô tả |
| --- | --- |
| `record(costRecord)` | Ghi lại một mục chi phí |
| `totalCost()` | Lấy tổng chi phí bằng USD |
| `totalTokens()` | Lấy tổng số token |
| `breakdown()` | Chi phí nhóm theo model |
| `reset()` | Đặt lại tất cả bộ đếm |

---

## Kiểu dữ liệu

### `Span`

```ts
interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  status: SpanStatus;
  attributes?: Record<string, unknown>;
}
```

### `SpanStatus`

```ts
interface SpanStatus {
  code: "OK" | "ERROR" | "UNSET";
  message?: string;
}
```

### `TimelineEntry`

```ts
interface TimelineEntry {
  timestamp: number;
  event: string;
  data?: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
}
```

### `CostRecord`

```ts
interface CostRecord {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

### `TelemetryConfig`

```ts
interface TelemetryConfig {
  serviceName: string;
  endpoint?: string;
  headers?: Record<string, string>;
  sampleRate?: number;
  exporters?: "console" | "otlp" | "custom";
}
```

## Tích hợp OpenTelemetry

`Tracer` bọc API tracer của OpenTelemetry. Đặt `endpoint` trong `TelemetryConfig` để xuất span đến bộ thu OTLP:

```ts
const tracer = new Tracer({
  serviceName: "vinhnt-agent",
  endpoint: "http://localhost:4318",
  exporters: "otlp",
  sampleRate: 0.5,
});
```

## Phụ thuộc

- `@vinhnt-sdk/schema` — dùng để xác thực kiểu của cấu hình và bản ghi.
