import { describe, it, expect, vi, beforeEach } from "vitest";
import { StepExecutor, type StepExecutorDeps } from "../src/step-executor.js";
import { ToolSaga } from "@vinhnt-sdk/tools";
import {
  ToolInvokedDataSchema,
  ToolCompletedDataSchema,
  ToolFailedDataSchema,
} from "@vinhnt-sdk/schema";
import type { RunId } from "@vinhnt-sdk/schema";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

interface CapturedEvent {
  type: string;
  data: Record<string, unknown>;
}

function makeDeps(overrides: Partial<StepExecutorDeps> = {}): Mutable<StepExecutorDeps> {
  return {
    store: { emitEvent: vi.fn() },
    addSessionMessage: vi.fn(),
    pluginManager: { fireHook: vi.fn() } as never,
    permissionGate: {
      checkTool: vi.fn().mockReturnValue({ allowed: true }),
      askForTool: vi.fn().mockResolvedValue("once" as const),
      checkSavedApproval: vi.fn().mockReturnValue(false),
      hasSavedRejection: vi.fn().mockReturnValue(false),
      saveApproval: vi.fn(),
    } as never,
    modelCaller: {
      callModelStream: vi.fn().mockResolvedValue({ content: "ok" }),
    } as never,
    maxToolCallsPerStep: 20,
    maxSelfCorrectAttempts: 2,
    selfCorrectOnFailure: false,
    currentAgent: undefined,
    saga: new ToolSaga(),
    findTool: vi.fn(),
    hasTool: vi.fn().mockReturnValue(false),
    ...overrides,
  } as StepExecutorDeps;
}

function captureEvents(deps: Mutable<StepExecutorDeps>): CapturedEvent[] {
  const out: CapturedEvent[] = [];
  const impl = deps.store.emitEvent as ReturnType<typeof vi.fn>;
  impl.mockImplementation(async (event: { type: string; data: Record<string, unknown> }) => {
    out.push({ type: event.type, data: event.data });
  });
  return out;
}

describe("E3 tool payload provenance (source/risk/durationMs, off-wire)", () => {
  let deps: Mutable<StepExecutorDeps>;
  let executor: StepExecutor;
  let events: CapturedEvent[];

  beforeEach(() => {
    deps = makeDeps();
    executor = new StepExecutor(deps);
    events = captureEvents(deps);
  });

  it("TC01_invoked_carries_source_and_risk_completed_carries_duration", async () => {
    const execute = vi.fn().mockResolvedValue("file content");
    (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({
      execute, risk: "write", metadata: { source: "mcp" },
    });

    const result = await executor.executeToolCalls(
      [{ toolId: "tc1", toolName: "write_file", args: { filePath: "/a.ts" } }],
      [], 1, "run1" as RunId,
      { traceId: "trace1" } as never,
      new AbortController(), "sess1",
      { model: "fake" } as never,
    );
    expect(result.toolCallCount).toBe(1);

    const invoked = events.find((e) => e.type === "tool.invoked");
    expect(invoked, "tool.invoked must be emitted").toBeTruthy();
    const invParsed = ToolInvokedDataSchema.safeParse(invoked!.data);
    expect(invParsed.success, JSON.stringify(invParsed)).toBe(true);
    expect(invoked!.data.source).toBe("mcp");
    expect(invoked!.data.risk).toBe("write");

    const completed = events.find((e) => e.type === "tool.completed");
    expect(completed, "tool.completed must be emitted").toBeTruthy();
    const compParsed = ToolCompletedDataSchema.safeParse(completed!.data);
    expect(compParsed.success, JSON.stringify(compParsed)).toBe(true);
    expect(completed!.data.source).toBe("mcp");
    expect(completed!.data.risk).toBe("write");
    expect(typeof completed!.data.durationMs).toBe("number");
    expect(completed!.data.durationMs as number).toBeGreaterThanOrEqual(0);
  });

  it("TC02_failed_carries_source_risk_and_duration_when_execution_started", async () => {
    const execute = vi.fn().mockRejectedValue(new Error("boom"));
    (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({
      execute, risk: "dangerous", metadata: { source: "system" },
    });

    await executor.executeToolCalls(
      [{ toolId: "tc1", toolName: "shell", args: { command: "exit 1" } }],
      [], 1, "run1" as RunId,
      { traceId: "trace1" } as never,
      new AbortController(), "sess1",
      { model: "fake" } as never,
    );

    const failed = events.find((e) => e.type === "tool.failed");
    expect(failed, "tool.failed must be emitted").toBeTruthy();
    const parsed = ToolFailedDataSchema.safeParse(failed!.data);
    expect(parsed.success, JSON.stringify(parsed)).toBe(true);
    expect(failed!.data.source).toBe("system");
    expect(failed!.data.risk).toBe("dangerous");
    expect(typeof failed!.data.durationMs).toBe("number");
    expect(failed!.data.durationMs as number).toBeGreaterThanOrEqual(0);
  });

  it("TC03_omits_source_when_tool_has_no_metadata_but_keeps_risk", async () => {
    const execute = vi.fn().mockResolvedValue("ok");
    (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });

    await executor.executeToolCalls(
      [{ toolId: "tc1", toolName: "read_file", args: { filePath: "/a.ts" } }],
      [], 1, "run1" as RunId,
      { traceId: "trace1" } as never,
      new AbortController(), "sess1",
      { model: "fake" } as never,
    );

    const invoked = events.find((e) => e.type === "tool.invoked");
    expect(invoked).toBeTruthy();
    expect(ToolInvokedDataSchema.safeParse(invoked!.data).success).toBe(true);
    expect(invoked!.data.source).toBeUndefined();
    expect(invoked!.data.risk).toBe("read");
  });

  it("TC04_denied_event_carries_source_and_risk", async () => {
    const gate = {
      checkTool: vi.fn().mockReturnValue({ allowed: false, needsApproval: false, reason: "policy deny" }),
      askForTool: vi.fn(),
      checkSavedApproval: vi.fn().mockReturnValue(false),
      hasSavedRejection: vi.fn().mockReturnValue(false),
      saveApproval: vi.fn(),
    };
    deps.permissionGate = gate as never;
    executor = new StepExecutor(deps);
    (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({
      execute: vi.fn(), risk: "read", metadata: { source: "custom" },
    });

    await executor.executeToolCalls(
      [{ toolId: "tc1", toolName: "read_file", args: { filePath: "/a.ts" } }],
      [], 1, "run1" as RunId,
      { traceId: "trace1" } as never,
      new AbortController(), "sess1",
      { model: "fake" } as never,
    );

    const failed = events.find((e) => e.type === "tool.failed");
    expect(failed, "denied tool must emit tool.failed").toBeTruthy();
    expect(ToolFailedDataSchema.safeParse(failed!.data).success).toBe(true);
    expect(failed!.data.decision).toBe("deny");
    expect(failed!.data.source).toBe("custom");
    expect(failed!.data.risk).toBe("read");
    expect(failed!.data.durationMs).toBeUndefined();
  });
});
