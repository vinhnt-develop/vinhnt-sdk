import { describe, it, expect, vi, beforeEach } from "vitest";
import { StepExecutor, type StepExecutorDeps } from "../src/step-executor.js";
import { ToolSaga, type ToolContext } from "@vinhnt-sdk/tools";
import type { RunId, ChatMessage } from "@vinhnt-sdk/schema";

function makeDeps(overrides: Partial<StepExecutorDeps> = {}): StepExecutorDeps {
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
    modelCaller: { callModelStream: vi.fn() } as never,
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

const toolCall = { toolId: "tc1", toolName: "execute_command", args: { command: "echo hi" } };

async function runOne(executor: StepExecutor, messages: ChatMessage[] = []) {
  return executor.executeToolCalls(
    [toolCall], messages, 1, "run1" as RunId,
    { traceId: "trace1" } as never,
    new AbortController(), "sess1",
    { model: "fake" } as never,
  );
}

describe("P3.3 sandboxMode wiring (kernel config → ToolContext.sandboxScope)", () => {
  let execute: ReturnType<typeof vi.fn>;
  let capturedCtx: ToolContext | undefined;

  beforeEach(() => {
    capturedCtx = undefined;
    execute = vi.fn().mockImplementation(async (_v: unknown, ctx: ToolContext) => {
      capturedCtx = ctx;
      return "ok";
    });
  });

  function wire(deps: StepExecutorDeps): StepExecutor {
    (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "write" });
    return new StepExecutor(deps);
  }

  it("TC01_sandboxMode_flows_into_tool_context", async () => {
    const executor = wire(makeDeps({ sandboxMode: "process" }));

    const result = await runOne(executor);

    expect(result.toolCallCount).toBe(1);
    expect(capturedCtx?.sandboxScope).toBe("process");
  });

  it("TC02_no_sandboxMode_keeps_context_field_undefined", async () => {
    const executor = wire(makeDeps());

    await runOne(executor);

    expect(capturedCtx?.sandboxScope).toBeUndefined();
  });

  it("TC03_host_mode_surfaces_verbatim", async () => {
    const executor = wire(makeDeps({ sandboxMode: "host" }));

    await runOne(executor);

    expect(capturedCtx?.sandboxScope).toBe("host");
  });

  it("TC04_container_mode_surfaces_for_fail_closed_backend", async () => {
    const executor = wire(makeDeps({ sandboxMode: "container" }));

    await runOne(executor);

    expect(capturedCtx?.sandboxScope).toBe("container");
  });
});
