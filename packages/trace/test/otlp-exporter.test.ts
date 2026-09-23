/**
 * OTLP exporter tests — endpoint resolution, mapping, export HTTP contract.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createOtlpSpanExporter,
  resolveOtlpEndpoint,
  parseOtlpHeaders,
  mapSpanToOtlp,
  buildOtlpExportRequest,
  toOtlpAnyValue,
  toOtlpId,
  msToUnixNano,
} from "../src/otlp-exporter.js";
import { createSpan, endSpan, addSpanEvent, type Span } from "../src/tracing.js";
import { ConfigurationError } from "@vinhnt-sdk/schema";

afterEach(() => {
  vi.restoreAllMocks();
});

function makeFinishedSpan(): Span {
  const span = createSpan("llm.call", "client", undefined, "trace_test_1");
  span.attributes = { model: "gpt-4o", tokens: 42, ok: true };
  addSpanEvent(span, "retry", { attempt: 1 });
  endSpan(span, "ok");
  return span;
}

describe("resolveOtlpEndpoint", () => {
  it("prefers config.endpoint over env", () => {
    expect(
      resolveOtlpEndpoint({
        endpoint: "http://cfg/v1/traces",
        env: { OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://env/v1/traces" },
      }),
    ).toBe("http://cfg/v1/traces");
  });

  it("uses OTEL_EXPORTER_OTLP_TRACES_ENDPOINT", () => {
    expect(
      resolveOtlpEndpoint({
        env: { OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://traces/v1/traces" },
      }),
    ).toBe("http://traces/v1/traces");
  });

  it("appends /v1/traces to base OTEL_EXPORTER_OTLP_ENDPOINT", () => {
    expect(
      resolveOtlpEndpoint({ env: { OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318" } }),
    ).toBe("http://localhost:4318/v1/traces");
  });

  it("does not double-append when base already ends with /v1/traces", () => {
    expect(
      resolveOtlpEndpoint({
        env: { OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318/v1/traces" },
      }),
    ).toBe("http://localhost:4318/v1/traces");
  });

  it("returns undefined when nothing configured", () => {
    expect(resolveOtlpEndpoint({ env: {} })).toBeUndefined();
  });
});

describe("parseOtlpHeaders", () => {
  it("parses k=v,k=v pairs", () => {
    expect(parseOtlpHeaders("authorization=Bearer x, x-api-key=k1")).toEqual({
      authorization: "Bearer x",
      "x-api-key": "k1",
    });
  });

  it("handles empty / invalid input", () => {
    expect(parseOtlpHeaders(undefined)).toEqual({});
    expect(parseOtlpHeaders("noequals,=empty")).toEqual({});
  });
});

describe("toOtlpId / msToUnixNano", () => {
  it("produces stable hex ids of requested length", () => {
    expect(toOtlpId("span_abc", 16)).toHaveLength(16);
    expect(toOtlpId("span_abc", 32)).toHaveLength(32);
    expect(toOtlpId("span_abc", 16)).toBe(toOtlpId("span_abc", 16));
    expect(toOtlpId("span_abc", 16)).not.toBe(toOtlpId("span_abd", 16));
    expect(toOtlpId("span_abc", 16)).toMatch(/^[0-9a-f]+$/);
  });

  it("converts ms to nanoseconds string", () => {
    expect(msToUnixNano(1)).toBe("1000000");
    expect(msToUnixNano(0)).toBe("0");
  });
});

describe("toOtlpAnyValue", () => {
  it("maps primitives", () => {
    expect(toOtlpAnyValue("a")).toEqual({ stringValue: "a" });
    expect(toOtlpAnyValue(true)).toEqual({ boolValue: true });
    expect(toOtlpAnyValue(42)).toEqual({ intValue: "42" });
    expect(toOtlpAnyValue(1.5)).toEqual({ doubleValue: 1.5 });
    expect(toOtlpAnyValue(null)).toEqual({ stringValue: "" });
    expect(toOtlpAnyValue(undefined)).toEqual({ stringValue: "" });
  });

  it("maps arrays and nested objects", () => {
    expect(toOtlpAnyValue([1, "x"])).toEqual({
      arrayValue: { values: [{ intValue: "1" }, { stringValue: "x" }] },
    });
    expect(toOtlpAnyValue({ a: 1 })).toEqual({
      kvlistValue: { values: [{ key: "a", value: { intValue: "1" } }] },
    });
  });
});

describe("mapSpanToOtlp", () => {
  it("maps a finished span to OTLP JSON", () => {
    const span = makeFinishedSpan();
    const otlp = mapSpanToOtlp(span);

    expect(otlp.traceId).toHaveLength(32);
    expect(otlp.spanId).toHaveLength(16);
    expect(otlp.name).toBe("llm.call");
    expect(otlp.kind).toBe(3); // client
    expect(otlp.status).toEqual({ code: 1 }); // ok
    expect(otlp.startTimeUnixNano).toMatch(/^\d+$/);
    expect(otlp.endTimeUnixNano).toMatch(/^\d+$/);
    expect(BigInt(otlp.endTimeUnixNano)).toBeGreaterThanOrEqual(
      BigInt(otlp.startTimeUnixNano),
    );
    expect(otlp.attributes).toEqual(
      expect.arrayContaining([
        { key: "model", value: { stringValue: "gpt-4o" } },
        { key: "tokens", value: { intValue: "42" } },
        { key: "ok", value: { boolValue: true } },
      ]),
    );
    expect(otlp.events).toHaveLength(1);
    expect(otlp.events[0]!.name).toBe("retry");
    expect(otlp.parentSpanId).toBeUndefined();
  });

  it("maps parentSpanId and error status", () => {
    const parent = createSpan("root", "internal");
    const child = createSpan("child", "server", parent.id, parent.traceId);
    endSpan(child, "error");
    const otlp = mapSpanToOtlp(child);
    expect(otlp.parentSpanId).toHaveLength(16);
    expect(otlp.kind).toBe(2); // server
    expect(otlp.status).toEqual({ code: 2 });
  });

  it("maps cancelled status with message", () => {
    const span = createSpan("x", "internal");
    endSpan(span, "cancelled");
    expect(mapSpanToOtlp(span).status).toEqual({ code: 2, message: "cancelled" });
  });
});

describe("buildOtlpExportRequest", () => {
  it("wraps spans with default service.name resource", () => {
    const req = buildOtlpExportRequest([makeFinishedSpan()]);
    expect(req.resourceSpans).toHaveLength(1);
    const resource = req.resourceSpans[0]!.resource;
    expect(resource.attributes).toContainEqual({
      key: "service.name",
      value: { stringValue: "vinhnt-sdk" },
    });
    expect(req.resourceSpans[0]!.scopeSpans[0]!.scope.name).toBe("@vinhnt-sdk/trace");
    expect(req.resourceSpans[0]!.scopeSpans[0]!.spans).toHaveLength(1);
  });

  it("uses provided resourceAttributes and scope", () => {
    const req = buildOtlpExportRequest([makeFinishedSpan()], {
      resourceAttributes: { "service.name": "my-svc", env: "test" },
      scopeName: "custom",
      scopeVersion: "1.0.0",
    });
    const resource = req.resourceSpans[0]!.resource;
    expect(resource.attributes).toContainEqual({
      key: "service.name",
      value: { stringValue: "my-svc" },
    });
    expect(resource.attributes).toContainEqual({ key: "env", value: { stringValue: "test" } });
    expect(req.resourceSpans[0]!.scopeSpans[0]!.scope).toEqual({
      name: "custom",
      version: "1.0.0",
    });
  });
});

describe("createOtlpSpanExporter", () => {
  it("throws ConfigurationError when no endpoint", () => {
    try {
      createOtlpSpanExporter({ env: {} });
      expect.unreachable("should throw");
    } catch (err) {
      expect(ConfigurationError.isInstance(err)).toBe(true);
      expect((err as Error).name).toBe("ConfigurationError");
    }
  });

  it("POSTs OTLP JSON to endpoint with headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const exporter = createOtlpSpanExporter({
      endpoint: "http://collector:4318/v1/traces",
      headers: { "x-custom": "1" },
      env: { OTEL_EXPORTER_OTLP_HEADERS: "authorization=Bearer t" },
      fetch: fetchMock,
    });

    await exporter.export([makeFinishedSpan()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://collector:4318/v1/traces");
    expect(init.method).toBe("POST");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(init.headers["authorization"]).toBe("Bearer t");
    expect(init.headers["x-custom"]).toBe("1");
    const body = JSON.parse(init.body as string);
    expect(body.resourceSpans[0].scopeSpans[0].spans).toHaveLength(1);
    await exporter.shutdown();
  });

  it("skips empty export and no-ops after shutdown", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const exporter = createOtlpSpanExporter({
      endpoint: "http://c/v1/traces",
      env: {},
      fetch: fetchMock,
    });
    await exporter.export([]);
    await exporter.shutdown();
    await exporter.export([makeFinishedSpan()]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws NetworkError on non-2xx response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("busy", { status: 503, statusText: "Unavailable" }));
    const exporter = createOtlpSpanExporter({
      endpoint: "http://c/v1/traces",
      env: {},
      fetch: fetchMock,
    });
    await expect(exporter.export([makeFinishedSpan()])).rejects.toMatchObject({
      name: "NetworkError",
    });
    await exporter.shutdown();
  });

  it("throws NetworkError when fetch rejects", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const exporter = createOtlpSpanExporter({
      endpoint: "http://c/v1/traces",
      env: {},
      fetch: fetchMock,
    });
    await expect(exporter.export([makeFinishedSpan()])).rejects.toMatchObject({
      name: "NetworkError",
    });
    await exporter.shutdown();
  });
});
