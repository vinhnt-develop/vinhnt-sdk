---
title: "@vinhnt-sdk/trace"
description: "Telemetry, timeline, cost tracking"
lang: "en"
type: "reference"
category: "API Reference"
version: "0.4.4"
sidebarLabel: "trace"
---

# @vinhnt-sdk/trace

Telemetry, timeline recording, and cost tracking for agent execution. Provides an OpenTelemetry-compatible OTLP/HTTP exporter for distributed tracing.

## Exports

### `SpanRecorder`

Records hierarchical spans. `startSpan` parents each new span under the previous one unless an explicit `parentId` is given.

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

**Methods:**

| Method | Description |
| --- | --- |
| `startSpan(name, kind, parentId?)` | Start a new span (auto-parented) and return it |
| `endSpan(span, status?)` | Mark a span finished (`"ok"` by default) |
| `getSpans()` | Get all recorded spans |
| `getSpanTree()` | Get the root → children span tree |
| `getTotalDurationMs()` | Total duration from first start to last end |

**Related functions:** `createSpan(name, kind, parentId?, traceId?)`, `endSpan(span, status?)`, `addSpanEvent(span, name, attributes?)`, `generateTraceId()`.

---

### `Timeline`

Record and query the execution timeline. Event types are constrained to the canonical run-event vocabulary (`KnownRunEvent` from `@vinhnt-sdk/schema`) — e.g. `run.started`, `llm.request`, `tool.completed`, `run.completed`.

```ts
import { Timeline, buildTranscript } from "@vinhnt-sdk/trace";

const timeline = new Timeline();

timeline.record("llm.request", { step: 1, model: "gpt-4o" });

const entries = timeline.getEvents();
const llmCalls = timeline.getEventsByType("llm.request");
const recent = timeline.getEventsInRange(startMs, endMs);
const transcript = buildTranscript(timeline.getEvents());
```

**Methods:**

| Method | Description |
| --- | --- |
| `record(type, data)` | Record a timeline event |
| `getEvents()` | Get all events |
| `getEventsByType(type)` | Get events filtered by canonical type |
| `getEventsInRange(startMs, endMs)` | Get events in a time range |
| `count()` | Number of recorded events |
| `getDurationMs()` | Duration from first to last event |
| `export()` | Return events as a plain array |
| `import(events)` | Import events (e.g. replay from disk) |

---

### `CostMeter`

Track real billable usage and cost. Different from heuristic token estimates — `CostMeter` records actual usage with per-model pricing (default table: `DEFAULT_MODEL_PRICING`).

```ts
import { CostMeter } from "@vinhnt-sdk/trace";

const meter = new CostMeter();

const usage = meter.record(500, 200, "gpt-4o");
// { inputTokens: 500, outputTokens: 200, totalTokens: 700, costUsd: ... }

console.log(meter.getTotal().costUsd);
console.log(meter.getOperationCount());
```

**Methods:**

| Method | Description |
| --- | --- |
| `record(inputTokens, outputTokens, modelId?)` | Record a usage event, returns `UsageStats` |
| `getTotal()` | Total `UsageStats` across operations |
| `getOperationCount()` | Number of recorded operations |
| `getOperations()` | All per-operation `UsageStats` |

**Related functions:** `calculateCost(inputTokens, outputTokens, pricing?)`, `calculateContextPressure(currentTokens, maxTokens, compactThreshold?)`.

---

### OTLP Export

```ts
import { createOtlpSpanExporter } from "@vinhnt-sdk/trace";

const exporter = createOtlpSpanExporter({
  endpoint: "http://localhost:4318/v1/traces",
  resourceAttributes: { "service.name": "vinhnt-agent" },
});
await exporter.export(recorder.getSpans());
await exporter.shutdown();
```

`createOtlpSpanExporter(config?)` posts spans as OTLP/HTTP JSON. The endpoint resolves from `config.endpoint`, then `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_ENDPOINT` (throws `ConfigurationError` if none). Also exports `resolveOtlpEndpoint`, `parseOtlpHeaders`, `mapSpanToOtlp`, `buildOtlpExportRequest`.

---

## Types

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
  readonly type: TimelineEventType; // KnownRunEvent["type"] (32 canonical names)
  readonly timestampMs: number;
  readonly data: Record<string, unknown>;
  readonly seq: number; // monotonic within a session
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
  pressure: number; // 0.0 = empty, 1.0 = full
  shouldCompact: boolean;
  readonly metadata?: Record<string, unknown>;
}
```

## Other Exports

- `ConsoleTelemetryProvider` — `TelemetryProvider` implementation that logs traces/metrics to the console.
- `DEFAULT_MODEL_PRICING` — `Record<string, ModelPricing>` default price table (`MODEL_PRICING` is a deprecated alias).

## Dependencies

- `@vinhnt-sdk/schema` — canonical run-event types (`KnownRunEvent`) and wire contracts.
