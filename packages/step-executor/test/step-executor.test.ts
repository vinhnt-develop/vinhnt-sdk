import { describe, it, expect, vi, beforeEach } from "vitest";
import { StepExecutor, type StepExecutorDeps } from "../src/step-executor.js";
import { ToolSaga } from "@vinhnt-sdk/tools";
import { RunAbortedError } from "@vinhnt-sdk/schema";
import type { RunId, ChatMessage } from "@vinhnt-sdk/schema";
import type { ToolContext } from "@vinhnt-sdk/tools";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function makeDeps(overrides: Partial<StepExecutorDeps> = {}): StepExecutorDeps {
  return {
    store: { emitEvent: vi.fn() },
    addSessionMessage: vi.fn(),
    pluginManager: { fireHook: vi.fn() } as never,
    permissionGate: {
      checkTool: vi.fn().mockReturnValue({ allowed: true }),
      askForTool: vi.fn().mockResolvedValue("once" as const),
      checkSavedApproval: vi.fn().mockReturnValue(false),
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

function makeToolCall(overrides: Partial<{ toolId: string; toolName: string; args: unknown }> = {}) {
  return {
    toolId: "tc1",
    toolName: "read_file",
    args: { filePath: "/test.txt" },
    ...overrides,
  };
}

describe("StepExecutor", () => {
  let deps: Mutable<StepExecutorDeps>;
  let executor: StepExecutor;

  beforeEach(() => {
    deps = makeDeps();
    executor = new StepExecutor(deps);
    deps.saga.clear();
  });

  describe("executeToolCalls", () => {
    it("executes a successful tool call", async () => {
      const execute = vi.fn().mockResolvedValue("file content");
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });

      const result = await executor.executeToolCalls(
        [makeToolCall()], [], 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1",
        { model: "fake" } as never,
      );

      expect(result.toolCallCount).toBe(1);
      expect(execute).toHaveBeenCalledOnce();
      expect(result.recentCalls).toHaveLength(1);
      expect(result.recentCalls[0]!.id).toBe("read_file");
    });

    it("respects maxToolCallsPerStep limit", async () => {
      deps.maxToolCallsPerStep = 1;
      const executor2 = new StepExecutor(deps);
      const execute = vi.fn().mockResolvedValue("ok");
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });

      const result = await executor2.executeToolCalls(
        [makeToolCall({ toolId: "t1" }), makeToolCall({ toolId: "t2" })],
        [], 1, "run1" as RunId, { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(result.toolCallCount).toBe(1);
      expect(execute).toHaveBeenCalledTimes(1);
    });

    it("detects doom loops and aborts after 3 identical calls", async () => {
      const execute = vi.fn().mockResolvedValue("ok");
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });

      const messages: ChatMessage[] = [];

      await executor.executeToolCalls(
        [
          makeToolCall({ toolId: "t1" }),
          makeToolCall({ toolId: "t2" }),
          makeToolCall({ toolId: "t3" }),
          makeToolCall({ toolId: "t4" }),
        ],
        messages, 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(execute).toHaveBeenCalledTimes(3);
      const doomMsg = messages.find((m: unknown) =>
        (m as Record<string, unknown>).content?.toString().includes("identical arguments"),
      );
      expect(doomMsg).toBeDefined();
    });

    it("handles tool not found", async () => {
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
      expect((messages[0] as unknown as Record<string, unknown>).content).toContain("not found");
    });

    it("handles permission denied", async () => {
      const execute = vi.fn();
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "write" });
      (deps.permissionGate as unknown as Record<string, unknown>).checkTool = vi.fn().mockReturnValue({
        allowed: false, reason: "not allowed",
      });

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
      expect((messages[0] as unknown as Record<string, unknown>).content).toContain("not allowed");
    });

    it("handles needsApproval with accepted approval", async () => {
      deps.permissionGate = {
        checkTool: vi.fn().mockReturnValue({ allowed: false, needsApproval: true, reason: "needs ok" }),
        askForTool: vi.fn().mockResolvedValue("once" as const),
        checkSavedApproval: vi.fn().mockReturnValue(false),
        saveApproval: vi.fn(),
      } as never;

      const execute = vi.fn().mockResolvedValue("content");
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "write" });

      const executor2 = new StepExecutor(deps);

      const result = await executor2.executeToolCalls(
        [makeToolCall()], [], 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(result.toolCallCount).toBe(1);
      expect(execute).toHaveBeenCalledOnce();
    });

    it("handles needsApproval with rejected approval", async () => {
      deps.permissionGate = {
        checkTool: vi.fn().mockReturnValue({ allowed: false, needsApproval: true, reason: "needs ok" }),
        askForTool: vi.fn().mockResolvedValue("reject" as const),
        checkSavedApproval: vi.fn().mockReturnValue(false),
        saveApproval: vi.fn(),
        saveRejection: vi.fn(),
      } as never;

      const execute = vi.fn().mockResolvedValue("content");
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "write" });

      const executor2 = new StepExecutor(deps);
      const messages: ChatMessage[] = [];

      await executor2.executeToolCalls(
        [makeToolCall()], messages, 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
      expect((messages[0] as unknown as Record<string, unknown>).content).toContain("rejected");
      expect(execute).not.toHaveBeenCalled();
    });

    it("saves approval when reply is 'always'", async () => {
      const saveApproval = vi.fn();
      deps.permissionGate = {
        checkTool: vi.fn().mockReturnValue({ allowed: false, needsApproval: true, reason: "needs ok" }),
        askForTool: vi.fn().mockResolvedValue("always" as const),
        checkSavedApproval: vi.fn().mockReturnValue(false),
        saveApproval,
      } as never;

      const execute = vi.fn().mockResolvedValue("content");
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "write" });

      const executor2 = new StepExecutor(deps);

      await executor2.executeToolCalls(
        [makeToolCall()], [], 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(saveApproval).toHaveBeenCalledOnce();
    });

    it("self-approving tool asks approval exactly once (tool-level, no gate double-approve)", async () => {
      const askForTool = vi.fn().mockResolvedValue("always" as const);
      deps.permissionGate = {
        checkTool: vi.fn().mockReturnValue({ allowed: false, needsApproval: true, reason: "needs ok" }),
        askForTool,
        checkSavedApproval: vi.fn().mockReturnValue(false),
        saveApproval: vi.fn(),
        saveRejection: vi.fn(),
      } as never;

      // The shell tool asks via ctx.ask inside execute (single approval path).
      let askedSavePatterns: readonly string[] | undefined;
      const execute = vi.fn().mockImplementation(async (_input, ctx: { ask(input: { permission: string; resource: string; reason: string; savePatterns?: readonly string[] }): Promise<string> }) => {
        const reply = await ctx.ask({ permission: "shell", resource: "npm install express", reason: "run", savePatterns: ["npm install *"] });
        askedSavePatterns = undefined;
        return { stdout: "ok", stderr: "", exitCode: 0 };
      }).mockName("execSavePatterns");
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "write", selfApproving: true });

      const executor2 = new StepExecutor(deps);
      await executor2.executeToolCalls(
        [makeToolCall({ toolName: "execute_command", args: { command: "npm install express" } })],
        [], 1, "run1" as RunId, { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      // Gate-level handleApproval defers to the tool's own ask → exactly one ask.
      expect(askForTool).toHaveBeenCalledTimes(1);
      expect(execute).toHaveBeenCalledOnce();
    });

    it("self-approving tool defers gate approval but flag is propagated to handleApproval", async () => {
      const askForTool = vi.fn().mockResolvedValue("always" as const);
      deps.permissionGate = {
        checkTool: vi.fn().mockReturnValue({ allowed: false, needsApproval: true, reason: "needs ok" }),
        askForTool,
        checkSavedApproval: vi.fn().mockReturnValue(false),
        saveApproval: vi.fn(),
        saveRejection: vi.fn(),
      } as never;

      const execute = vi.fn().mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "write", selfApproving: true });

      const executor2 = new StepExecutor(deps);
      await executor2.executeToolCalls(
        [makeToolCall({ toolName: "execute_command", args: { command: "git status" } })],
        [], 1, "run1" as RunId, { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      // A self-approving tool that never calls ctx.ask inside execute must still
      // run: the gate defers (returns true) and the tool decides its own ask.
      expect(execute).toHaveBeenCalledOnce();
      expect(askForTool).toHaveBeenCalledTimes(0);
    });

    it("emits tool.metadata via ctx.metadata on tool.completed", async () => {
      const emitEvent = vi.fn().mockResolvedValue(undefined);
      deps.store = { emitEvent };

      const execute = vi.fn().mockImplementation(async (_input, ctx: { metadata(input: { title?: string; metadata?: Record<string, unknown> }): void }) => {
        ctx.metadata({ title: "my-title" });
        ctx.metadata({ metadata: { filesTouched: 2 } });
        ctx.metadata({ title: "my-title-v2" });
        return "file content";
      });
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });

      const executor2 = new StepExecutor(deps);
      await executor2.executeToolCalls(
        [makeToolCall()], [], 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      const completedEvent = emitEvent.mock.calls.map((c) => c[0]).find((e: Record<string, unknown>) => e.type === "tool.completed");
      expect(completedEvent).toBeDefined();
      expect((completedEvent as { data?: { metadata?: Record<string, unknown> } }).data?.metadata).toEqual({
        title: "my-title-v2",
        filesTouched: 2,
      });
    });

    it("emits tool.completed without metadata when ctx.metadata not called", async () => {
      const emitEvent = vi.fn().mockResolvedValue(undefined);
      deps.store = { emitEvent };

      const execute = vi.fn().mockResolvedValue("file content");
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });

      const executor2 = new StepExecutor(deps);
      await executor2.executeToolCalls(
        [makeToolCall()], [], 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      const completedEvent = emitEvent.mock.calls.map((c) => c[0]).find((e: Record<string, unknown>) => e.type === "tool.completed");
      expect((completedEvent as { data?: { metadata?: Record<string, unknown> } }).data?.metadata).toBeUndefined();
    });

    it("stops when run is aborted", async () => {
      const abort = new AbortController();
      abort.abort();

      const execute = vi.fn();
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });

      const result = await executor.executeToolCalls(
        [makeToolCall()], [], 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        abort, "sess1", { model: "fake" } as never,
      );

      expect(result.toolCallCount).toBe(0);
      expect(execute).not.toHaveBeenCalled();
    });

    it("records saga entries on success", async () => {
      const output = { lines: ["hello"] };
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({
        execute: vi.fn().mockResolvedValue(output), risk: "read",
      });

      await executor.executeToolCalls(
        [makeToolCall({ toolId: "t1" })], [], 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      const entries = deps.saga.getEntries(1);
      expect(entries).toHaveLength(1);
      expect(entries[0]!.toolId).toBe("t1");
      expect(entries[0]!.output).toEqual(output);
    });

    it("calls permission gate with tool risk and agent", async () => {
      const checkTool = vi.fn().mockReturnValue({ allowed: true });
      deps.permissionGate = { checkTool, askForTool: vi.fn(), checkSavedApproval: vi.fn(), saveApproval: vi.fn() } as never;
      deps.currentAgent = { id: "agent1", profile: { name: "test" }, permissions: {} } as never;

      const execute = vi.fn().mockResolvedValue("ok");
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "write" });

      const executor2 = new StepExecutor(deps);
      await executor2.executeToolCalls(
        [makeToolCall()], [], 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(checkTool).toHaveBeenCalledWith("read_file", "write", { filePath: "/test.txt" }, deps.currentAgent);
    });

    it("handles tool execution error gracefully", async () => {
      const execute = vi.fn().mockRejectedValue(new Error("execution failed"));
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
      expect((messages[0] as unknown as Record<string, unknown>).content).toContain("execution failed");
    });

    it("handles RunAbortedError from tool execution silently", async () => {
      const execute = vi.fn().mockRejectedValue(new RunAbortedError("run1" as RunId));
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(0);
    });

    it("handles ToolPermissionDenied from tool execution", async () => {
      const { ToolPermissionDenied } = await import("@vinhnt-sdk/schema");
      const execute = vi.fn().mockRejectedValue(new ToolPermissionDenied("read_file", "no access"));
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
    });

    it("emits tool.invoked and tool.completed events on success", async () => {
      const emitEvent = vi.fn();
      const localDeps = makeDeps({ store: { emitEvent } });
      const exec2 = new StepExecutor(localDeps);
      (localDeps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({
        execute: vi.fn().mockResolvedValue("result"), risk: "read",
      });

      await exec2.executeToolCalls(
        [makeToolCall()], [], 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      const emittedTypes = emitEvent.mock.calls.map((c: unknown[]) => (c[0] as Record<string, unknown>).type);
      expect(emittedTypes).toContain("tool.invoked");
      expect(emittedTypes).toContain("tool.completed");
    });

    it("calls plugin hooks on tool invoke and complete", async () => {
      const fireHook = vi.fn();
      const localDeps = makeDeps({ pluginManager: { fireHook } as never });
      const exec2 = new StepExecutor(localDeps);
      (localDeps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({
        execute: vi.fn().mockResolvedValue("result"), risk: "read",
      });

      await exec2.executeToolCalls(
        [makeToolCall()], [], 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(fireHook).toHaveBeenCalledWith("onToolInvoked", expect.any(Object));
      expect(fireHook).toHaveBeenCalledWith("onToolCompleted", expect.any(Object));
    });

    it("generates tool.type_changed event on each tool execution", async () => {
      const emitEvent = vi.fn();
      const localDeps = makeDeps({ store: { emitEvent } });
      const exec2 = new StepExecutor(localDeps);
      (localDeps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({
        execute: vi.fn().mockResolvedValue("result"), risk: "read",
      });

      await exec2.executeToolCalls(
        [makeToolCall()], [], 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      const typeChangedEvents = emitEvent.mock.calls.filter(
        (c: unknown[]) => (c[0] as Record<string, unknown>).type === "step.type_changed",
      );
      expect(typeChangedEvents).toHaveLength(1);
      expect(typeChangedEvents[0]![0].data.stepType).toBeDefined();
    });
  });

  describe("edit_file fallback", () => {
    it("falls back to read_file when edit_file fails with 'not found'", async () => {
      const readFileExecute = vi.fn().mockResolvedValue("current content");
      (deps.findTool as ReturnType<typeof vi.fn>).mockImplementation((name: string) => {
        if (name === "read_file") return { execute: readFileExecute, risk: "read" };
        if (name === "edit_file") return {
          execute: vi.fn().mockRejectedValue(new Error("not found: /test.txt")), risk: "write",
        };
        return undefined;
      });

      const messages: ChatMessage[] = [];
      const result = await executor.executeToolCalls(
        [makeToolCall({ toolName: "edit_file", args: { filePath: "/test.txt" } })],
        messages, 1, "run1" as RunId, { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(result.toolCallCount).toBe(0); // fallback does not increment count
      expect(messages).toHaveLength(1);
      const msg = messages[0] as { content: string };
      expect(msg.content).toContain("Current file content");
    });

    it("does not fall back when read_file tool is unavailable", async () => {
      (deps.findTool as ReturnType<typeof vi.fn>).mockImplementation((name: string) => {
        if (name === "edit_file") return {
          execute: vi.fn().mockRejectedValue(new Error("not found: /test.txt")), risk: "write",
        };
        return undefined;
      });

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall({ toolName: "edit_file", args: { filePath: "/test.txt" } })],
        messages, 1, "run1" as RunId, { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
      expect((messages[0] as { content: string }).content).not.toContain("Current file content");
    });
  });

  describe("self-correction", () => {
    it("retries via model call on tool failure when selfCorrectOnFailure is true", async () => {
      deps.selfCorrectOnFailure = true;
      const execute = vi.fn().mockRejectedValue(new Error("execution failed"));
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });
      (deps.modelCaller as unknown as Record<string, unknown>).callModelStream = vi.fn().mockResolvedValue({
        content: "corrected approach",
      });

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages.length).toBeGreaterThanOrEqual(2);
    });

    it("asks approval for a self-corrected tool and does not execute it when rejected", async () => {
      deps.selfCorrectOnFailure = true;
      const originalExecute = vi.fn().mockRejectedValue(new Error("execution failed"));
      const correctedExecute = vi.fn().mockResolvedValue("corrected output");
      (deps.findTool as ReturnType<typeof vi.fn>).mockImplementation((name: string) =>
        name === "write_file" ? { execute: correctedExecute, risk: "write" as const } : { execute: originalExecute, risk: "read" as const },
      );
      (deps.modelCaller as unknown as Record<string, unknown>).callModelStream = vi.fn().mockResolvedValue({
        content: "",
        toolCalls: [{ id: "call-sc-1", name: "write_file", args: { filePath: "/tmp/x.txt" } }],
      });
      (deps.permissionGate.checkTool as ReturnType<typeof vi.fn>).mockImplementation((name: string, risk: string) =>
        name === "write_file" ? { allowed: false, needsApproval: true, reason: `Tool "${name}" requires approval` }
          : { allowed: true },
      );
      const askSpy = deps.permissionGate.askForTool as ReturnType<typeof vi.fn>;
      askSpy.mockResolvedValue("reject" as const);

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(askSpy).toHaveBeenCalledWith(
        "write_file", "call-sc-1", "run1", "",
        expect.stringContaining("requires approval"), expect.anything(), "trace1", expect.anything(),
        undefined, expect.any(AbortSignal),
      );
      expect(correctedExecute).not.toHaveBeenCalled();
      expect(messages.some((m) => typeof m === "object" && (m as { content?: string }).content?.includes("rejected by user"))).toBe(true);
    });

    it("executes a self-corrected tool after approval is granted", async () => {
      deps.selfCorrectOnFailure = true;
      const originalExecute = vi.fn().mockRejectedValue(new Error("execution failed"));
      const correctedExecute = vi.fn().mockResolvedValue("corrected output");
      (deps.findTool as ReturnType<typeof vi.fn>).mockImplementation((name: string) =>
        name === "write_file" ? { execute: correctedExecute, risk: "write" as const } : { execute: originalExecute, risk: "read" as const },
      );
      (deps.modelCaller as unknown as Record<string, unknown>).callModelStream = vi.fn().mockResolvedValue({
        content: "",
        toolCalls: [{ id: "call-sc-2", name: "write_file", args: { filePath: "/tmp/x.txt" } }],
      });
      (deps.permissionGate.checkTool as ReturnType<typeof vi.fn>).mockImplementation((name: string, risk: string) =>
        name === "write_file" ? { allowed: false, needsApproval: true, reason: `Tool "${name}" requires approval` }
          : { allowed: true },
      );
      const askSpy = deps.permissionGate.askForTool as ReturnType<typeof vi.fn>;
      askSpy.mockResolvedValue("once" as const);

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(askSpy).toHaveBeenCalled();
      expect(correctedExecute).toHaveBeenCalledOnce();
    });
  });

  describe("external directory detection", () => {
    it("blocks read_file with path outside workspace", async () => {
      deps.workspaceRoot = "/home/user/project";
      const execute = vi.fn().mockResolvedValue("content");
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall({ toolName: "read_file", args: { filePath: "/etc/passwd" } })],
        messages, 1, "run1" as RunId, { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
      expect((messages[0] as { content: string }).content).toContain("External directory");
      expect(execute).not.toHaveBeenCalled();
    });

    it("blocks write_file with path outside workspace", async () => {
      deps.workspaceRoot = "/home/user/project";
      const execute = vi.fn().mockResolvedValue("done");
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "write" });

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall({ toolName: "write_file", args: { filePath: "/tmp/malicious.txt" } })],
        messages, 1, "run1" as RunId, { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
      expect((messages[0] as { content: string }).content).toContain("External directory");
      expect(execute).not.toHaveBeenCalled();
    });

    it("allows read_file within workspace", async () => {
      deps.workspaceRoot = "/home/user/project";
      const execute = vi.fn().mockResolvedValue("content");
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall({ toolName: "read_file", args: { filePath: "/home/user/project/src/index.ts" } })],
        messages, 1, "run1" as RunId, { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(execute).toHaveBeenCalled();
    });

    it("allows relative path within workspace", async () => {
      deps.workspaceRoot = "/home/user/project";
      const execute = vi.fn().mockResolvedValue("content");
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall({ toolName: "read_file", args: { filePath: "src/lib/index.ts" } })],
        messages, 1, "run1" as RunId, { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(execute).toHaveBeenCalled();
    });

    it("does not block external path when externalDirectoryAccess is true", async () => {
      deps.externalDirectoryAccess = true;
      deps.workspaceRoot = "/home/user/project";
      const execute = vi.fn().mockResolvedValue("content");
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall({ toolName: "read_file", args: { filePath: "/etc/passwd" } })],
        messages, 1, "run1" as RunId, { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(execute).toHaveBeenCalled();
    });

    it("does not check non-path-aware tools", async () => {
      deps.workspaceRoot = "/home/user/project";
      const execute = vi.fn().mockResolvedValue("content");
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall({ toolName: "web_fetch", args: { url: "https://example.com" } })],
        messages, 1, "run1" as RunId, { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(execute).toHaveBeenCalled();
    });

    it("default behavior (no externalDirectoryAccess) blocks external paths", async () => {
      deps.workspaceRoot = "/home/user/project";
      const execute = vi.fn().mockResolvedValue("content");
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall({ toolName: "read_file", args: { filePath: "/etc/passwd" } })],
        messages, 1, "run1" as RunId, { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
      expect((messages[0] as { content: string }).content).toContain("External directory");
      expect(execute).not.toHaveBeenCalled();
    });
  });

  describe("cooperative tool timeout (RV-19)", () => {
    it("aborts the tool's per-call signal at the deadline so side effects stop", async () => {
      let receivedSignal: AbortSignal | undefined;
      const execute = vi.fn().mockImplementation((_args: unknown, ctx: ToolContext) => {
        receivedSignal = ctx.signal;
        return new Promise((resolve) => {
          // Well-behaved tool: stop on signal — resolved (but the hard timeout
          // still wins; what matters is the signal fired and work stopped).
          ctx.signal.addEventListener("abort", () => resolve(undefined), { once: true });
        });
      });
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read", timeoutMs: 25 });

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(receivedSignal?.aborted).toBe(true);
      expect(messages.some((m) => String((m as { content?: unknown }).content).includes("timed out after 25ms"))).toBe(true);
    });

    it("hard-caps a non-cooperative tool that ignores its signal", async () => {
      const execute = vi.fn().mockImplementation(() => new Promise(() => {}));
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read", timeoutMs: 25 });

      const messages: ChatMessage[] = [];
      await executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      const content = messages.map((m) => String((m as { content?: unknown }).content)).join(" ");
      expect(content).toContain("timed out after 25ms");
      expect(execute).toHaveBeenCalledTimes(1);
    });

    it("propagates a parent run abort to the tool signal (no synthetic RunAbortedError)", async () => {
      const controller = new AbortController();
      let sawAbortReason: unknown;
      const execute = vi.fn().mockImplementation((_args: unknown, ctx: ToolContext) => {
        return new Promise((resolve) => {
          const onAbort = () => {
            sawAbortReason = ctx.signal.reason;
            resolve(undefined);
          };
          // Standard cooperative-tool behaviour: handle an already-aborted
          // signal synchronously instead of only listening for future aborts.
          if (ctx.signal.aborted) onAbort();
          else ctx.signal.addEventListener("abort", onAbort, { once: true });
        });
      });
      (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read", timeoutMs: 10_000 });

      const messages: ChatMessage[] = [];
      const promise = executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1" as RunId,
        { traceId: "trace1" } as never,
        controller, "sess1", { model: "fake" } as never,
      );
      controller.abort(new Error("parent aborted"));
      await promise;

      expect(sawAbortReason).toEqual(new Error("parent aborted"));
    });
  });
});
