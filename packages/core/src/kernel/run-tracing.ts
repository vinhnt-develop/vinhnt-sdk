import type { RunId, TraceId } from "@vinhnt-sdk/schema";
import { getLogger } from "@vinhnt-sdk/schema";
import type {
  Span,
  SpanStatus,
  GenAiContentMode,
  OtlpExporterConfig,
} from "@vinhnt-sdk/trace";
import {
  SpanRecorder,
  GEN_AI_OPERATIONS,
  genAiChatRequestAttributes,
  genAiResponseAttributes,
  genAiUsageAttributes,
  genAiContentAttributes,
  genAiToolAttributes,
  genAiInvokeAgentAttributes,
  createOtlpSpanExporter,
  resolveOtlpEndpoint,
} from "@vinhnt-sdk/trace";
import type { ModelResponse } from "../model.js";
import type { ToolCallOutcome } from "@vinhnt-sdk/step-executor";

/**
 * GenAI tracing — wires `@vinhnt-sdk/trace` into the run loop (G3.1).
 *
 * Every run records an OTel-compatible span tree with `gen_ai.*` semconv
 * attributes (see trace/gen-ai-attributes.ts, ADK profile):
 *
 *   invoke_agent (root, per run)
 *   ├── chat            — one per model call  (gen_ai.provider/request/response/usage…)
 *   └── execute_tool    — one per tool call  (gen_ai.tool.name/call.id)
 *
 * Recording is in-memory and always on (a handful of spans per run);
 * `enabled: false` opts out completely. OTLP export is passive — it only
 * fires when an endpoint is configured (`tracing.otlp.endpoint`) or the
 * standard `OTEL_EXPORTER_OTLP_*` env vars are set. Export is fire-and-forget:
 * observability never delays or fails a run.
 *
 * Custom attributes live in the `vnt.` namespace; `gen_ai.*` keys are used
 * only where the semantic convention defines them.
 */

/** Custom (non-semconv) span attributes. */
export const VNT_RUN_ID = "vnt.run.id";
export const VNT_STEP = "vnt.step";
export const VNT_AGENT_ID = "vnt.agent.id";
export const VNT_AGENT_NAME = "vnt.agent.name";
export const VNT_REQUEST_TRACE_ID = "vnt.request.trace_id";

/** Kernel/run-loop tracing configuration (`AgentKernelConfig.tracing`). */
export interface TracingConfig {
  /** Record spans (default true). `false` disables tracing entirely. */
  readonly enabled?: boolean;
  /** Prompt/completion capture tier (default `no_content` — metadata only). */
  readonly contentMode?: GenAiContentMode;
  /** Truncation cap for opt-in content attributes. Default 4096 chars. */
  readonly maxContentLength?: number;
  /** OTLP/HTTP export config — endpoint/headers/fetch/env (standard OTEL vars fill gaps). */
  readonly otlp?: OtlpExporterConfig;
  /**
   * In-process seam — invoked once per run with the finished span list
   * (before/without any OTLP export). Use for tests, UIs, or custom backends.
   */
  readonly onSpans?: (spans: readonly Span[]) => void;
}

/** Terminal status for a run's root span. */
export type RunTraceStatus = "ok" | "error" | "cancelled";

/** Per-run span tree — created once per runLoop invocation. */
export interface RunTrace {
  readonly recorder: SpanRecorder;
  readonly rootSpan: Span;
  readonly config: TracingConfig;
  readonly runId: RunId;
  readonly conversationId?: string | undefined;
}

/**
 * Create the per-run trace (root `invoke_agent` span).
 * Returns undefined when tracing is disabled — callers null-check once.
 */
export function createRunTrace(
  config: TracingConfig | undefined,
  opts: {
    readonly runId: RunId;
    readonly requestTraceId: TraceId;
    readonly sessionId?: string | undefined;
    readonly agentId?: string | undefined;
    readonly agentName?: string | undefined;
  },
): RunTrace | undefined {
  if (config?.enabled === false) return undefined;
  const effective: TracingConfig = config ?? {};
  const recorder = new SpanRecorder();
  const rootSpan = recorder.startSpan(GEN_AI_OPERATIONS.invokeAgent, "internal");
  rootSpan.attributes = {
    ...genAiInvokeAgentAttributes({ conversationId: opts.sessionId }),
    [VNT_RUN_ID]: opts.runId,
    [VNT_REQUEST_TRACE_ID]: opts.requestTraceId,
    ...(opts.agentId ? { [VNT_AGENT_ID]: opts.agentId } : {}),
    ...(opts.agentName ? { [VNT_AGENT_NAME]: opts.agentName } : {}),
  };
  return {
    recorder,
    rootSpan,
    config: effective,
    runId: opts.runId,
    conversationId: opts.sessionId,
  };
}

function safeStringify(value: unknown): string | undefined {
  try {
    const text = JSON.stringify(value);
    return text ?? undefined;
  } catch {
    return undefined;
  }
}

/** Record (back-dated) one `chat` span for a model call. */
export function recordChatSpan(
  trace: RunTrace,
  input: {
    readonly step: number;
    /** Wall-clock ms from before the model call started. */
    readonly startMs: number;
    readonly status?: SpanStatus;
    /** The model this step intended to call. */
    readonly request: { readonly provider: string; readonly model: string };
    /** The response that was actually served (absent on failed calls). */
    readonly response?: {
      readonly provider?: string | undefined;
      readonly model?: string | undefined;
      readonly usage?: ModelResponse["usage"];
      readonly finishReason?: string | undefined;
      readonly content?: string | undefined;
      /** Conversation snapshot for opt-in input content capture. */
      readonly inputMessages?: unknown;
    };
  },
): Span {
  const span = trace.recorder.startSpan(
    GEN_AI_OPERATIONS.chat,
    "client",
    trace.rootSpan.id,
    input.startMs,
  );
  const attrs: Record<string, unknown> = {
    ...genAiChatRequestAttributes({
      provider: input.response?.provider ?? input.request.provider,
      model: input.request.model,
      conversationId: trace.conversationId,
    }),
    [VNT_RUN_ID]: trace.runId,
    [VNT_STEP]: input.step,
  };
  if (input.response) {
    Object.assign(
      attrs,
      genAiResponseAttributes({
        model: input.response.model,
        finishReason: input.response.finishReason,
      }),
      genAiUsageAttributes(input.response.usage),
      genAiContentAttributes(
        {
          ...(input.response.inputMessages !== undefined
            ? { inputJson: safeStringify(input.response.inputMessages) }
            : {}),
          ...(input.response.content !== undefined
            ? { outputJson: safeStringify([{ role: "assistant", content: input.response.content }]) }
            : {}),
        },
        { contentMode: trace.config.contentMode, maxContentLength: trace.config.maxContentLength },
      ),
    );
  }
  span.attributes = attrs;
  trace.recorder.endSpan(span, input.status ?? "ok");
  return span;
}

/** Start one `execute_tool` span per pending tool call (back-dated start). */
export function startToolSpans(
  trace: RunTrace,
  step: number,
  calls: readonly { readonly id: string; readonly name: string }[],
  startMs: number,
): Span[] {
  return calls.map((call) => {
    const span = trace.recorder.startSpan(
      GEN_AI_OPERATIONS.executeTool,
      "internal",
      trace.rootSpan.id,
      startMs,
    );
    span.attributes = {
      ...genAiToolAttributes({
        toolName: call.name,
        toolCallId: call.id,
        conversationId: trace.conversationId,
      }),
      [VNT_RUN_ID]: trace.runId,
      [VNT_STEP]: step,
    };
    return span;
  });
}

/**
 * End the batch's tool spans. Status mapping:
 * - matching outcome with exitCode → `0` ok / non-zero error;
 * - matching outcome without exitCode → ok (successful execution);
 * - no outcome (denied/rejected/failed — outcomes only record successes) → error.
 */
export function endToolSpans(
  trace: RunTrace,
  spans: readonly Span[],
  outcomes: readonly ToolCallOutcome[],
): void {
  const remaining = [...outcomes];
  for (const span of spans) {
    const toolName = span.attributes["gen_ai.tool.name"];
    const idx = remaining.findIndex((o) => o.toolName === toolName);
    let status: SpanStatus = "error";
    if (idx >= 0) {
      const outcome = remaining.splice(idx, 1)[0]!;
      status = outcome.exitCode === undefined || outcome.exitCode === 0 ? "ok" : "error";
    }
    trace.recorder.endSpan(span, status);
  }
}

/**
 * Finish the run's trace: end the root span with the run's terminal status,
 * invoke `onSpans`, then fire-and-forget an OTLP export when an endpoint is
 * configured (config or standard OTEL env). Never throws.
 */
export async function finishRunTrace(
  trace: RunTrace | undefined,
  status: RunTraceStatus,
): Promise<void> {
  if (!trace) return;
  if (trace.rootSpan.endTimeMs === 0) {
    trace.recorder.endSpan(trace.rootSpan, status);
  }
  const spans = trace.recorder.getSpans();
  try {
    trace.config.onSpans?.(spans);
  } catch (err) {
    getLogger().warn("[tracing] onSpans callback failed:", err instanceof Error ? err.message : String(err));
  }

  let endpoint: string | undefined;
  try {
    endpoint = resolveOtlpEndpoint(trace.config.otlp);
  } catch {
    endpoint = undefined;
  }
  if (!endpoint) return;
  try {
    const exporter = createOtlpSpanExporter(trace.config.otlp ?? {});
    void exporter
      .export(spans)
      .then(() => exporter.shutdown())
      .catch((err: unknown) => {
        getLogger().warn("[tracing] OTLP export failed:", err instanceof Error ? err.message : String(err));
      });
  } catch (err) {
    getLogger().warn("[tracing] OTLP exporter creation failed:", err instanceof Error ? err.message : String(err));
  }
}
