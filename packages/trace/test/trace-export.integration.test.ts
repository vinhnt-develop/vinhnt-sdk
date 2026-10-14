/**
 * P5.10 (S15) — trace integration gate.
 *
 * otlp-exporter.test.ts verifies the exporter with hand-built Span literals.
 * This file drives the REAL recording lifecycle (SpanRecorder.startSpan /
 * addSpanEvent / endSpan) into the OTLP/HTTP exporter against a fake collector
 * fetch and asserts the end-to-end wire contract: span kind + status codes,
 * resource service.name, scope identity, parent linkage and id shapes.
 */

import { describe, it, expect, vi } from "vitest";
import {
  SpanRecorder,
  addSpanEvent,
  createOtlpSpanExporter,
  OTLP_SPAN_KIND,
  OTLP_STATUS_OK,
  OTLP_STATUS_ERROR,
} from "../src/index.js";
import type { OtlpExporterConfig, OtlpExportTraceRequest, OtlpSpan } from "../src/index.js";

interface Collector {
  fetchMock: ReturnType<typeof vi.fn>;
  exporter: ReturnType<typeof createOtlpSpanExporter>;
  request: () => OtlpExportTraceRequest;
}

function collector(config?: OtlpExporterConfig): Collector {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
  // Default endpoint only when the caller did not bring its own endpoint/env
  // resolution (exactOptionalPropertyTypes: never write an explicit undefined).
  const defaults: OtlpExporterConfig =
    config?.endpoint === undefined && config?.env === undefined
      ? { endpoint: "http://collector:4318/v1/traces", env: {} }
      : {};
  const exporter = createOtlpSpanExporter({
    ...defaults,
    ...config,
    fetch: fetchMock,
  });
  return {
    fetchMock,
    exporter,
    request: () => {
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      return JSON.parse(String(init.body)) as OtlpExportTraceRequest;
    },
  };
}

function spans(request: OtlpExportTraceRequest): OtlpSpan[] {
  return request.resourceSpans[0]!.scopeSpans[0]!.spans;
}

function attrValue(request: OtlpExportTraceRequest, key: string): unknown {
  return request.resourceSpans[0]!.resource.attributes.find((a) => a.key === key)?.value;
}

describe("P5.10 trace recorder→OTLP export integration (S15)", () => {
  it("TC01_recorder_lifecycle_exports_kind_status_resource_and_parent_linkage", async () => {
    const recorder = new SpanRecorder();
    const root = recorder.startSpan("run", "internal");
    const child = recorder.startSpan("llm.call", "client", root.id);
    child.attributes = { model: "gpt-4o", tokens: 42, ok: false };
    addSpanEvent(child, "retry", { attempt: 1 });
    recorder.endSpan(child, "error");
    recorder.endSpan(root, "ok");

    const { exporter, request, fetchMock } = collector();
    await exporter.export(recorder.getSpans());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = request();

    // Default resource: service.name falls back to "vinhnt-sdk".
    expect(attrValue(body, "service.name")).toEqual({ stringValue: "vinhnt-sdk" });

    const [rootOtlp, childOtlp] = spans(body);
    expect(rootOtlp).toBeDefined();
    expect(childOtlp).toBeDefined();

    // Kind mapping from the recorder's string kinds (internal:1, client:3).
    expect(rootOtlp!.kind).toBe(OTLP_SPAN_KIND["internal"]);
    expect(rootOtlp!.kind).toBe(1);
    expect(childOtlp!.kind).toBe(OTLP_SPAN_KIND["client"]);
    expect(childOtlp!.kind).toBe(3);

    // Status mapping (ok:1, error:2).
    expect(rootOtlp!.status.code).toBe(OTLP_STATUS_OK);
    expect(childOtlp!.status.code).toBe(OTLP_STATUS_ERROR);

    // Parent linkage is preserved as the 16-char hex form of the parent id.
    expect(childOtlp!.parentSpanId).toBe(rootOtlp!.spanId);
    expect(rootOtlp!.parentSpanId).toBeUndefined();
    expect(rootOtlp!.traceId).toHaveLength(32);
    expect(rootOtlp!.spanId).toHaveLength(16);
    expect(childOtlp!.traceId).toBe(rootOtlp!.traceId);

    // Recorded event + typed attributes survive the mapping.
    expect(childOtlp!.events).toHaveLength(1);
    expect(childOtlp!.events[0]!.name).toBe("retry");
    expect(childOtlp!.events[0]!.attributes).toContainEqual({ key: "attempt", value: { intValue: "1" } });
    expect(childOtlp!.attributes).toContainEqual({ key: "model", value: { stringValue: "gpt-4o" } });
    expect(childOtlp!.attributes).toContainEqual({ key: "tokens", value: { intValue: "42" } });
    expect(childOtlp!.attributes).toContainEqual({ key: "ok", value: { boolValue: false } });

    // Valid monotonic nanosecond window.
    expect(BigInt(childOtlp!.endTimeUnixNano)).toBeGreaterThanOrEqual(BigInt(childOtlp!.startTimeUnixNano));

    await exporter.shutdown();
  });

  it("TC02_resource_scope_overrides_and_non_error_statuses_reach_the_wire", async () => {
    const recorder = new SpanRecorder();
    const server = recorder.startSpan("http.request", "server");
    recorder.endSpan(server, "timeout");
    const cancelled = recorder.startSpan("tool.execute", "internal");
    recorder.endSpan(cancelled, "cancelled");

    const { exporter, request } = collector({
      resourceAttributes: { "service.name": "vinhnt-agent", "deployment.environment": "test" },
      scopeName: "vinhnt-agent/agent",
      scopeVersion: "1.2.3",
    });
    await exporter.export(recorder.getSpans());
    const body = request();

    expect(attrValue(body, "service.name")).toEqual({ stringValue: "vinhnt-agent" });
    expect(attrValue(body, "deployment.environment")).toEqual({ stringValue: "test" });
    expect(body.resourceSpans[0]!.scopeSpans[0]!.scope).toEqual({
      name: "vinhnt-agent/agent",
      version: "1.2.3",
    });

    const [serverOtlp, cancelledOtlp] = spans(body);
    expect(serverOtlp!.kind).toBe(OTLP_SPAN_KIND["server"]);
    // Non-ok/non-error statuses map to ERROR with the status as message.
    expect(serverOtlp!.status).toEqual({ code: OTLP_STATUS_ERROR, message: "timeout" });
    expect(cancelledOtlp!.status).toEqual({ code: OTLP_STATUS_ERROR, message: "cancelled" });

    await exporter.shutdown();
  });

  it("TC03_env_endpoint_resolution_empty_skip_and_shutdown_noop", async () => {
    const recorder = new SpanRecorder();
    const span = recorder.startSpan("turn", "internal");
    recorder.endSpan(span, "ok");

    const { exporter, fetchMock } = collector({
      env: { OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel.local:4318" },
    });

    // Empty batch never hits the collector.
    await exporter.export([]);
    expect(fetchMock).not.toHaveBeenCalled();

    await exporter.export(recorder.getSpans());
    // Base endpoint got the standard /v1/traces path appended.
    expect(fetchMock.mock.calls[0]![0]).toBe("http://otel.local:4318/v1/traces");

    await exporter.shutdown();
    await exporter.export(recorder.getSpans());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
