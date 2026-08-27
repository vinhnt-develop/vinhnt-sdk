---
title: "@vinhnt-sdk/trace"
description: "Telemetry, timeline, cost tracking"
lang: "en"
type: "reference"
category: "API Reference"
version: "0.1.3"
sidebarLabel: "trace"
---

# @vinhnt-sdk/trace

Telemetry, timeline recording, and cost tracking for agent execution. Provides OpenTelemetry integration for distributed tracing.

## Exports

### `Tracer`

Trace agent execution with hierarchical spans.

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

**Methods:**

| Method | Description |
| --- | --- |
| `startSpan(name, attributes?)` | Start a new span and return it |
| `withSpan(name, fn, attributes?)` | Execute a function within a span context |
| `getContext()` | Get current active span context |
| `shutdown()` | Flush pending spans and shut down |

---

### `Timeline`

Record and replay execution timeline for debugging and analysis.

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

**Methods:**

| Method | Description |
| --- | --- |
| `record(entry)` | Record a timeline entry |
| `getEntries(filter?)` | Get entries, optionally filtered |
| `clear()` | Clear all recorded entries |
| `toJSON()` | Serialize timeline to JSON |
| `replay(onEntry?)` | Replay entries, calling callback for each |

---

### `CostMeter`

Track actual usage and cost. This differs from `TokenMeter` in `@vinhnt-sdk/llm` which uses heuristic estimates — `CostMeter` records real billable usage.

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
console.log(meter.breakdown()); // grouped by model
```

**Methods:**

| Method | Description |
| --- | --- |
| `record(costRecord)` | Record a cost entry |
| `totalCost()` | Get total cost in USD |
| `totalTokens()` | Get total token count |
| `breakdown()` | Get cost grouped by model |
| `reset()` | Reset all counters |

---

## Types

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

## OpenTelemetry Integration

`Tracer` wraps OpenTelemetry's tracer API. Set the `endpoint` in `TelemetryConfig` to export spans to an OTLP-compatible collector:

```ts
const tracer = new Tracer({
  serviceName: "vinhnt-agent",
  endpoint: "http://localhost:4318",
  exporters: "otlp",
  sampleRate: 0.5,
});
```

## Dependencies

- `@vinhnt-sdk/schema` — used for type validation of configuration and records.
