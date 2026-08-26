/**
 * Tracing — OpenTelemetry-compatible span model.
 *
 * Spans represent units of work (model call, tool execution, step, turn).
 * They form a tree: parent span → child spans.
 *
 * This is a lightweight, zero-dependency implementation compatible with
 * the OpenTelemetry span model but without requiring the OTel SDK.
 */

/** Span status */
export type SpanStatus = "ok" | "error" | "cancelled";

/** A single trace span */
export interface Span {
  /** Unique span ID */
  readonly id: string;
  /** Parent span ID (undefined for root spans) */
  readonly parentId: string | undefined;
  /** Span name (e.g., "llm.call", "tool.execute", "step") */
  readonly name: string;
  /** Span kind */
  readonly kind: SpanKind;
  /** Start time (Unix ms) */
  readonly startTimeMs: number;
  /** End time (Unix ms, 0 if still active) */
  endTimeMs: number;
  /** Span status */
  status: SpanStatus;
  /** Span attributes (key-value pairs) */
  attributes: Record<string, unknown>;
  /** Span events (timestamped annotations) */
  events: SpanEvent[];
  readonly metadata?: Record<string, unknown>;
}

/** Span kind */
export type SpanKind = "internal" | "client" | "server" | "producer" | "consumer";

/** A timestamped event within a span */
export interface SpanEvent {
  name: string;
  timestampMs: number;
  attributes: Record<string, unknown>;
}

/** Trace context — passed through the call chain */
export interface TraceContext {
  /** Root trace ID */
  readonly traceId: string;
  /** Current span */
  readonly span: Span;
}

let spanCounter = 0;

/** Generate a unique span ID */
function generateSpanId(): string {
  return `span_${Date.now().toString(36)}_${(spanCounter++).toString(36)}`;
}

/** Generate a unique trace ID */
export function generateTraceId(): string {
  return `trace_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new span.
 */
export function createSpan(
  name: string,
  kind: SpanKind,
  parentId?: string,
  traceId?: string,
): Span {
  return {
    id: generateSpanId(),
    parentId,
    name,
    kind,
    startTimeMs: Date.now(),
    endTimeMs: 0,
    status: "ok",
    attributes: {},
    events: [],
  };
}

/**
 * End a span with a status.
 */
export function endSpan(span: Span, status: SpanStatus = "ok"): void {
  span.endTimeMs = Date.now();
  span.status = status;
}

/**
 * Add an event to a span.
 */
export function addSpanEvent(span: Span, name: string, attributes?: Record<string, unknown>): void {
  span.events.push({
    name,
    timestampMs: Date.now(),
    attributes: attributes ?? {},
  });
}

/**
 * A span recorder — collects spans and provides trace context.
 */
export class SpanRecorder {
  private readonly spans: Span[] = [];
  private readonly traceId: string;

  constructor(traceId?: string) {
    this.traceId = traceId ?? generateTraceId();
  }

  /** Start a new span */
  startSpan(name: string, kind: SpanKind, parentId?: string): Span {
    const span = createSpan(name, kind, parentId ?? this.spans[this.spans.length - 1]?.id, this.traceId);
    this.spans.push(span);
    return span;
  }

  /** End a span */
  endSpan(span: Span, status: SpanStatus = "ok"): void {
    endSpan(span, status);
  }

  /** Get all recorded spans */
  getSpans(): readonly Span[] {
    return [...this.spans];
  }

  /** Get span tree (root → children) */
  getSpanTree(): SpanNode[] {
    const spanMap = new Map<string, SpanNode>();
    const roots: SpanNode[] = [];

    // Create nodes
    for (const span of this.spans) {
      spanMap.set(span.id, { span, children: [] });
    }

    // Build tree
    for (const node of spanMap.values()) {
      if (node.span.parentId) {
        const parent = spanMap.get(node.span.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /** Get total duration of the trace */
  getTotalDurationMs(): number {
    if (this.spans.length === 0) return 0;
    const start = Math.min(...this.spans.map((s) => s.startTimeMs));
    const end = Math.max(...this.spans.map((s) => s.endTimeMs || Date.now()));
    return end - start;
  }
}

/** A node in the span tree */
export interface SpanNode {
  span: Span;
  children: SpanNode[];
}
