---
title: "Observability"
description: "Logging, tracing, and monitoring"
lang: "en"
type: "guide"
category: "Guides"
sidebarPosition: 6
---

# Observability

Observability is how you understand what your agent is doing at runtime. This guide covers event listening, custom loggers and tracers, audit logging, OpenTelemetry integration, and cost tracking.

## Run Event Listening

There are two complementary event surfaces, and they carry different vocabularies:

- **`kernel.streamRun(prompt, ctx, sessionId)`** returns `{ runId, events }`, where `events` is an `AsyncIterable<KnownRunEvent>` — the **full run telemetry stream** (steps, tools, LLM requests/responses, tokens, permissions, failovers, …). This is the primary hook for observability.
- **`handle.events()`** yields the run **lifecycle** events only (`agent.started`, `agent.completed`, `agent.error`) — use it (or `handle.onEvent(handler)`) to coordinate start/finish/error handling, not for telemetry.

```ts
const { runId, events } = kernel.streamRun(prompt, ctx, sessionId);

for await (const event of events) {
  console.log(`[${runId}] [${event.type}]`, event.data);
}
```

Lifecycle coordination on an existing handle:

```ts
for await (const event of handle.events()) {
  switch (event.type) {
    case "agent.started":   console.log("Run started", event.runId); break;
    case "agent.completed": console.log("Completed", event.status); break;
    case "agent.error":     console.error("Failed", event.error); break;
  }
}
```

To observe **all runs** across the kernel, pass an `EventBus` in the kernel config and subscribe with `eventBus.subscribeAll(...)` — every run event is published with `aggregateId = runId`.

### Available Run Event Types

Selected members of the `KnownRunEvent` union (`@vinhnt-sdk/schema`):

| Event Type | When Emitted | Key Data |
|------------|--------------|----------|
| `run.started` | Run begins | `prompt`, `model`, `provider`, `agentName?`, `agentId?` |
| `step.started` / `step.completed` | Each agent step | `turn`, `step` |
| `llm.request` | Before LLM request | `step`, `model`, `provider?`, `params` |
| `llm.response` | After LLM response | `content`, `toolCalls?`, `usage` (input/output/reasoning/cache tokens), `durationMs` |
| `token.streamed` | Streaming text chunk | `content`, `step` |
| `token.counted` | Final usage per request | `inputTokens`, `outputTokens`, `model`, `provider`, `step` |
| `tool.invoked` | Before tool execution | `toolId`, `toolName`, `input`, `decision?`, `risk?`, `source?` |
| `tool.completed` / `tool.failed` | After tool execution | `toolId`, `toolName`, `output?` / `error?`, `durationMs?` |
| `permission.requested` / `permission.replied` | Approval flow | `requestId`, `toolName`, `resource` / `reply` |
| `llm.failover` | Provider failover | `fromProvider`, `fromModel`, `toProvider`, `toModel`, `reason` |
| `context.compressed` | Context compression | `originalCount`, `compressedCount`, `summary?` |
| `run.completed` | Run ends | `status`, `totalSteps`, `durationMs?`, `stopReason?` |

### Filtering Events

```ts
const { events } = kernel.streamRun(prompt, ctx, sessionId);

for await (const event of events) {
  if (event.type === "tool.invoked") {
    console.log(`Tool: ${event.data.toolName}`);
  }
  if (event.type === "step.failed") {
    console.error(`Step ${event.data.step} failed:`, event.data.reason);
  }
}
```

## Custom Logger

Implement the `Logger` interface to direct output wherever you need it:

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

## Custom Tracer

Implement the `Tracer` interface for custom span tracking:

```ts
interface Tracer {
  startSpan(name: string, attributes?: Record<string, unknown>): Span;
  withSpan<T>(name: string, fn: () => Promise<T>, attributes?: Record<string, unknown>): Promise<T>;
  shutdown(): Promise<void>;
}
```

### Building a Custom Tracer

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
    console.log(`[TRACER] Flushed ${this.spans.length} spans`);
    this.spans = [];
  }
}
```

## AuditLog Implementation

Combine the logger with the `streamRun` event stream for a complete audit trail:

```ts
class AuditLog {
  private logger: Logger;
  constructor(logger: Logger) { this.logger = logger; }

  async trackRun(events: AsyncIterable<KnownRunEvent>) {
    for await (const event of events) {
      switch (event.type) {
        case "run.started":
          this.logger.info("Run started", { runId: event.runId, model: event.data.model, provider: event.data.provider });
          break;
        case "llm.request":
          this.logger.info("LLM requested", { model: event.data.model, step: event.data.step });
          break;
        case "tool.invoked":
          this.logger.info("Tool invoked", { toolName: event.data.toolName, input: event.data.input });
          break;
        case "tool.completed":
          this.logger.info("Tool completed", { toolName: event.data.toolName, durationMs: event.data.durationMs });
          break;
        case "step.failed":
          this.logger.error("Step failed", { step: event.data.step, reason: event.data.reason });
          break;
        case "run.completed":
          this.logger.info("Run completed", { status: event.data.status, totalSteps: event.data.totalSteps });
          break;
      }
    }
  }
}

const audit = new AuditLog(new FileLogger("./audit.log"));
const { events } = kernel.streamRun(prompt, ctx, sessionId);
await audit.trackRun(events);
```

## OpenTelemetry SDK Integration

`SpanRecorder` + `createOtlpSpanExporter` post spans to any OTLP/HTTP-compatible collector:

```ts
import { SpanRecorder, createOtlpSpanExporter } from "@vinhnt-sdk/trace";

const recorder = new SpanRecorder();
const span = recorder.startSpan("agent.run", "internal");
// ... do work ...
recorder.endSpan(span, "ok");

const exporter = createOtlpSpanExporter({
  endpoint: "http://localhost:4318/v1/traces",
  resourceAttributes: { "service.name": "vinhnt-agent" },
});
await exporter.export(recorder.getSpans());
await exporter.shutdown();
```

The endpoint may also come from `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` or `OTEL_EXPORTER_OTLP_ENDPOINT` (config takes precedence). Exported spans can be viewed in tools like Jaeger, Zipkin, or Grafana Tempo.

## Tracked Events and Data

The following table summarizes what data is available at each event point:

| Event | Available Data |
|-------|---------------|
| `run.started` | `prompt`, `model`, `provider`, `agentName?`, `agentId?` |
| `llm.request` | `step`, `model`, `provider?`, `params` (temperature, maxTokens, …) |
| `llm.response` | `content`, `toolCalls?`, `usage` (inputTokens, outputTokens), `durationMs` |
| `token.streamed` | `content`, `step` |
| `tool.invoked` | `toolId`, `toolName`, `input`, `risk?`, `decision?`, `source?` |
| `tool.completed` | `toolId`, `toolName`, `output`, `durationMs?`, `risk?` |
| `run.completed` | `status`, `totalSteps`, `durationMs?`, `inputTokens?`, `outputTokens?`, `error?` |

## Cost Tracking with CostMeter

Track real billable usage across providers and models:

```ts
import { CostMeter } from "@vinhnt-sdk/trace";

// Pricing is looked up per model from DEFAULT_MODEL_PRICING.
// Pass a custom table to extend: new CostMeter({ ...DEFAULT_MODEL_PRICING, "my-model": { inputPer1M, outputPer1M } })
const meter = new CostMeter();

const { events } = kernel.streamRun(prompt, ctx, sessionId);

for await (const event of events) {
  if (event.type === "llm.response") {
    const { usage, model } = event.data;
    meter.record(usage.inputTokens, usage.outputTokens, model);
  }
}

const total = meter.getTotal();
console.log("Total cost (USD):", total.costUsd);
console.log("Total tokens:", total.totalTokens);
console.log("Per-request breakdown:", meter.getOperations());
```

The `getOperations()` method returns the recorded per-request usage stats (`inputTokens`, `outputTokens`, `totalTokens`, `costUsd`) for building your own per-model breakdown:

```ts
[
  { inputTokens: 4000, outputTokens: 1000, totalTokens: 5000, costUsd: 0.15 },
  { inputTokens: 11000, outputTokens: 1000, totalTokens: 12000, costUsd: 0.002 },
]
```

## Next Steps

- Review the [Persistence](/guides/persistence) guide for storing events durably
- Check the `@vinhnt-sdk/trace` API reference for full type definitions
- Explore the `@vinhnt-sdk/event` module for typed event definitions
