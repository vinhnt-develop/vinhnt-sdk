import { describe, it, expect, vi, beforeEach } from "vitest";
import { StepExecutor, type StepExecutorDeps } from "../src/step-executor.js";
import { ToolSaga } from "@vinhnt-sdk/tools";
import type { RunId, ChatMessage } from "@vinhnt-sdk/schema";
import type { ToolGuard } from "@vinhnt-sdk/guard";

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

const toolCall = { toolId: "tc1", toolName: "write_file", args: { filePath: "/a.ts" } };

async function runOne(executor: StepExecutor, messages: ChatMessage[] = []) {
  return executor.executeToolCalls(
    [toolCall], messages, 1, "run1" as RunId,
    { traceId: "trace1" } as never,
    new AbortController(), "sess1",
    { model: "fake" } as never,
  );
}

function findToolFailed(deps: StepExecutorDeps): { decision?: string; error?: string } | undefined {
  return (deps.store.emitEvent as ReturnType<typeof vi.fn>).mock.calls
    .map((c) => c[0] as { type: string; data: { decision?: string; error?: string } })
    .find((e) => e.type === "tool.failed")?.data;
}

describe("P3.1 tool guards (evaluateGuards wiring)", () => {
  let execute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    execute = vi.fn().mockResolvedValue("written");
  });

  function wireFindTool(deps: StepExecutorDeps): StepExecutorDeps {
    (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "write" });
    return deps;
  }

  it("TC01_deny_guard_blocks_execution_and_emits_tool_failed", async () => {
    const denyGuard: ToolGuard = {
      name: "no-write",
      check: vi.fn().mockResolvedValue({ decision: "deny", reason: "writes forbidden in plan mode" }),
    };
    const deps = wireFindTool(makeDeps({ guards: [denyGuard] }));
    const messages: ChatMessage[] = [];

    const result = await runOne(new StepExecutor(deps), messages);

    expect(execute).not.toHaveBeenCalled();
    const failed = findToolFailed(deps);
    expect(failed).toBeTruthy();
    expect(failed!.decision).toBe("deny");
    expect(failed!.error).toContain("writes forbidden in plan mode");
    expect(result.toolCallCount).toBe(0);
    expect(messages.some((m) => String(m.content).includes("writes forbidden"))).toBe(true);
  });

  it("TC02_deny_guard_wins_over_allowed_permission_and_saved_approval", async () => {
    const gate = {
      checkTool: vi.fn().mockReturnValue({ allowed: true }),
      askForTool: vi.fn().mockResolvedValue("once" as const),
      checkSavedApproval: vi.fn().mockReturnValue(true),
      hasSavedRejection: vi.fn().mockReturnValue(false),
      saveApproval: vi.fn(),
    };
    const denyCheck = vi.fn().mockResolvedValue({ decision: "deny" as const, reason: "blocked by policy" });
    const denyGuard: ToolGuard = { name: "deny-always", check: denyCheck };
    const deps = wireFindTool(makeDeps({ guards: [denyGuard], permissionGate: gate as never }));

    await runOne(new StepExecutor(deps));

    expect(execute).not.toHaveBeenCalled();
    expect(gate.askForTool).not.toHaveBeenCalled();
    expect(denyCheck).toHaveBeenCalledOnce();
  });

  it("TC03_escalate_guard_forces_user_ask_reject_blocks", async () => {
    const gate = {
      checkTool: vi.fn().mockReturnValue({ allowed: true }),
      askForTool: vi.fn().mockResolvedValue("reject" as const),
      checkSavedApproval: vi.fn().mockReturnValue(false),
      hasSavedRejection: vi.fn().mockReturnValue(false),
      saveApproval: vi.fn(),
    };
    const escalateGuard: ToolGuard = {
      name: "sensitive",
      check: async () => ({ decision: "escalate" as const, reason: "sensitive path — confirm with user" }),
    };
    const deps = wireFindTool(makeDeps({ guards: [escalateGuard], permissionGate: gate as never }));
    const messages: ChatMessage[] = [];

    const result = await runOne(new StepExecutor(deps), messages);

    expect(gate.askForTool).toHaveBeenCalledTimes(1);
    expect(gate.askForTool.mock.calls[0]!.at(-1)).toMatchObject({
      forceAsk: true, permissionKey: "guard_escalate",
    });
    expect(execute).not.toHaveBeenCalled();
    expect(result.toolCallCount).toBe(0);
    expect(messages.some((m) => String(m.content).includes("rejected by user"))).toBe(true);
  });

  it("TC04_escalate_guard_approve_proceeds_to_execution", async () => {
    const gate = {
      checkTool: vi.fn().mockReturnValue({ allowed: true }),
      askForTool: vi.fn().mockResolvedValue("once" as const),
      checkSavedApproval: vi.fn().mockReturnValue(false),
      hasSavedRejection: vi.fn().mockReturnValue(false),
      saveApproval: vi.fn(),
    };
    const escalateGuard: ToolGuard = {
      name: "sensitive",
      check: async () => ({ decision: "escalate" as const, reason: "confirm" }),
    };
    const deps = wireFindTool(makeDeps({ guards: [escalateGuard], permissionGate: gate as never }));

    const result = await runOne(new StepExecutor(deps));

    expect(gate.askForTool).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledOnce();
    expect(result.toolCallCount).toBe(1);
  });

  it("TC05_allow_guard_and_no_guards_keep_normal_flow", async () => {
    const allowGuard: ToolGuard = {
      name: "permissive",
      check: async () => ({ decision: "allow" as const }),
    };
    const withGuard = wireFindTool(makeDeps({ guards: [allowGuard] }));
    const r1 = await runOne(new StepExecutor(withGuard));
    expect(execute).toHaveBeenCalledOnce();
    expect(r1.toolCallCount).toBe(1);

    const bare = wireFindTool(makeDeps());
    const r2 = await runOne(new StepExecutor(bare));
    expect(r2.toolCallCount).toBe(1);
  });

  it("TC06_guard_context_carries_tool_and_session_identity", async () => {
    const seen: Array<{ toolId: string | undefined; sessionId: string | undefined; runId: string | undefined }> = [];
    const spyGuard: ToolGuard = {
      name: "spy",
      check: async (ctx, input) => {
        seen.push({ toolId: ctx.toolId, sessionId: ctx.sessionId, runId: ctx.runId });
        expect(input.toolName).toBe("write_file");
        expect(input.risk).toBe("write");
        expect(input.input).toEqual({ filePath: "/a.ts" });
        return { decision: "allow" as const };
      },
    };
    const deps = wireFindTool(makeDeps({ guards: [spyGuard] }));

    await runOne(new StepExecutor(deps));

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ toolId: "tc1", sessionId: "sess1", runId: "run1" });
  });

  it("TC07_monotonic_deny_cannot_reopen_by_later_allow", async () => {
    const order: string[] = [];
    const allowCheck = vi.fn().mockImplementation(async () => { order.push("second"); return { decision: "allow" as const }; });
    const denyCheck = vi.fn().mockImplementation(async () => { order.push("first"); return { decision: "deny" as const, reason: "nope" }; });
    const allowAfter: ToolGuard = { name: "second-allow", check: allowCheck };
    const denyFirst: ToolGuard = { name: "first-deny", check: denyCheck };
    const deps = wireFindTool(makeDeps({ guards: [denyFirst, allowAfter] }));

    const result = await runOne(new StepExecutor(deps));

    expect(execute).not.toHaveBeenCalled();
    expect(result.toolCallCount).toBe(0);
    expect(order).toEqual(["first"]);
    expect(allowCheck).not.toHaveBeenCalled();
  });
});
