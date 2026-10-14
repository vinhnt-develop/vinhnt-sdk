# @vinhnt-sdk/trace

> Status: STABLE

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
- **GenAI semconv** — OTel `gen_ai.*` attribute keys + builders for chat/tool/agent spans (ADK profile)
- **Timeline** — Build transcripts from run events for replay
- **CostMeter** — Track token usage and calculate costs per model
- **ContextPressure** — Monitor context window utilization
- **TelemetryProvider** — Interface for custom telemetry backends
- **OTLP exporter** — `createOtlpSpanExporter` ships spans to any OTLP/HTTP collector (optional)
- **DEFAULT_MODEL_PRICING** — Built-in pricing for common models

## Quick Start

`	ypescript
import {
  SpanRecorder,
  CostMeter, calculateCost, DEFAULT_MODEL_PRICING,
  Timeline, buildTranscript,
} from "@vinhnt-sdk/trace";

// Create and record spans
const recorder = new SpanRecorder();
const span = recorder.startSpan("llm-call", "client");

// ... do work ...

recorder.endSpan(span, "ok");

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

### OTLP Export (P1-9)

| Export | Type | Description |
|--------|------|-------------|
| createOtlpSpanExporter | Function | OTLP/HTTP JSON exporter (config or env endpoint) |
| resolveOtlpEndpoint | Function | Resolve endpoint from config / `OTEL_EXPORTER_OTLP_*` |
| mapSpanToOtlp | Function | Map custom `Span` → OTLP JSON span |
| buildOtlpExportRequest | Function | Wrap spans into `ExportTraceServiceRequest` |
| SpanExporter | Interface | `export(spans)` / `shutdown()` seam |

Endpoint resolution (first match wins):

1. `config.endpoint`
2. `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
3. `OTEL_EXPORTER_OTLP_ENDPOINT` + `/v1/traces`

Headers: `OTEL_EXPORTER_OTLP_HEADERS` (`k1=v1,k2=v2`) merged with `config.headers`.
Resource: `config.resourceAttributes` (default `service.name=vinhnt-sdk`, override via `OTEL_SERVICE_NAME` in attributes).

### GenAI Semconv (G3.1)

| Export | Type | Description |
|--------|------|-------------|
| GEN_AI_OPERATIONS | Constant | Operation names: `chat`, `text_completion`, `embeddings`, `invoke_agent`, `execute_tool`, `retrieve`, `invoke_workflow` |
| GenAiOperation | Type | Union of operation names (autocomplete + extensible) |
| GEN_AI_* | Constants | OTel `gen_ai.*` attribute keys (request/response/usage/tool/content) |
| genAiChatRequestAttributes | Function | Request-side attrs (`operation.name`, `provider.name`, `request.model`) |
| genAiResponseAttributes | Function | Served model + `response.finish_reasons` |
| genAiUsageAttributes | Function | `usage.input_tokens` / `output_tokens` / `reasoning_tokens` |
| genAiContentAttributes | Function | Opt-in message attrs — `contentMode: "full"` only (default `no_content`) |
| genAiToolAttributes | Function | `execute_tool` span attrs (`gen_ai.tool.name` / `tool.call.id`) |
| genAiInvokeAgentAttributes | Function | Root `invoke_agent` span attrs |

Content capture is privacy-gated: without `contentMode: "full"` the builders
return `{}` — metadata only. Custom attributes use the `vnt.` namespace.

```typescript
import { createOtlpSpanExporter, SpanRecorder } from "@vinhnt-sdk/trace";

const recorder = new SpanRecorder();
// ... record spans ...

const exporter = createOtlpSpanExporter({
  endpoint: "http://localhost:4318/v1/traces", // or set env only
  resourceAttributes: { "service.name": "my-agent", "deployment.environment": "dev" },
});
await exporter.export(recorder.getSpans());
await exporter.shutdown();
```

No exporter is created unless you call `createOtlpSpanExporter` — default telemetry path unchanged.

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
