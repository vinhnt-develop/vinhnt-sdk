import { describe, expect, it } from "vitest";
import { Tracer } from "../src/tracer.js";
import type { RequestContext } from "@vinhnt-sdk/agent-core";

const testCtx: RequestContext = {
  requestId: "req-1" as never,
  traceId: "trace-1" as never,
  actorId: "test",
  tenantId: "default",
};

describe("Tracer", () => {
  it("creates child context with same traceId", () => {
    const tracer = new Tracer(testCtx);
    const child = tracer.createChild();
    expect(child.traceId).toBe("trace-1");
    expect(child.requestId).not.toBe("req-1");
  });

  it("startSpan and endSpan records timing", () => {
    const tracer = new Tracer(testCtx);
    tracer.startSpan("work");
    const result = tracer.endSpan();
    expect(result).not.toBeNull();
    expect(result!.name).toBe("work");
    expect(result!.durationMs).toBeGreaterThanOrEqual(0);
    expect(result!.ctx.traceId).toBe("trace-1");
  });

  it("endSpan returns null when no active span", () => {
    const tracer = new Tracer(testCtx);
    expect(tracer.endSpan()).toBeNull();
  });

  it("wrap attaches ctx to result", async () => {
    const tracer = new Tracer(testCtx);
    const result = await tracer.wrap("compute", async () => ({ value: 42 }));
    expect(result.value).toBe(42);
    expect(result.ctx.traceId).toBe("trace-1");
  });

  it("wrap preserves error", async () => {
    const tracer = new Tracer(testCtx);
    await expect(tracer.wrap("fail", async () => {
      throw new Error("boom");
    })).rejects.toThrow("boom");
  });

  it("validate accepts valid RequestContext", () => {
    const tracer = new Tracer(testCtx);
    expect(tracer.validate(testCtx)).toEqual(testCtx);
  });

  it("validate rejects invalid input", () => {
    const tracer = new Tracer(testCtx);
    expect(() => tracer.validate({})).toThrow();
  });

  it("currentCtx returns baseCtx when no span active", () => {
    const tracer = new Tracer(testCtx);
    expect(tracer.currentCtx.traceId).toBe("trace-1");
  });

  it("currentCtx returns active span ctx", () => {
    const tracer = new Tracer(testCtx);
    const childCtx = tracer.createChild();
    tracer.startSpan("sub-span", childCtx);
    expect(tracer.currentCtx.requestId).toBe(childCtx.requestId);
    tracer.endSpan();
  });
});
