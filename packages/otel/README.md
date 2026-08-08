# @vnt/observability

Observability stack for VNT Agent — logging, tracing, audit, and OpenTelemetry integration.

## Install

```bash
# npm
npm install @vnt/observability

# pnpm (monorepo)
pnpm add @vnt/observability
```

## Quick Start

```typescript
import { Logger, ConsoleSink, FileSink, Tracer, AuditLog, OTelTracerSink } from '@vnt/observability';

const logger = new Logger({ sinks: [new ConsoleSink(), new FileSink({ path: './logs/vnt.log' })] });
const tracer = new Tracer({ sinks: [new OTelTracerSink({ endpoint: 'http://localhost:4318' })] });
const audit = new AuditLog({ sinks: [new ConsoleSink()] });

logger.info('Agent started', { agentId: 'abc' });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `Logger` | Class | Structured logging with multiple sinks |
| `ConsoleSink` | Class | Console output sink |
| `FileSink` | Class | File sink with log rotation |
| `Tracer` | Class | Distributed tracing with span support |
| `OTelTracerSink` | Class | OpenTelemetry trace exporter |
| `AuditLog` | Class | Compliance audit logging with query |
| `createObservabilityPlugin` | Function | Pre-built observability plugin |

## License

MIT
