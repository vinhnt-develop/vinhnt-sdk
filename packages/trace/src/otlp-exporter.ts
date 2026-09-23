/**
 * OTLP/HTTP span exporter — maps custom Span → OTLP ExportTraceServiceRequest.
 *
 * Zero hard deps: pure JSON encoding over fetch (no @opentelemetry/* runtime dep).
 * Endpoint/headers/service name resolved from config first, then standard OTEL env vars.
 * Default path (no createOtlpSpanExporter call) remains unchanged — no-op / console telemetry.
 *
 * Env (read unless overridden in config):
 *   OTEL_EXPORTER_OTLP_TRACES_ENDPOINT  full URL for /v1/traces
 *   OTEL_EXPORTER_OTLP_ENDPOINT         base URL → <base>/v1/traces
 *   OTEL_EXPORTER_OTLP_HEADERS          k1=v1,k2=v2
 *   OTEL_SERVICE_NAME                   resource attribute service.name
 */

import { ConfigurationError, NetworkError } from "@vinhnt-sdk/schema";
import type { Span } from "./tracing.js";

/** Minimal fetch shape (injectable for tests / custom runtimes). */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Config for createOtlpSpanExporter — all fields optional; env fills gaps. */
export interface OtlpExporterConfig {
  /** Full OTLP/HTTP traces endpoint (overrides env). */
  endpoint?: string;
  /** Extra HTTP headers merged over env headers. */
  headers?: Record<string, string>;
  /** Resource attributes (service.name etc.). */
  resourceAttributes?: Record<string, unknown>;
  /** Export timeout in ms (default 10000). */
  timeoutMs?: number;
  /** Instrumentation scope name (default @vinhnt-sdk/trace). */
  scopeName?: string;
  /** Instrumentation scope version. */
  scopeVersion?: string;
  /** Env source for resolution (default process.env). Injectable for tests. */
  env?: Record<string, string | undefined>;
  /** Custom fetch (default globalThis.fetch). */
  fetch?: FetchLike;
}

/** Span exporter seam — default path stays no-op unless an exporter is wired. */
export interface SpanExporter {
  export(spans: readonly Span[]): Promise<void>;
  shutdown(): Promise<void>;
}

// ── OTLP JSON wire types (proto3 JSON mapping) ──

export type OtlpAnyValue =
  | { stringValue: string }
  | { boolValue: boolean }
  | { intValue: string }
  | { doubleValue: number }
  | { arrayValue: { values: OtlpAnyValue[] } }
  | { kvlistValue: { values: Array<{ key: string; value: OtlpAnyValue }> } };

export interface OtlpKeyValue {
  key: string;
  value: OtlpAnyValue;
}

export interface OtlpSpanEvent {
  timeUnixNano: string;
  name: string;
  attributes?: OtlpKeyValue[];
}

export interface OtlpSpanStatus {
  code: number;
  message?: string;
}

export interface OtlpSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: OtlpKeyValue[];
  events: OtlpSpanEvent[];
  status: OtlpSpanStatus;
}

export interface OtlpResourceSpans {
  resource: { attributes: OtlpKeyValue[] };
  scopeSpans: Array<{
    scope: { name: string; version?: string };
    spans: OtlpSpan[];
  }>;
}

export interface OtlpExportTraceRequest {
  resourceSpans: OtlpResourceSpans[];
}

/** OTLP span kind codes (proto Span.Kind). */
export const OTLP_SPAN_KIND: Record<string, number> = {
  internal: 1,
  server: 2,
  client: 3,
  producer: 4,
  consumer: 5,
};

/** OTLP status codes (proto Status.StatusCode). */
export const OTLP_STATUS_OK = 1;
export const OTLP_STATUS_ERROR = 2;
export const OTLP_STATUS_UNSET = 0;

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_SCOPE_NAME = "@vinhnt-sdk/trace";

/**
 * Resolve OTLP traces endpoint: config.endpoint > OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
 * > OTEL_EXPORTER_OTLP_ENDPOINT + "/v1/traces". Returns undefined if none set.
 */
export function resolveOtlpEndpoint(
  config?: Pick<OtlpExporterConfig, "endpoint" | "env">,
): string | undefined {
  const env = config?.env ?? (typeof process !== "undefined" ? process.env : undefined);
  if (config?.endpoint) return config.endpoint;
  const traces = env?.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  if (traces) return traces;
  const base = env?.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (base) {
    return base.endsWith("/v1/traces") ? base : `${base.replace(/\/+$/, "")}/v1/traces`;
  }
  return undefined;
}

/** Parse OTEL_EXPORTER_OTLP_HEADERS format `k1=v1,k2=v2`. */
export function parseOtlpHeaders(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const key = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

/** Deterministic FNV-1a → hex string of `length` chars (span/trace id wire form). */
export function toOtlpId(id: string, length: number): string {
  let hex = "";
  let seed = 0x811c9dc5;
  let round = 0;
  while (hex.length < length) {
    let h = seed;
    const input = `${id}#${round++}`;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    hex += (h >>> 0).toString(16).padStart(8, "0");
    seed = (h ^ 0x9e3779b9) >>> 0;
  }
  return hex.slice(0, length);
}

/** Convert ms epoch → OTLP timeUnixNano string. */
export function msToUnixNano(ms: number): string {
  return `${BigInt(Math.max(0, Math.trunc(ms))) * 1_000_000n}`;
}

/** Map a JS value to OTLP AnyValue. */
export function toOtlpAnyValue(value: unknown): OtlpAnyValue {
  if (value === null || value === undefined) return { stringValue: "" };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { boolValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) && Number.isSafeInteger(value)
      ? { intValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === "bigint") return { intValue: value.toString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toOtlpAnyValue) } };
  }
  if (typeof value === "object") {
    const values = Object.entries(value as Record<string, unknown>).map(
      ([key, v]) => ({ key, value: toOtlpAnyValue(v) }),
    );
    return { kvlistValue: { values } };
  }
  return { stringValue: String(value) };
}

/** Convert attributes record → OTLP key-value list. */
export function toOtlpAttributes(
  attributes: Record<string, unknown>,
): OtlpKeyValue[] {
  return Object.entries(attributes).map(([key, value]) => ({
    key,
    value: toOtlpAnyValue(value),
  }));
}

function mapStatus(status: string): OtlpSpanStatus {
  if (status === "ok") return { code: OTLP_STATUS_OK };
  if (status === "" || status === "unset") return { code: OTLP_STATUS_UNSET };
  // error | cancelled | timeout | custom → ERROR with message
  const result: OtlpSpanStatus = { code: OTLP_STATUS_ERROR };
  if (status !== "error") result.message = status;
  return result;
}

/** Map a custom Span → OTLP JSON span. Exported for unit tests / custom pipelines. */
export function mapSpanToOtlp(span: Span): OtlpSpan {
  const endMs = span.endTimeMs > 0 ? span.endTimeMs : span.startTimeMs;
  const out: OtlpSpan = {
    traceId: toOtlpId(span.traceId ?? span.id, 32),
    spanId: toOtlpId(span.id, 16),
    name: span.name,
    kind: OTLP_SPAN_KIND[span.kind] ?? OTLP_SPAN_KIND.internal!,
    startTimeUnixNano: msToUnixNano(span.startTimeMs),
    endTimeUnixNano: msToUnixNano(endMs),
    attributes: toOtlpAttributes(span.attributes),
    events: span.events.map((event) => ({
      timeUnixNano: msToUnixNano(event.timestampMs),
      name: event.name,
      attributes: toOtlpAttributes(event.attributes),
    })),
    status: mapStatus(span.status),
  };
  if (span.parentId) {
    out.parentSpanId = toOtlpId(span.parentId, 16);
  }
  return out;
}

/** Build full ExportTraceServiceRequest body. */
export function buildOtlpExportRequest(
  spans: readonly Span[],
  config?: Pick<OtlpExporterConfig, "resourceAttributes" | "scopeName" | "scopeVersion">,
): OtlpExportTraceRequest {
  const resourceAttrs: Record<string, unknown> = {
    ...(config?.resourceAttributes ?? {}),
  };
  if (resourceAttrs["service.name"] === undefined) {
    resourceAttrs["service.name"] = "vinhnt-sdk";
  }
  const scope: { name: string; version?: string } = {
    name: config?.scopeName ?? DEFAULT_SCOPE_NAME,
  };
  if (config?.scopeVersion !== undefined) {
    scope.version = config.scopeVersion;
  }
  return {
    resourceSpans: [
      {
        resource: { attributes: toOtlpAttributes(resourceAttrs) },
        scopeSpans: [
          {
            scope,
            spans: spans.map(mapSpanToOtlp),
          },
        ],
      },
    ],
  };
}

/**
 * Create an OTLP/HTTP span exporter (JSON encoding).
 *
 * @throws ConfigurationError if no endpoint in config or env.
 *
 * @example
 * ```typescript
 * const exporter = createOtlpSpanExporter({
 *   endpoint: "http://localhost:4318/v1/traces",
 * });
 * await exporter.export(recorder.getSpans());
 * await exporter.shutdown();
 * ```
 */
export function createOtlpSpanExporter(config: OtlpExporterConfig = {}): SpanExporter {
  const endpoint = resolveOtlpEndpoint(config);
  if (!endpoint) {
    throw new ConfigurationError(
      "OTLP endpoint not configured: set config.endpoint, OTEL_EXPORTER_OTLP_TRACES_ENDPOINT, or OTEL_EXPORTER_OTLP_ENDPOINT",
    );
  }
  const env = config.env ?? (typeof process !== "undefined" ? process.env : undefined);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...parseOtlpHeaders(env?.OTEL_EXPORTER_OTLP_HEADERS),
    ...(config.headers ?? {}),
  };
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl: FetchLike =
    config.fetch ??
    ((input, init) => {
      if (typeof globalThis.fetch !== "function") {
        throw new NetworkError("globalThis.fetch is not available; pass config.fetch");
      }
      return globalThis.fetch(input, init);
    });
  let closed = false;

  return {
    async export(spans: readonly Span[]): Promise<void> {
      if (closed) return;
      if (spans.length === 0) return;
      const body = JSON.stringify(buildOtlpExportRequest(spans, config));
      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (cause) {
        throw new NetworkError(`OTLP export failed: ${String(cause)}`, { cause });
      }
      if (!response.ok) {
        throw new NetworkError(
          `OTLP export failed: HTTP ${response.status} ${response.statusText}`,
        );
      }
    },
    async shutdown(): Promise<void> {
      closed = true;
    },
  };
}
