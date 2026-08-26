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

Phương thức `handle.events()` trả về một async iterable chứa tất cả sự kiện được phát trong một lần chạy. Đây là hook chính để xây dựng khả năng quan sát cho agent của bạn.

```ts
const handle = kernel.createRunHandle({ messages });

for await (const event of handle.events()) {
  console.log(`[${event.type}]`, event.data);
}
```

### Các Loại Sự Kiện Có Sẵn

| Loại Sự Kiện | Thời Điểm Phát | Dữ Liệu Chính |
|---------------|----------------|----------------|
| `run.start` | Bắt đầu chạy | `sessionId`, `runId` |
| `llm.call` | Trước yêu cầu LLM | `model`, `messageCount` |
| `llm.response` | Sau phản hồi LLM | `model`, `tokens`, `duration` |
| `tool.call` | Trước thực thi công cụ | `toolName`, `input` |
| `tool.result` | Sau thực thi công cụ | `toolName`, `output`, `duration` |
| `run.end` | Hoàn thành chạy | `sessionId`, `runId`, `status` |
| `error` | Xảy ra lỗi | `error`, `phase` |

### Lọc Sự Kiện

```ts
for await (const event of handle.events()) {
  if (event.type === "tool.call") {
    console.log(`Công cụ: ${event.data.toolName}`);
  }
  if (event.type === "error") {
    console.error(`Lỗi tại ${event.data.phase}:`, event.data.error);
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

Kết hợp logger và event listener để tạo nhật ký kiểm tra hoàn chỉnh:

```ts
class AuditLog {
  private logger: Logger;
  constructor(logger: Logger) { this.logger = logger; }

  async trackRun(handle: RunHandle) {
    for await (const event of handle.events()) {
      switch (event.type) {
        case "run.start":
          this.logger.info("Bắt đầu chạy", { sessionId: event.data.sessionId, runId: event.data.runId });
          break;
        case "llm.call":
          this.logger.info("Yêu cầu LLM", { model: event.data.model, messageCount: event.data.messageCount });
          break;
        case "tool.call":
          this.logger.info("Gọi công cụ", { toolName: event.data.toolName, input: event.data.input });
          break;
        case "tool.result":
          this.logger.info("Công cụ hoàn thành", { toolName: event.data.toolName, duration: event.data.duration });
          break;
        case "error":
          this.logger.error("Xảy ra lỗi", { phase: event.data.phase, error: event.data.error });
          break;
        case "run.end":
          this.logger.info("Hoàn thành chạy", { sessionId: event.data.sessionId, status: event.data.status });
          break;
      }
    }
  }
}

const audit = new AuditLog(new FileLogger("./audit.log"));
await audit.trackRun(handle);
```

## Tích Hợp OpenTelemetry SDK

`Tracer` bọc OpenTelemetry. Cấu hình nó để xuất span đến bất kỳ OTLP collector tương thích nào:

```ts
import { Tracer } from "@vinhnt-sdk/trace";

const tracer = new Tracer({
  serviceName: "vinhnt-agent",
  endpoint: "http://localhost:4318",
  exporters: "otlp",
  sampleRate: 0.5,
});
```

Với cấu hình này, span được tự động xuất đến OpenTelemetry collector của bạn và có thể xem trong các công cụ như Jaeger, Zipkin hoặc Grafana Tempo.

## Bảng Dữ Liệu Sự Kiện Được Theo Dõi

Bảng dưới đây tóm tắt dữ liệu có sẵn tại mỗi điểm sự kiện:

| Sự Kiện | Dữ Liệu Có Sẵn |
|---------|-----------------|
| `run.start` | `sessionId`, `runId`, `timestamp` |
| `llm.call` | `model`, `messageCount`, `systemPrompt` |
| `llm.response` | `model`, `inputTokens`, `outputTokens`, `duration` |
| `tool.call` | `toolName`, `input`, `risk` |
| `tool.result` | `toolName`, `output`, `duration`, `success` |
| `run.end` | `sessionId`, `runId`, `status`, `totalDuration` |
| `error` | `phase`, `error`, `recoverable` |

## Theo Dõi Chi Phí Với CostMeter

Theo dõi sử dụng thực tế tính phí trên các nhà cung cấp và mô hình:

```ts
import { CostMeter } from "@vinhnt-sdk/trace";

const meter = new CostMeter();

for await (const event of handle.events()) {
  if (event.type === "llm.response") {
    meter.record({
      provider: event.data.provider,
      model: event.data.model,
      inputTokens: event.data.inputTokens,
      outputTokens: event.data.outputTokens,
      costUsd: calculateCost(event.data),
      timestamp: Date.now(),
    });
  }
}

console.log("Tổng chi phí:", meter.totalCost());
console.log("Tổng token:", meter.totalTokens());
console.log("Phân theo mô hình:", meter.breakdown());
```

Phương thức `breakdown()` trả về bản đồ được nhóm theo mô hình:

```ts
{
  "gpt-4": { cost: 0.15, tokens: 5000 },
  "gpt-3.5-turbo": { cost: 0.002, tokens: 12000 },
}
```

## Bước Tiếp Theo

- Xem hướng dẫn [Lưu Trữ Dữ Liệu](/guides/persistence) để lưu sự kiện bền vững
- Xem tham chiếu API `@vinhnt-sdk/trace` cho đầy đủ định nghĩa kiểu
- Khám phá module `@vinhnt-sdk/event` cho định nghĩa sự kiện type-safe
