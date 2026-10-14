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

// ── GenAI semantic conventions (OTel gen_ai.*, ADK profile) ──
export {
  GEN_AI_OPERATION_NAME,
  GEN_AI_PROVIDER_NAME,
  GEN_AI_REQUEST_MODEL,
  GEN_AI_RESPONSE_MODEL,
  GEN_AI_USAGE_INPUT_TOKENS,
  GEN_AI_USAGE_OUTPUT_TOKENS,
  GEN_AI_USAGE_REASONING_TOKENS,
  GEN_AI_RESPONSE_FINISH_REASONS,
  GEN_AI_CONVERSATION_ID,
  GEN_AI_TOOL_NAME,
  GEN_AI_TOOL_CALL_ID,
  GEN_AI_INPUT_MESSAGES,
  GEN_AI_OUTPUT_MESSAGES,
  GEN_AI_OPERATIONS,
  DEFAULT_GEN_AI_MAX_CONTENT_LENGTH,
  VNT_TRACE_CONTENT_TRUNCATED,
  genAiConversationAttributes,
  genAiChatRequestAttributes,
  genAiResponseAttributes,
  genAiUsageAttributes,
  genAiContentAttributes,
  genAiToolAttributes,
  genAiInvokeAgentAttributes,
} from "./gen-ai-attributes.js";
export type {
  GenAiOperation,
  GenAiContentMode,
  GenAiUsage,
  GenAiContentOptions,
} from "./gen-ai-attributes.js";

// ── Timeline ──
export { Timeline, buildTranscript } from "./timeline.js";
export type { TimelineEvent, TimelineEventType, TranscriptEntry } from "./timeline.js";

// ── Telemetry ──
export { CostMeter, calculateCost, calculateContextPressure, DEFAULT_MODEL_PRICING, MODEL_PRICING, ConsoleTelemetryProvider } from "./telemetry.js";
export type { UsageStats, ModelPricing, ContextPressure, TelemetryProvider } from "./telemetry.js";

// ── OTLP export (P1-9) ──
export {
  createOtlpSpanExporter,
  resolveOtlpEndpoint,
  parseOtlpHeaders,
  mapSpanToOtlp,
  buildOtlpExportRequest,
  toOtlpAnyValue,
  toOtlpAttributes,
  toOtlpId,
  msToUnixNano,
  OTLP_SPAN_KIND,
  OTLP_STATUS_OK,
  OTLP_STATUS_ERROR,
  OTLP_STATUS_UNSET,
} from "./otlp-exporter.js";
export type {
  OtlpExporterConfig,
  SpanExporter,
  FetchLike,
  OtlpAnyValue,
  OtlpKeyValue,
  OtlpSpan,
  OtlpSpanEvent,
  OtlpSpanStatus,
  OtlpResourceSpans,
  OtlpExportTraceRequest,
} from "./otlp-exporter.js";
