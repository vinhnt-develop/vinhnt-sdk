/**
 * @module trace
 * Observability — OpenTelemetry-compatible spans, timeline replay, telemetry aggregation.
 *
 * Capability Seam:
 *   Tracing (SpanRecorder, createSpan) → Consumer (core kernel, step-executor)
 *   Timeline (Timeline, buildTranscript) → Consumer (session, UI)
 *   Telemetry (TokenMeter, calculateCost) → Consumer (core kernel, model-caller)
 */

// ── Tracing ──
export {
  SpanRecorder, createSpan, endSpan, addSpanEvent,
  generateTraceId,
} from "./tracing.js";
export type { Span, SpanKind, SpanStatus, SpanEvent, SpanNode, TraceContext } from "./tracing.js";

// ── Timeline ──
export { Timeline, buildTranscript } from "./timeline.js";
export type { TimelineEvent, TimelineEventType, TranscriptEntry } from "./timeline.js";

// ── Telemetry ──
export { CostMeter, calculateCost, calculateContextPressure, MODEL_PRICING } from "./telemetry.js";
export type { UsageStats, ModelPricing, ContextPressure } from "./telemetry.js";
