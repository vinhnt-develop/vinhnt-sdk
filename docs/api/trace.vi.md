---
title: "@vinhnt-sdk/trace"
description: "Telemetry, timeline, chi phí"
lang: "vi"
type: "reference"
category: "API Reference"
version: "0.4.4"
sidebarLabel: "trace"
---

# @vinhnt-sdk/trace

Telemetry, ghi lại timeline và theo dõi chi phí cho việc thực thi agent. Cung cấp bộ xuất OTLP/HTTP tương thích OpenTelemetry cho distributed tracing.

## Xuất

### `SpanRecorder`

Ghi lại các span phân cấp. `startSpan` tự gán span mới làm con của span trước, trừ khi truyền `parentId` tường minh.

```ts
import { SpanRecorder } from "@vinhnt-sdk/trace";

const recorder = new SpanRecorder();
const span = recorder.startSpan("process-query", "internal");
try {
  const result = await doWork();
  recorder.endSpan(span, "ok");
  return result;
} catch (err) {
  recorder.endSpan(span, "error");
  throw err;
}
```

**Phương thức:**

| Phương thức | Mô tả |
| --- | --- |
| `startSpan(name, kind, parentId?)` | Bắt đầu span mới (tự gán cha) và trả về |
| `endSpan(span, status?)` | Đánh dấu span kết thúc (`"ok"` mặc định) |
| `getSpans()` | Lấy tất cả span đã ghi |
| `getSpanTree()` | Lấy cây span root → con |
| `getTotalDurationMs()` | Tổng thời lượng từ start đầu đến end cuối |

**Hàm liên quan:** `createSpan(name, kind, parentId?, traceId?)`, `endSpan(span, status?)`, `addSpanEvent(span, name, attributes?)`, `generateTraceId()`.

---

### `Timeline`

Ghi và truy vấn timeline thực thi. Kiểu sự kiện bị giới hạn theo từ vựng run-event chuẩn (`KnownRunEvent` từ `@vinhnt-sdk/schema`) — ví dụ `run.started`, `llm.request`, `tool.completed`, `run.completed`.

```ts
import { Timeline, buildTranscript } from "@vinhnt-sdk/trace";

const timeline = new Timeline();

timeline.record("llm.request", { step: 1, model: "gpt-4o" });

const entries = timeline.getEvents();
const llmCalls = timeline.getEventsByType("llm.request");
const recent = timeline.getEventsInRange(startMs, endMs);
const transcript = buildTranscript(timeline.getEvents());
```

**Phương thức:**

| Phương thức | Mô tả |
| --- | --- |
| `record(type, data)` | Ghi một sự kiện timeline |
| `getEvents()` | Lấy tất cả sự kiện |
| `getEventsByType(type)` | Lọc sự kiện theo kiểu chuẩn |
| `getEventsInRange(startMs, endMs)` | Lấy sự kiện trong khoảng thời gian |
| `count()` | Số sự kiện đã ghi |
| `getDurationMs()` | Thời lượng từ sự kiện đầu đến cuối |
| `export()` | Trả về mảng sự kiện thuần |
| `import(events)` | Nhập sự kiện (ví dụ phát lại từ đĩa) |

---

### `CostMeter`

Theo dõi sử dụng thực tế và chi phí phải trả. Khác với ước tính token heuristic — `CostMeter` ghi lại sử dụng thật với giá theo model (bảng mặc định: `DEFAULT_MODEL_PRICING`).

```ts
import { CostMeter } from "@vinhnt-sdk/trace";

const meter = new CostMeter();

const usage = meter.record(500, 200, "gpt-4o");
// { inputTokens: 500, outputTokens: 200, totalTokens: 700, costUsd: ... }

console.log(meter.getTotal().costUsd);
console.log(meter.getOperationCount());
```

**Phương thức:**

| Phương thức | Mô tả |
| --- | --- |
| `record(inputTokens, outputTokens, modelId?)` | Ghi một mục sử dụng, trả về `UsageStats` |
| `getTotal()` | `UsageStats` tổng qua các thao tác |
| `getOperationCount()` | Số thao tác đã ghi |
| `getOperations()` | Tất cả `UsageStats` từng thao tác |

**Hàm liên quan:** `calculateCost(inputTokens, outputTokens, pricing?)`, `calculateContextPressure(currentTokens, maxTokens, compactThreshold?)`.

---

### Xuất OTLP

```ts
import { createOtlpSpanExporter } from "@vinhnt-sdk/trace";

const exporter = createOtlpSpanExporter({
  endpoint: "http://localhost:4318/v1/traces",
  resourceAttributes: { "service.name": "vinhnt-agent" },
});
await exporter.export(recorder.getSpans());
await exporter.shutdown();
```

`createOtlpSpanExporter(config?)` đẩy span dạng OTLP/HTTP JSON. Endpoint phân giải từ `config.endpoint`, sau đó `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_ENDPOINT` (ném `ConfigurationError` nếu không có). Cũng xuất `resolveOtlpEndpoint`, `parseOtlpHeaders`, `mapSpanToOtlp`, `buildOtlpExportRequest`.

---

## Kiểu dữ liệu

### `Span`

```ts
interface Span {
  readonly id: string;
  readonly traceId: string | undefined;
  readonly parentId: string | undefined;
  readonly name: string;
  readonly kind: SpanKind;
  readonly startTimeMs: number;
  endTimeMs: number;
  status: SpanStatus;
  attributes: Record<string, unknown>;
  events: SpanEvent[];
}
```

### `SpanKind` / `SpanStatus`

```ts
type SpanKind = "internal" | "client" | "server" | "producer" | "consumer";
type SpanStatus = "ok" | "error" | "cancelled" | "timeout" | (string & {});
```

### `TimelineEvent`

```ts
interface TimelineEvent {
  readonly type: TimelineEventType; // KnownRunEvent["type"] (32 kiểu chuẩn)
  readonly timestampMs: number;
  readonly data: Record<string, unknown>;
  readonly seq: number; // đơn điệu trong phiên
}
```

### `TranscriptEntry`

```ts
interface TranscriptEntry {
  type: "user" | "assistant" | "tool_call" | "tool_result";
  content?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  timestampMs: number;
}
```

### `UsageStats` / `ModelPricing`

```ts
interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
}

interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}
```

### `ContextPressure`

```ts
interface ContextPressure {
  currentTokens: number;
  maxTokens: number;
  pressure: number; // 0.0 = rỗng, 1.0 = đầy
  shouldCompact: boolean;
  readonly metadata?: Record<string, unknown>;
}
```

## Xuất khác

- `ConsoleTelemetryProvider` — hiện thực `TelemetryProvider` in trace/metric ra console.
- `DEFAULT_MODEL_PRICING` — bảng giá mặc định `Record<string, ModelPricing>` (`MODEL_PRICING` là alias đã deprecated).

## Phụ thuộc

- `@vinhnt-sdk/schema` — kiểu run-event chuẩn (`KnownRunEvent`) và wire contracts.
