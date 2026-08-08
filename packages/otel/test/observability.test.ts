import { describe, expect, it, vi } from "vitest";
import { existsSync, statSync, unlinkSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { Logger } from "../src/logger.js";
import { ConsoleSink } from "../src/console-sink.js";
import { FileSink } from "../src/file-sink.js";
import { Tracer } from "../src/tracer.js";
import { AuditLog } from "../src/audit.js";
import { OTelTracerSink } from "../src/otel-sink.js";
import type { LogEntry, LoggerSink } from "../src/logger.js";
import type { Span, TracerSink } from "../src/tracer.js";
import type { AuditEntry, AuditSink } from "../src/audit.js";

describe("Logger", () => {
  it("logs messages at info level by default", () => {
    const entries: LogEntry[] = [];
    const sink: LoggerSink = { write: (e) => entries.push(e) };
    const log = new Logger({ sinks: [sink] });

    log.info("hello");
    log.debug("not shown");

    expect(entries).toHaveLength(1);
    expect(entries[0]?.message).toBe("hello");
    expect(entries[0]?.level).toBe("info");
  });

  it("respects minLevel", () => {
    const entries: LogEntry[] = [];
    const sink: LoggerSink = { write: (e) => entries.push(e) };
    const log = new Logger({ minLevel: "warn", sinks: [sink] });

    log.info("info");
    log.warn("warn");
    log.error("error");

    expect(entries).toHaveLength(2);
    expect(entries[0]?.level).toBe("warn");
    expect(entries[1]?.level).toBe("error");
  });

  it("creates child logger with merged context", () => {
    const entries: LogEntry[] = [];
    const sink: LoggerSink = { write: (e) => entries.push(e) };
    const parent = new Logger({ sinks: [sink], context: { app: "test" } });
    const child = parent.child({ requestId: "req-1" });

    child.info("msg");

    expect(entries[0]?.context).toEqual({ app: "test", requestId: "req-1" });
  });

  it("logs error with error details", () => {
    const entries: LogEntry[] = [];
    const sink: LoggerSink = { write: (e) => entries.push(e) };
    const log = new Logger({ sinks: [sink] });

    log.error("failed", new Error("kaboom"));

    expect(entries[0]?.level).toBe("error");
    expect(entries[0]?.error?.message).toBe("kaboom");
  });
});

describe("ConsoleSink", () => {
  it("writes to stderr without throwing", () => {
    const sink = new ConsoleSink();
    expect(() => sink.write({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "test",
    })).not.toThrow();
  });
});

describe("FileSink", () => {
  it("writes JSON lines to file", () => {
    const tmp = `test-observability-${Date.now()}.log`;
    const sink = new FileSink(tmp);
    sink.write({ timestamp: "t1", level: "info", message: "hello" });
    sink.write({ timestamp: "t2", level: "error", message: "bye" });

    const content = readFileSync(tmp, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);
    unlinkSync(tmp);
  });

  it("rotates log file when maxSize is exceeded", () => {
    const dir = mkdtempSync(join(tmpdir(), "vnt-rotate-test-"));
    const logFile = join(dir, "test-rotate.log");
    const sink = new FileSink(logFile, { maxSize: 10, maxFiles: 3 });

    const entry = { timestamp: "t", level: "info" as const, message: "x" };
    for (let i = 0; i < 10; i++) {
      sink.write(entry);
    }

    const rotated1 = `${logFile}.1`;
    expect(existsSync(rotated1)).toBe(true);
    expect(statSync(rotated1).size).toBeGreaterThan(0);

    rmSync(dir, { recursive: true, force: true });
  });

  it("respects maxFiles retention", () => {
    const dir = mkdtempSync(join(tmpdir(), "vnt-rotate-max-"));
    const logFile = join(dir, "test-max.log");
    const sink = new FileSink(logFile, { maxSize: 20, maxFiles: 2 });

    const entry = { timestamp: "t", level: "info" as const, message: "x".repeat(30) };
    for (let i = 0; i < 20; i++) {
      sink.write(entry);
    }

    const rotated3 = `${logFile}.3`;
    expect(existsSync(rotated3)).toBe(false);

    rmSync(dir, { recursive: true, force: true });
  });

  it("does not rotate when file is small", () => {
    const tmp = `test-no-rotate-${Date.now()}.log`;
    const sink = new FileSink(tmp, { maxSize: 10 * 1024 * 1024 });

    sink.write({ timestamp: "t", level: "info", message: "small" });
    expect(existsSync(`${tmp}.1`)).toBe(false);

    unlinkSync(tmp);
  });
});

describe("Tracer", () => {
  it("starts and ends a span", () => {
    const spans: Span[] = [];
    const sink: TracerSink = { onSpanEnd: (s) => spans.push(s), onSpanEvent: () => {} };
    const tracer = new Tracer();
    tracer.addSink(sink);

    const span = tracer.startSpan("test");
    tracer.endSpan(span.spanId);

    expect(spans).toHaveLength(1);
    expect(spans[0]?.name).toBe("test");
    expect(spans[0]?.status).toBe("ok");
    expect(spans[0]?.endTime).toBeDefined();
  });

  it("creates child spans with same traceId", () => {
    const spans: Span[] = [];
    const sink: TracerSink = { onSpanEnd: (s) => spans.push(s), onSpanEvent: () => {} };
    const tracer = new Tracer();
    tracer.addSink(sink);

    const parent = tracer.startSpan("parent");
    const child = tracer.startSpan("child", { parentSpanId: parent.spanId });
    tracer.endSpan(child.spanId);
    tracer.endSpan(parent.spanId);

    expect(child.traceId).toBe(parent.traceId);
  });

  it("inSpan executes function and ends span", async () => {
    const spans: Span[] = [];
    const sink: TracerSink = { onSpanEnd: (s) => spans.push(s), onSpanEvent: () => {} };
    const tracer = new Tracer();
    tracer.addSink(sink);

    const result = await tracer.inSpan("work", async (span) => {
      return `result-${span.spanId}`;
    });

    expect(result).toContain("result-");
    expect(spans).toHaveLength(1);
    expect(spans[0]?.status).toBe("ok");
  });

  it("inSpan marks error when function throws", async () => {
    const spans: Span[] = [];
    const sink: TracerSink = { onSpanEnd: (s) => spans.push(s), onSpanEvent: () => {} };
    const tracer = new Tracer();
    tracer.addSink(sink);

    await expect(tracer.inSpan("fail", async () => { throw new Error("oops"); })).rejects.toThrow();

    expect(spans).toHaveLength(1);
    expect(spans[0]?.status).toBe("error");
    expect(spans[0]?.error).toBe("oops");
  });

  it("calls onSpanStart when span is created", () => {
    const started: Span[] = [];
    const tracer = new Tracer();
    tracer.addSink({ onSpanEnd: () => {}, onSpanEvent: () => {}, onSpanStart: (s) => started.push(s) });

    const span = tracer.startSpan("test-start");
    expect(started).toHaveLength(1);
    expect(started[0]?.name).toBe("test-start");
    expect(started[0]?.spanId).toBe(span.spanId);
  });

  it("inSpan provides current context via getCurrentContext", async () => {
    const tracer = new Tracer();
    let captured: { traceId: string; spanId: string } | undefined;

    await tracer.inSpan("ctx-test", async (span) => {
      captured = Tracer.getCurrentContext();
      return "done";
    });

    expect(captured).toBeDefined();
    expect(captured!.traceId).toBeDefined();
    expect(captured!.spanId).toBeDefined();
  });

  it("getCurrentContext returns undefined outside of inSpan", () => {
    expect(Tracer.getCurrentContext()).toBeUndefined();
  });
});

describe("AuditLog", () => {
  it("records audit entries and delivers to sink", () => {
    const entries: AuditEntry[] = [];
    const sink: AuditSink = { write: (e) => entries.push(e) };
    const audit = new AuditLog();
    audit.addSink(sink);

    audit.record("tool.executed", { traceId: "t1", actorId: "user1", tenantId: "local" }, { toolId: "test" });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe("tool.executed");
    expect(entries[0]?.traceId).toBe("t1");
    expect(entries[0]?.actorId).toBe("user1");
    expect(entries[0]?.details).toEqual({ toolId: "test" });
  });

  it("records multiple sinks", () => {
    const e1: AuditEntry[] = [];
    const e2: AuditEntry[] = [];
    const audit = new AuditLog();
    audit.addSink({ write: (e) => e1.push(e) });
    audit.addSink({ write: (e) => e2.push(e) });

    audit.record("run.started", { traceId: "t1", actorId: "u1", tenantId: "local" });

    expect(e1).toHaveLength(1);
    expect(e2).toHaveLength(1);
  });

  it("query returns all entries when no filter is given", () => {
    const audit = new AuditLog();
    audit.record("run.started", { traceId: "t1", actorId: "u1", tenantId: "local" });
    audit.record("tool.executed", { traceId: "t1", actorId: "u1", tenantId: "local" });

    const result = audit.query();
    expect(result.total).toBe(2);
    expect(result.entries).toHaveLength(2);
  });

  it("query filters by actorId", () => {
    const audit = new AuditLog();
    audit.record("run.started", { traceId: "t1", actorId: "alice", tenantId: "local" });
    audit.record("run.started", { traceId: "t2", actorId: "bob", tenantId: "local" });

    const result = audit.query({ actorId: "alice" });
    expect(result.total).toBe(1);
    expect(result.entries[0]?.actorId).toBe("alice");
  });

  it("query filters by action", () => {
    const audit = new AuditLog();
    audit.record("run.started", { traceId: "t1", actorId: "u1", tenantId: "local" });
    audit.record("tool.executed", { traceId: "t2", actorId: "u1", tenantId: "local" });

    const result = audit.query({ action: "tool.executed" });
    expect(result.total).toBe(1);
    expect(result.entries[0]?.action).toBe("tool.executed");
  });

  it("query filters by timeRange", () => {
    const audit = new AuditLog();
    const before = new Date(Date.now() - 10_000).toISOString();
    const after = new Date(Date.now() + 10_000).toISOString();
    audit.record("run.started", { traceId: "t1", actorId: "u1", tenantId: "local" });

    const result = audit.query({ timeRange: { start: before, end: after } });
    expect(result.total).toBe(1);
  });

  it("query respects limit and offset", () => {
    const audit = new AuditLog();
    for (let i = 0; i < 10; i++) {
      audit.record("run.started", { traceId: `t${i}`, actorId: "u1", tenantId: "local" });
    }

    const result = audit.query({ limit: 3, offset: 2 });
    expect(result.total).toBe(10);
    expect(result.entries).toHaveLength(3);
  });

  it("capped at maxEntries", () => {
    const audit = new AuditLog({ maxEntries: 5 });
    for (let i = 0; i < 10; i++) {
      audit.record("run.started", { traceId: `t${i}`, actorId: "u1", tenantId: "local" });
    }

    expect(audit.query().total).toBe(5);
  });

  it("query merges results from sink with query support", () => {
    const stored: AuditEntry[] = [];
    const persistentSink: AuditSink = {
      write: (e) => stored.push(e),
      query: (filter) => {
        let matched = stored;
        if (filter?.action) matched = matched.filter((e) => e.action === filter.action);
        return { entries: matched, total: matched.length };
      },
    };
    const audit = new AuditLog();
    audit.addSink(persistentSink);
    audit.record("run.started", { traceId: "t1", actorId: "u1", tenantId: "local" });
    audit.record("tool.executed", { traceId: "t2", actorId: "u1", tenantId: "local" });

    // Direct sink query
    const sinkResult = persistentSink.query!({ action: "tool.executed" });
    expect(sinkResult.total).toBe(1);

    // AuditLog.query also includes sink entries
    const all = audit.query();
    expect(all.total).toBe(2);
  });
});

describe("Logger with trace context", () => {
  it("includes traceId and spanId when traceContextProvider is set", () => {
    const entries: LogEntry[] = [];
    const sink: LoggerSink = { write: (e) => entries.push(e) };
    const log = new Logger({
      sinks: [sink],
      traceContextProvider: () => ({ traceId: "trace-1", spanId: "span-1" }),
    });

    log.info("test");

    expect(entries[0]?.traceId).toBe("trace-1");
    expect(entries[0]?.spanId).toBe("span-1");
  });

  it("child logger inherits traceContextProvider", () => {
    const entries: LogEntry[] = [];
    const sink: LoggerSink = { write: (e) => entries.push(e) };
    const parent = new Logger({
      sinks: [sink],
      traceContextProvider: () => ({ traceId: "trace-c", spanId: "span-c" }),
    });
    const child = parent.child({ module: "child" });

    child.info("from child");

    expect(entries[0]?.traceId).toBe("trace-c");
    expect(entries[0]?.spanId).toBe("span-c");
  });

  it("does not include traceId/spanId when provider returns undefined", () => {
    const entries: LogEntry[] = [];
    const sink: LoggerSink = { write: (e) => entries.push(e) };
    const log = new Logger({ sinks: [sink] });

    log.info("no trace");

    expect(entries[0]?.traceId).toBeUndefined();
    expect(entries[0]?.spanId).toBeUndefined();
  });
});

describe("OTelTracerSink", () => {
  it("can be constructed without options", () => {
    const sink = new OTelTracerSink();
    expect(sink).toBeDefined();
  });

  it("can be constructed with custom endpoint", () => {
    const sink = new OTelTracerSink({ endpoint: "http://localhost:4318/v1/traces", serviceName: "test" });
    expect(sink).toBeDefined();
  });

  it("handles span lifecycle without throwing", () => {
    const sink = new OTelTracerSink();
    const tracer = new Tracer();
    tracer.addSink(sink);

    const span = tracer.startSpan("otel-test");
    tracer.addEvent(span.spanId, "event1", { key: "value" });
    tracer.endSpan(span.spanId);
  });

  it("can be shut down", async () => {
    const sink = new OTelTracerSink();
    await sink.shutdown();
  });
});
