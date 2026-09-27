import { describe, it, expect, vi } from "vitest";
import { handleApproval } from "../src/approval-handler.js";
import type { PermissionGate, PermissionCheckResult } from "../src/permission-gate.js";
import type { ToolExecutionPlan } from "../src/step-executor.js";
import type { ToolContext } from "@vinhnt-sdk/tools";
import type { AgentConfig, RequestContext, RunId } from "@vinhnt-sdk/schema";

const NEEDS_APPROVAL: PermissionCheckResult = {
  allowed: false,
  needsApproval: true,
  reason: "write_file requires approval",
};

function makeTc(): ToolExecutionPlan {
  return { toolId: "t1", toolName: "write_file", args: { filePath: "a.txt" } };
}

function makeCtx(ask: ToolContext["ask"]): ToolContext {
  return {
    sessionId: "session-1",
    runId: "run-1",
    agentId: "agent-1",
    agentName: "test",
    signal: new AbortController().signal,
    env: {},
    ask,
    metadata: vi.fn(),
    setCompensation: vi.fn(),
  };
}

function makeDeps(gate: { checkSavedApproval: PermissionGate["checkSavedApproval"]; hasSavedRejection: PermissionGate["hasSavedRejection"] }) {
  const emitEvent = vi.fn(async () => {});
  return {
    emitEvent,
    deps: {
      store: { emitEvent },
      permissionGate: gate as unknown as PermissionGate,
      pluginManager: undefined,
      currentAgent: undefined as AgentConfig | undefined,
    },
  };
}

function run(
  ask: ToolContext["ask"],
  gate: Parameters<typeof makeDeps>[0],
  messages: Parameters<typeof handleApproval>[6],
) {
  const { deps, emitEvent } = makeDeps(gate);
  return {
    emitEvent,
    promise: handleApproval(
      NEEDS_APPROVAL,
      makeTc(),
      makeCtx(ask),
      "run-1" as RunId,
      { traceId: "trace-1" } as RequestContext,
      "session-1",
      messages,
      deps,
    ),
  };
}

describe("handleApproval — terminal saved rejection", () => {
  it("TC01_saved_rejection_fails_tool_without_reopening_dialog", async () => {
    const ask = vi.fn(async () => "once" as const);
    const messages: Awaited<Parameters<typeof handleApproval>>[6] = [];
    const { promise, emitEvent } = run(
      ask,
      { checkSavedApproval: () => false, hasSavedRejection: () => true },
      messages,
    );

    await expect(promise).resolves.toBe(false);
    expect(ask).not.toHaveBeenCalled();
    expect(messages).toHaveLength(1);
    expect(messages[0]!.content).toContain("previously rejected");
    expect(emitEvent).toHaveBeenCalledTimes(1);
    expect(emitEvent.mock.calls[0]![0]).toMatchObject({ type: "tool.failed" });
  });

  it("TC02_no_saved_rejection_still_prompts_and_saves_rejection_on_reject", async () => {
    const ask = vi.fn(async () => "reject" as const);
    const saveRejection = vi.fn();
    const messages: Awaited<Parameters<typeof handleApproval>>[6] = [];
    const { promise, emitEvent } = run(
      ask,
      {
        checkSavedApproval: () => false,
        hasSavedRejection: () => false,
        saveRejection,
      } as never,
      messages,
    );

    await expect(promise).resolves.toBe(false);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(saveRejection).toHaveBeenCalledWith("write_file", { filePath: "a.txt" }, undefined);
    expect(emitEvent.mock.calls[0]![0]).toMatchObject({ type: "tool.failed" });
  });

  it("TC03_saved_approval_short_circuits_without_dialog", async () => {
    const ask = vi.fn(async () => "once" as const);
    const messages: Awaited<Parameters<typeof handleApproval>>[6] = [];
    const { promise } = run(
      ask,
      { checkSavedApproval: () => true, hasSavedRejection: () => false },
      messages,
    );

    await expect(promise).resolves.toBe(true);
    expect(ask).not.toHaveBeenCalled();
    expect(messages).toHaveLength(0);
  });
});
