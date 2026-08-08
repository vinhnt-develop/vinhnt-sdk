# @vinhnt-sdk/otel

> Structured logging, distributed tracing, audit logging, and OpenTelemetry.

**npm:** `npm install @vinhnt-sdk/otel`  
**Size:** ~14 KB  
**Dependencies:** `@vinhnt-sdk/core`, `@vinhnt-sdk/plugin`, `@vinhnt-sdk/schema`

---

## Overview

`otel` provides the full observability stack for agent systems.

## Installation

```bash
npm install @vinhnt-sdk/otel
```

## Quick Setup

```typescript
import { createObservabilityPlugin } from "@vinhnt-sdk/otel";

const plugin = createObservabilityPlugin({
  logLevel: "info",
  auditEnabled: true,
});

pluginManager.register(plugin);
```

## Exports

### Logger

```typescript
import { Logger, ConsoleSink, FileSink } from "@vinhnt-sdk/otel";

const logger = new Logger({
  level: "info",
  sinks: [
    new ConsoleSink({ colorize: true }),
    new FileSink({ path: "./logs/agent.log", maxSize: "10MB" }),
  ],
});

logger.info("Agent started", { agentId: "coding-assistant" });
logger.warn("Context limit approaching", { tokens: 120000 });
logger.error("Tool failed", { tool: "execute_command", error });
```

### Tracer

```typescript
import { Tracer } from "@vinhnt-sdk/otel";

const tracer = new Tracer();

const span = tracer.startSpan("agent.run", {
  attributes: { "agent.id": "coding-assistant" },
});

try {
  const result = await agent.run(prompt);
  span.setStatus({ code: "OK" });
} catch (error) {
  span.setStatus({ code: "ERROR", message: error.message });
} finally {
  span.end();
}
```

### Audit Log

```typescript
import { AuditLog } from "@vinhnt-sdk/otel";

const audit = new AuditLog({
  sink: new FileSink({ path: "./audit.log" }),
});

await audit.log({
  action: "tool.execute",
  actor: "user-123",
  resource: "execute_command",
  details: { command: "rm -rf /" },
  outcome: "denied",
});

const events = await audit.query({
  action: "tool.execute",
  startDate: new Date("2024-01-01"),
});
```

### OpenTelemetry Sink

```typescript
import { OTelTracerSink } from "@vinhnt-sdk/otel";

const tracer = new Tracer({
  sinks: [
    new OTelTracerSink({
      endpoint: "http://localhost:4318",
      serviceName: "vinhnt-agent",
    }),
  ],
});
```

### Observability Plugin

```typescript
import { createObservabilityPlugin } from "@vinhnt-sdk/otel";

const plugin = createObservabilityPlugin({
  logLevel: "info",
  auditEnabled: true,
  traceEnabled: true,
});

// Hooks into all lifecycle events automatically
pluginManager.register(plugin);
```

## What Gets Tracked

| Event | Data |
|-------|------|
| `run.started` | runId, agentId, prompt |
| `step.started` | stepNumber, stepType |
| `tool.invoked` | toolName, input |
| `tool.completed` | toolName, result, duration |
| `tool.failed` | toolName, error, duration |
| `token.streamed` | tokenCount, model |
| `step.completed` | duration, tokenUsage |
| `run.completed` | totalDuration, totalTokens |
| `context.compressed` | originalTokens, compressedTokens |
