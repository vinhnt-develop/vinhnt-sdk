# @vinhnt-sdk/trace

> Version: 0.4.2 | Status: STABLE

Observability for vinhnt-sdk — OpenTelemetry-compatible spans, timeline replay, telemetry aggregation, and cost tracking.

## Install

`ash
# npm
npm install @vinhnt-sdk/trace

# pnpm (monorepo)
pnpm add @vinhnt-sdk/trace
`

## Features

- **SpanRecorder** — Record and query OpenTelemetry-compatible spans
- **Timeline** — Build transcripts from run events for replay
- **CostMeter** — Track token usage and calculate costs per model
- **ContextPressure** — Monitor context window utilization
- **TelemetryProvider** — Interface for custom telemetry backends
- **DEFAULT_MODEL_PRICING** — Built-in pricing for common models

## Quick Start

`	ypescript
import {
  SpanRecorder, createSpan, endSpan,
  CostMeter, calculateCost, DEFAULT_MODEL_PRICING,
  Timeline, buildTranscript,
} from "@vinhnt-sdk/trace";

// Create and record spans
const recorder = new SpanRecorder();
const span = createSpan({ name: "llm-call", kind: "client" });
recorder.record(span);

// ... do work ...

endSpan(span, { status: "ok" });

// Calculate costs
const meter = new CostMeter();
meter.record({
  inputTokens: 1000,
  outputTokens: 500,
  model: "gpt-4o",
});
console.log(meter.totalCost); // Cost in USD

// Build transcript from events
const transcript = buildTranscript(events);
console.log(transcript);
`

## API Reference

### Tracing

| Export | Type | Description |
|--------|------|-------------|
| SpanRecorder | Class | Record and query spans |
| createSpan | Function | Create a new span |
| endSpan | Function | End a span with status |
| ddSpanEvent | Function | Add an event to a span |
| generateTraceId | Function | Generate a unique trace ID |

### Span Types

| Export | Type | Description |
|--------|------|-------------|
| Span | Interface | A single trace span |
| SpanKind | Type | Span type (client, server, internal) |
| SpanStatus | Type | Span completion status |
| SpanEvent | Interface | Event within a span |
| SpanNode | Interface | Span tree node |
| TraceContext | Interface | Trace propagation context |

### Timeline

| Export | Type | Description |
|--------|------|-------------|
| Timeline | Class | Build and query run timelines |
| uildTranscript | Function | Build transcript from events |
| TimelineEvent | Interface | Event in a timeline |
| TranscriptEntry | Interface | Transcript line item |

### Telemetry

| Export | Type | Description |
|--------|------|-------------|
| CostMeter | Class | Track token costs |
| calculateCost | Function | Calculate cost from tokens |
| calculateContextPressure | Function | Calculate context utilization |
| DEFAULT_MODEL_PRICING | Constant | Default pricing for common models |
| ConsoleTelemetryProvider | Class | Console-based telemetry output |

### Telemetry Types

| Export | Type | Description |
|--------|------|-------------|
| UsageStats | Interface | Token usage statistics |
| ModelPricing | Interface | Per-1M-token pricing |
| ContextPressure | Interface | Context window utilization |
| TelemetryProvider | Interface | Custom telemetry backend |

## Usage Examples

### Cost Tracking

`	ypescript
import { CostMeter, DEFAULT_MODEL_PRICING } from "@vinhnt-sdk/trace";

const meter = new CostMeter();

// Track usage across multiple calls
meter.record({ inputTokens: 1000, outputTokens: 500, model: "gpt-4o" });
meter.record({ inputTokens: 2000, outputTokens: 1000, model: "gpt-4o-mini" });

console.log(meter.totalCost); // Total cost in USD
`

### Custom Telemetry Provider

`	ypescript
import type { TelemetryProvider } from "@vinhnt-sdk/trace";

const customProvider: TelemetryProvider = {
  name: "datadog",
  async recordSpan(span) {
    await sendToDatadog(span);
  },
  async recordUsage(usage) {
    await sendMetricsToDatadog(usage);
  },
};
`

## Dependencies

- @vinhnt-sdk/schema >=0.5.0

## License

MIT
