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

The `handle.events()` method returns an async iterable of all events emitted during a run. This is the primary hook for building observability into your agent.

```ts
const handle = kernel.createRunHandle({ messages });

for await (const event of handle.events()) {
  console.log(`[${event.type}]`, event.data);
}
```

### Available Event Types

| Event Type | When Emitted | Key Data |
|------------|--------------|----------|
| `run.start` | Run begins | `sessionId`, `runId` |
| `llm.call` | Before LLM request | `model`, `messageCount` |
| `llm.response` | After LLM response | `model`, `tokens`, `duration` |
| `tool.call` | Before tool execution | `toolName`, `input` |
| `tool.result` | After tool execution | `toolName`, `output`, `duration` |
| `run.end` | Run completes | `sessionId`, `runId`, `status` |
| `error` | Error occurred | `error`, `phase` |

### Filtering Events

```ts
for await (const event of handle.events()) {
  if (event.type === "tool.call") {
    console.log(`Tool: ${event.data.toolName}`);
  }
  if (event.type === "error") {
    console.error(`Error in ${event.data.phase}:`, event.data.error);
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

Combine the logger and event listener for a complete audit trail:

```ts
class AuditLog {
  private logger: Logger;
  constructor(logger: Logger) { this.logger = logger; }

  async trackRun(handle: RunHandle) {
    for await (const event of handle.events()) {
      switch (event.type) {
        case "run.start":
          this.logger.info("Run started", { sessionId: event.data.sessionId, runId: event.data.runId });
          break;
        case "llm.call":
          this.logger.info("LLM requested", { model: event.data.model, messageCount: event.data.messageCount });
          break;
        case "tool.call":
          this.logger.info("Tool invoked", { toolName: event.data.toolName, input: event.data.input });
          break;
        case "tool.result":
          this.logger.info("Tool completed", { toolName: event.data.toolName, duration: event.data.duration });
          break;
        case "error":
          this.logger.error("Error occurred", { phase: event.data.phase, error: event.data.error });
          break;
        case "run.end":
          this.logger.info("Run completed", { sessionId: event.data.sessionId, status: event.data.status });
          break;
      }
    }
  }
}

const audit = new AuditLog(new FileLogger("./audit.log"));
await audit.trackRun(handle);
```

## OpenTelemetry SDK Integration

`Tracer` wraps OpenTelemetry. Configure it to export spans to any OTLP-compatible collector:

```ts
import { Tracer } from "@vinhnt-sdk/trace";

const tracer = new Tracer({
  serviceName: "vinhnt-agent",
  endpoint: "http://localhost:4318",
  exporters: "otlp",
  sampleRate: 0.5,
});
```

With this configuration, spans are automatically exported to your OpenTelemetry collector and can be viewed in tools like Jaeger, Zipkin, or Grafana Tempo.

## Tracked Events and Data

The following table summarizes what data is available at each event point:

| Event | Available Data |
|-------|---------------|
| `run.start` | `sessionId`, `runId`, `timestamp` |
| `llm.call` | `model`, `messageCount`, `systemPrompt` |
| `llm.response` | `model`, `inputTokens`, `outputTokens`, `duration` |
| `tool.call` | `toolName`, `input`, `risk` |
| `tool.result` | `toolName`, `output`, `duration`, `success` |
| `run.end` | `sessionId`, `runId`, `status`, `totalDuration` |
| `error` | `phase`, `error`, `recoverable` |

## Cost Tracking with CostMeter

Track real billable usage across providers and models:

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

console.log("Total cost:", meter.totalCost());
console.log("Total tokens:", meter.totalTokens());
console.log("Per-model breakdown:", meter.breakdown());
```

The `breakdown()` method returns a map grouped by model:

```ts
{
  "gpt-4": { cost: 0.15, tokens: 5000 },
  "gpt-3.5-turbo": { cost: 0.002, tokens: 12000 },
}
```

## Next Steps

- Review the [Persistence](/guides/persistence) guide for storing events durably
- Check the `@vinhnt-sdk/trace` API reference for full type definitions
- Explore the `@vinhnt-sdk/event` module for typed event definitions
