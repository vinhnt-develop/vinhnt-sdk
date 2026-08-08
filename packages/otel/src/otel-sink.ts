import { trace, SpanStatusCode, type Span as OTelSpan } from "@opentelemetry/api";
import { BasicTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import type { Span, SpanEvent, TracerSink } from "./tracer.js";

export interface OTelSinkOptions {
  endpoint?: string;
  serviceName?: string;
  serviceVersion?: string;
  exportIntervalMillis?: number;
}

function sanitize(attrs: Record<string, unknown> | undefined): Record<string, string | number | boolean> {
  if (!attrs) return {};
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[key] = value;
    } else {
      result[key] = String(value);
    }
  }
  return result;
}

export class OTelTracerSink implements TracerSink {
  private spans = new Map<string, OTelSpan>();
  private provider: BasicTracerProvider | undefined;
  private otelTracer: ReturnType<typeof trace.getTracer> | undefined;

  constructor(options?: OTelSinkOptions) {
    try {
      const endpoint = options?.endpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces";
      const serviceName = options?.serviceName ?? process.env.OTEL_SERVICE_NAME ?? "vnt-agent";

      const exporter = new OTLPTraceExporter({ url: endpoint });

      const processor = new BatchSpanProcessor(exporter, {
        scheduledDelayMillis: options?.exportIntervalMillis ?? 5000,
      });

      this.provider = new BasicTracerProvider({
        resource: new Resource({
          [ATTR_SERVICE_NAME]: serviceName,
          ...(options?.serviceVersion ? { [ATTR_SERVICE_VERSION]: options.serviceVersion } : {}),
        }),
        spanProcessors: [processor],
      });

      this.provider.register();
      this.otelTracer = trace.getTracer(serviceName, options?.serviceVersion);
    } catch {
      this.otelTracer = undefined;
    }
  }

  onSpanStart(span: Span): void {
    if (!this.otelTracer) return;
    const otelSpan = this.otelTracer.startSpan(span.name, {
      startTime: new Date(span.startTime).getTime(),
      attributes: sanitize(span.attributes),
    });
    this.spans.set(span.spanId, otelSpan);
  }

  onSpanEnd(span: Span): void {
    const otelSpan = this.spans.get(span.spanId);
    if (!otelSpan) return;
    if (span.error) {
      otelSpan.recordException(new Error(span.error));
      otelSpan.setStatus({ code: SpanStatusCode.ERROR, message: span.error });
    }
    if (span.attributes) {
      otelSpan.setAttributes(sanitize(span.attributes));
    }
    otelSpan.end(new Date(span.endTime!).getTime());
    this.spans.delete(span.spanId);
  }

  onSpanEvent(spanId: string, event: SpanEvent): void {
    const otelSpan = this.spans.get(spanId);
    if (!otelSpan) return;
    otelSpan.addEvent(event.name, sanitize(event.attributes), new Date(event.timestamp).getTime());
  }

  async shutdown(): Promise<void> {
    await this.provider?.shutdown();
  }
}
