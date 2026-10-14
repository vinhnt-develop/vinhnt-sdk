---
title: "Quan Sát"
description: "Logging, tracing và giám sát"
lang: "vi"
type: "guide"
category: "Guides"
sidebarPosition: 6
---

# Quan Sát

Quan sát là cách bạn hiểu agent đang làm gì tại thời điểm chạy. Hướng dẫn này đề cập đến việc lắng nghe sự kiện, logger và tracer tùy chỉnh, nhật ký kiểm tra, tích hợp OpenTelemetry và theo dõi chi phí.

## Lắng Nghe Sự Kiện Run

Có hai bề mặt sự kiện bổ sung cho nhau, mỗi bề mặt dùng một từ vựng khác nhau:

- **`kernel.streamRun(prompt, ctx, sessionId)`** trả về `{ runId, events }`, trong đó `events` là `AsyncIterable<KnownRunEvent>` — **luồng quan sát run đầy đủ** (step, tool, yêu cầu/phản hồi LLM, token, quyền duyệt, failover, …). Đây là hook chính để quan sát.
- **`handle.events()`** chỉ phát các sự kiện **vòng đời** của run (`agent.started`, `agent.completed`, `agent.error`) — dùng nó (hoặc `handle.onEvent(handler)`) để điều phối bắt đầu/kết thúc/lỗi, không dùng cho quan sát chi tiết.

```ts
const { runId, events } = kernel.streamRun(prompt, ctx, sessionId);

for await (const event of events) {
  console.log(`[${runId}] [${event.type}]`, event.data);
}
```

Điều phối vòng đời trên handle đã có:

```ts
for await (const event of handle.events()) {
  switch (event.type) {
    case "agent.started":   console.log("Bắt đầu run", event.runId); break;
    case "agent.completed": console.log("Hoàn thành", event.status); break;
    case "agent.error":     console.error("Thất bại", event.error); break;
  }
}
```

Để quan sát **tất cả run** trên kernel, truyền một `EventBus` trong kernel config và đăng ký bằng `eventBus.subscribeAll(...)` — mọi sự kiện run được phát với `aggregateId = runId`.

### Các Loại Sự Kiện Run

Các thành viên tiêu biểu của union `KnownRunEvent` (`@vinhnt-sdk/schema`):

| Loại Sự Kiện | Thời Điểm Phát | Dữ Liệu Chính |
|---------------|----------------|----------------|
| `run.started` | Bắt đầu chạy | `prompt`, `model`, `provider`, `agentName?`, `agentId?` |
| `step.started` / `step.completed` | Mỗi agent step | `turn`, `step` |
| `llm.request` | Trước yêu cầu LLM | `step`, `model`, `provider?`, `params` |
| `llm.response` | Sau phản hồi LLM | `content`, `toolCalls?`, `usage` (token input/output/reasoning/cache), `durationMs` |
| `token.streamed` | Chunk văn bản streaming | `content`, `step` |
| `token.counted` | Usage cuối mỗi request | `inputTokens`, `outputTokens`, `model`, `provider`, `step` |
| `tool.invoked` | Trước thực thi công cụ | `toolId`, `toolName`, `input`, `decision?`, `risk?`, `source?` |
| `tool.completed` / `tool.failed` | Sau thực thi công cụ | `toolId`, `toolName`, `output?` / `error?`, `durationMs?` |
| `permission.requested` / `permission.replied` | Luồng phê duyệt | `requestId`, `toolName`, `resource` / `reply` |
| `llm.failover` | Failover nhà cung cấp | `fromProvider`, `fromModel`, `toProvider`, `toModel`, `reason` |
| `context.compressed` | Nén ngữ cảnh | `originalCount`, `compressedCount`, `summary?` |
| `run.completed` | Kết thúc chạy | `status`, `totalSteps`, `durationMs?`, `stopReason?` |

### Lọc Sự Kiện

```ts
const { events } = kernel.streamRun(prompt, ctx, sessionId);

for await (const event of events) {
  if (event.type === "tool.invoked") {
    console.log(`Công cụ: ${event.data.toolName}`);
  }
  if (event.type === "step.failed") {
    console.error(`Step ${event.data.step} thất bại:`, event.data.reason);
  }
}
```

## Logger Tùy Chỉnh

Triển khai giao diện `Logger` để định hướng output đến bất kỳ đâu bạn cần:

```ts
interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
}

class FileLogger implements Logger {
  private stream: WriteStream;
  constructor(filePath: string) {
    this.stream = createWriteStream(filePath, { flags: "a" });
  }
  info(msg: string, data?: Record<string, unknown>) { this.write("INFO", msg, data); }
  warn(msg: string, data?: Record<string, unknown>) { this.write("WARN", msg, data); }
  error(msg: string, data?: Record<string, unknown>) { this.write("ERROR", msg, data); }
  debug(msg: string, data?: Record<string, unknown>) { this.write("DEBUG", msg, data); }
  private write(level: string, message: string, data?: Record<string, unknown>) {
    this.stream.write(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...data }) + "\n");
  }
}
```

## Tracer Tùy Chỉnh

Triển khai giao diện `Tracer` để theo dõi span tùy chỉnh:

```ts
interface Tracer {
  startSpan(name: string, attributes?: Record<string, unknown>): Span;
  withSpan<T>(name: string, fn: () => Promise<T>, attributes?: Record<string, unknown>): Promise<T>;
  shutdown(): Promise<void>;
}
```

### Xây Dựng Tracer Tùy Chỉnh

```ts
class ConsoleTracer implements Tracer {
  private spans: Span[] = [];

  startSpan(name: string, attributes?: Record<string, unknown>): Span {
    const span: Span = {
      traceId: crypto.randomUUID(),
      spanId: crypto.randomUUID(),
      name,
      startTime: Date.now(),
      status: { code: "UNSET" },
      attributes,
    };
    this.spans.push(span);
    console.log(`[SPAN START] ${name} (${span.spanId})`);
    return span;
  }

  async withSpan<T>(name: string, fn: () => Promise<T>, attributes?: Record<string, unknown>): Promise<T> {
    const span = this.startSpan(name, attributes);
    try {
      const result = await fn();
      span.status = { code: "OK" };
      return result;
    } catch (err) {
      span.status = { code: "ERROR", message: (err as Error).message };
      throw err;
    } finally {
      span.endTime = Date.now();
      console.log(`[SPAN END] ${name} (${span.endTime - span.startTime}ms)`);
    }
  }

  async shutdown() {
    console.log(`[TRACER] Đã đẩy ${this.spans.length} span`);
    this.spans = [];
  }
}
```

## Triển Khai AuditLog

Kết hợp logger với luồng sự kiện `streamRun` để tạo nhật ký kiểm tra hoàn chỉnh:

```ts
class AuditLog {
  private logger: Logger;
  constructor(logger: Logger) { this.logger = logger; }

  async trackRun(events: AsyncIterable<KnownRunEvent>) {
    for await (const event of events) {
      switch (event.type) {
        case "run.started":
          this.logger.info("Bắt đầu chạy", { runId: event.runId, model: event.data.model, provider: event.data.provider });
          break;
        case "llm.request":
          this.logger.info("Yêu cầu LLM", { model: event.data.model, step: event.data.step });
          break;
        case "tool.invoked":
          this.logger.info("Gọi công cụ", { toolName: event.data.toolName, input: event.data.input });
          break;
        case "tool.completed":
          this.logger.info("Công cụ hoàn thành", { toolName: event.data.toolName, durationMs: event.data.durationMs });
          break;
        case "step.failed":
          this.logger.error("Step thất bại", { step: event.data.step, reason: event.data.reason });
          break;
        case "run.completed":
          this.logger.info("Hoàn thành chạy", { status: event.data.status, totalSteps: event.data.totalSteps });
          break;
      }
    }
  }
}

const audit = new AuditLog(new FileLogger("./audit.log"));
const { events } = kernel.streamRun(prompt, ctx, sessionId);
await audit.trackRun(events);
```

## Tích Hợp OpenTelemetry SDK

`SpanRecorder` + `createOtlpSpanExporter` đẩy span đến bất kỳ OTLP/HTTP collector tương thích nào:

```ts
import { SpanRecorder, createOtlpSpanExporter } from "@vinhnt-sdk/trace";

const recorder = new SpanRecorder();
const span = recorder.startSpan("agent.run", "internal");
// ... làm việc ...
recorder.endSpan(span, "ok");

const exporter = createOtlpSpanExporter({
  endpoint: "http://localhost:4318/v1/traces",
  resourceAttributes: { "service.name": "vinhnt-agent" },
});
await exporter.export(recorder.getSpans());
await exporter.shutdown();
```

Endpoint cũng có thể lấy từ `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` hoặc `OTEL_EXPORTER_OTLP_ENDPOINT` (config ưu tiên hơn). Span đã xuất có thể xem trong các công cụ như Jaeger, Zipkin hoặc Grafana Tempo.

## Bảng Dữ Liệu Sự Kiện Được Theo Dõi

Bảng dưới đây tóm tắt dữ liệu có sẵn tại mỗi điểm sự kiện:

| Sự Kiện | Dữ Liệu Có Sẵn |
|---------|-----------------|
| `run.started` | `prompt`, `model`, `provider`, `agentName?`, `agentId?` |
| `llm.request` | `step`, `model`, `provider?`, `params` (temperature, maxTokens, …) |
| `llm.response` | `content`, `toolCalls?`, `usage` (inputTokens, outputTokens), `durationMs` |
| `token.streamed` | `content`, `step` |
| `tool.invoked` | `toolId`, `toolName`, `input`, `risk?`, `decision?`, `source?` |
| `tool.completed` | `toolId`, `toolName`, `output`, `durationMs?`, `risk?` |
| `run.completed` | `status`, `totalSteps`, `durationMs?`, `inputTokens?`, `outputTokens?`, `error?` |

## Theo Dõi Chi Phí Với CostMeter

Theo dõi sử dụng thực tế tính phí trên các nhà cung cấp và mô hình:

```ts
import { CostMeter } from "@vinhnt-sdk/trace";

// Giá được tra theo mô hình từ DEFAULT_MODEL_PRICING.
// Truyền bảng tùy chỉnh để mở rộng: new CostMeter({ ...DEFAULT_MODEL_PRICING, "my-model": { inputPer1M, outputPer1M } })
const meter = new CostMeter();

const { events } = kernel.streamRun(prompt, ctx, sessionId);

for await (const event of events) {
  if (event.type === "llm.response") {
    const { usage, model } = event.data;
    meter.record(usage.inputTokens, usage.outputTokens, model);
  }
}

const total = meter.getTotal();
console.log("Tổng chi phí (USD):", total.costUsd);
console.log("Tổng token:", total.totalTokens);
console.log("Phân theo từng request:", meter.getOperations());
```

Phương thức `getOperations()` trả về usage stats từng request (`inputTokens`, `outputTokens`, `totalTokens`, `costUsd`) để bạn tự nhóm theo mô hình:

```ts
[
  { inputTokens: 4000, outputTokens: 1000, totalTokens: 5000, costUsd: 0.15 },
  { inputTokens: 11000, outputTokens: 1000, totalTokens: 12000, costUsd: 0.002 },
]
```

## Bước Tiếp Theo

- Xem hướng dẫn [Lưu Trữ Dữ Liệu](/guides/persistence) để lưu sự kiện bền vững
- Xem tham chiếu API `@vinhnt-sdk/trace` cho đầy đủ định nghĩa kiểu
- Khám phá module `@vinhnt-sdk/event` cho định nghĩa sự kiện type-safe
