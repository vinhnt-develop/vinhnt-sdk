import { describe, expect, it } from "vitest";
import { KnownRunEventSchema, parseRunEvent, safeParseRunEvent } from "@vinhnt-sdk/schema";

function makeBase(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_001",
    runId: "run_abc",
    sequence: 1,
    occurredAt: "2026-07-16T00:00:00.000Z",
    traceId: "trace_xyz",
    ...overrides,
  };
}

describe("parseRunEvent", () => {
  it("parses a valid run.started event", () => {
    const raw = { ...makeBase({ type: "run.started" }), data: { prompt: "Hello" } };
    const evt = parseRunEvent(raw);
    expect(evt.type).toBe("run.started");
    expect((evt.data as { prompt: string }).prompt).toBe("Hello");
  });

  it("parses a valid tool.invoked event", () => {
    const raw = {
      ...makeBase({ type: "tool.invoked" }),
      data: { toolId: "t1", toolName: "read_file", input: { path: "/tmp" } },
    };
    const evt = parseRunEvent(raw);
    expect(evt.type).toBe("tool.invoked");
    expect((evt.data as { toolName: string }).toolName).toBe("read_file");
  });

  it("parses a valid run.completed event with enum status", () => {
    const raw = { ...makeBase({ type: "run.completed" }), data: { status: "succeeded", totalSteps: 3 } };
    const evt = parseRunEvent(raw);
    expect(evt.type).toBe("run.completed");
    expect((evt.data as { status: string }).status).toBe("succeeded");
  });

  it("rejects run.completed with invalid status", () => {
    const raw = { ...makeBase({ type: "run.completed" }), data: { status: "invalid_status" } };
    const result = safeParseRunEvent(raw);
    expect(result.success).toBe(false);
  });

  it("rejects unknown event type", () => {
    const raw = { ...makeBase({ type: "custom.event" }), data: {} };
    const result = safeParseRunEvent(raw);
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const raw = { type: "run.started", data: { prompt: "Hi" } };
    const result = safeParseRunEvent(raw);
    expect(result.success).toBe(false);
  });

  it("parses all known event types", () => {
    const types = [
      "run.started", "step.started", "token.streamed",
      "thinking.started", "thinking.content", "thinking.completed",
      "context.compressed", "token.counted", "model.cost",
      "tool.invoked", "tool.completed", "tool.failed", "tool.self_correcting",
      "step.completed", "step.failed", "run.completed",
      "permission.requested", "permission.replied", "step.type_changed",
    ] as const;

    const dataMap: Record<string, Record<string, unknown>> = {
      "run.started": { prompt: "x" },
      "run.completed": { status: "succeeded" },
      "step.started": { step: 1 },
      "step.completed": { step: 1, toolCallCount: 0 },
      "step.failed": { step: 1, reason: "timeout", error: "Model call timed out after 1000ms" },
      "token.streamed": { content: "hello", step: 1 },
      "thinking.started": { step: 1 },
      "thinking.content": { content: "hmm", step: 1 },
      "thinking.completed": { content: "done", step: 1 },
      "context.compressed": { originalCount: 10, compressedCount: 3, step: 1 },
      "token.counted": { inputTokens: 100, step: 1 },
      "model.cost": { inputTokens: 100, outputTokens: 50, cost: 0.01, model: "gpt-4", durationMs: 500, step: 1 },
      "tool.invoked": { toolId: "t", toolName: "n", input: {} },
      "tool.completed": { toolId: "t", toolName: "n", output: {} },
      "tool.failed": { toolId: "t", toolName: "n", error: "err" },
      "tool.self_correcting": { toolId: "t", toolName: "n", error: "err", attempt: 1 },
      "permission.requested": { requestId: "req1", toolName: "n", resource: "tool.n", reason: "test", prompt: "Allow?" },
      "permission.replied": { requestId: "req1", reply: "once" },
      "step.type_changed": { stepType: "executing_bash", stepNumber: 1, toolName: "bash" },
    };

    for (const type of types) {
      const data = dataMap[type];
      const raw = { ...makeBase({ type }), data };
      const result = safeParseRunEvent(raw);
      expect(result.success, `Expected ${type} to parse, got ${JSON.stringify(result)}`).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(type);
      }
    }
  });

  it("propagates sequence and traceId through parse", () => {
    const raw = {
      ...makeBase({ type: "step.completed", sequence: 42, traceId: "trace_deep" }),
      data: { step: 5, toolCallCount: 3 },
    };
    const evt = parseRunEvent(raw);
    expect(evt.sequence).toBe(42);
    expect(evt.traceId).toBe("trace_deep");
  });

  it("parses event with version field", () => {
    const raw = { ...makeBase({ type: "run.started", version: 1 }), data: { prompt: "Hi" } };
    const evt = parseRunEvent(raw);
    expect(evt.version).toBe(1);
  });

  it("parses event without version field (optional)", () => {
    const raw = { ...makeBase({ type: "run.started" }), data: { prompt: "Hi" } };
    const evt = parseRunEvent(raw);
    expect(evt.version).toBeUndefined();
  });
});

describe("EventRegistry auto-generation", () => {
  it("ALL_EVENT_DEFS derived from registry contains all durable runId events", async () => {
    const { EventRegistry } = await import("@vinhnt-sdk/event");
    const all = EventRegistry.getAll();
    const durableRunId = all.filter((d) => d.durable?.aggregate === "runId");
    expect(durableRunId.length).toBeGreaterThanOrEqual(10);
    for (const def of durableRunId) {
      expect(def.type).toBeTruthy();
      if (def.schema) {
        expect(def.schema).toBeTruthy();
      }
    }
  });

  it("all durable event definitions have linked Zod schemas", async () => {
    const { EventRegistry } = await import("@vinhnt-sdk/event");
    const all = EventRegistry.getAll();
    const durable = all.filter((d) => d.durable);
    for (const def of durable) {
      expect(def.schema, `Event "${def.type}" should have a linked Zod schema`).toBeTruthy();
    }
  });
});
