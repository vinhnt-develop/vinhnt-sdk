import { AsyncLocalStorage } from "node:async_hooks";

export interface Span {
  readonly spanId: string;
  readonly traceId: string;
  readonly name: string;
  readonly startTime: string;
  readonly endTime: string | undefined;
  readonly attributes: Record<string, unknown> | undefined;
  readonly status: "ok" | "error" | undefined;
  readonly error: string | undefined;
}

export interface SpanEvent {
  readonly timestamp: string;
  readonly name: string;
  readonly attributes: Record<string, unknown> | undefined;
}

export interface TracerSink {
  onSpanEnd(span: Span): void;
  onSpanEvent(spanId: string, event: SpanEvent): void;
  onSpanStart?(span: Span): void;
}

export interface TraceContext {
  readonly traceId: string;
  readonly spanId: string;
}

let nextSpanId = 1;
let nextTraceId = 1;

const traceStorage = new AsyncLocalStorage<TraceContext>();

export class Tracer {
  private spans = new Map<string, Span>();
  private sinks: TracerSink[] = [];

  static getCurrentContext(): TraceContext | undefined {
    return traceStorage.getStore();
  }

  addSink(sink: TracerSink): void {
    this.sinks.push(sink);
  }

  startSpan(name: string, options?: { parentSpanId?: string; attributes?: Record<string, unknown> }): Span {
    const traceId = options?.parentSpanId
      ? (this.spans.get(options.parentSpanId)?.traceId ?? `trace_${nextTraceId++}`)
      : `trace_${nextTraceId++}`;

    const span: Span = {
      spanId: `span_${nextSpanId++}`,
      traceId,
      name,
      startTime: new Date().toISOString(),
      endTime: undefined,
      attributes: options?.attributes,
      status: undefined,
      error: undefined,
    };
    this.spans.set(span.spanId, span);

    for (const sink of this.sinks) {
      sink.onSpanStart?.(span);
    }

    return span;
  }

  endSpan(spanId: string, options?: { status?: "ok" | "error"; error?: string; attributes?: Record<string, unknown> }): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    const merged: Span = {
      ...span,
      endTime: new Date().toISOString(),
      status: options?.status ?? "ok",
      error: options?.error,
      attributes: options?.attributes ? { ...span.attributes, ...options.attributes } : span.attributes,
    };

    this.spans.set(spanId, merged);

    for (const sink of this.sinks) {
      sink.onSpanEnd(merged);
    }
  }

  addEvent(spanId: string, name: string, attributes?: Record<string, unknown>): void {
    const event: SpanEvent = {
      timestamp: new Date().toISOString(),
      name,
      attributes,
    };
    for (const sink of this.sinks) {
      sink.onSpanEvent(spanId, event);
    }
  }

  inSpan<T>(name: string, fn: (span: Span) => Promise<T>, options?: { parentSpanId?: string }): Promise<T> {
    const span = this.startSpan(name, options);
    return traceStorage.run({ traceId: span.traceId, spanId: span.spanId }, () => {
      return fn(span).then(
        (result) => {
          this.endSpan(span.spanId);
          return result;
        },
        (err) => {
          this.endSpan(span.spanId, {
            status: "error",
            error: err instanceof Error ? err.message : String(err),
          });
          throw err;
        },
      );
    });
  }
}
