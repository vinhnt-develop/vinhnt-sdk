import { describe, it, expect, vi, beforeEach } from "vitest";
import { StepExecutor, type StepExecutorDeps } from "../src/kernel/step-executor.js";
import { ToolSaga } from "../src/kernel/tool-saga.js";
import { RunAbortedError } from "@vinhnt-sdk/schema";

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
  };
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
  let deps: StepExecutorDeps;
  let executor: StepExecutor;

  beforeEach(() => {
    deps = makeDeps();
    executor = new StepExecutor(deps);
    deps.saga.clear();
  });

  describe("executeToolCalls", () => {
    it("executes a successful tool call", async () => {
      const execute = vi.fn().mockResolvedValue("file content");
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "read" });

      const result = await executor.executeToolCalls(
        [makeToolCall()], [], 1, "run1",
        { traceId: "trace1" } as never,
        new AbortController(), "sess1",
        { model: "fake" } as never,
      );

      expect(result.toolCallCount).toBe(1);
      expect(execute).toHaveBeenCalledOnce();
      expect(result.recentCalls).toHaveLength(1);
      expect(result.recentCalls[0].id).toBe("read_file");
    });

    it("respects maxToolCallsPerStep limit", async () => {
      deps.maxToolCallsPerStep = 1;
      const executor2 = new StepExecutor(deps);
      const execute = vi.fn().mockResolvedValue("ok");
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "read" });

      const result = await executor2.executeToolCalls(
        [makeToolCall({ toolId: "t1" }), makeToolCall({ toolId: "t2" })],
        [], 1, "run1", { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(result.toolCallCount).toBe(1);
      expect(execute).toHaveBeenCalledTimes(1);
    });

    it("detects doom loops and aborts after 3 identical calls", async () => {
      const execute = vi.fn().mockResolvedValue("ok");
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "read" });

      const messages: unknown[] = [];

      await executor.executeToolCalls(
        [
          makeToolCall({ toolId: "t1" }),
          makeToolCall({ toolId: "t2" }),
          makeToolCall({ toolId: "t3" }),
          makeToolCall({ toolId: "t4" }),
        ],
        messages, 1, "run1",
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
      (deps.findTool as vi.Mock).mockReturnValue(undefined);

      const messages: unknown[] = [];
      await executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1",
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
      expect((messages[0] as Record<string, unknown>).content).toContain("not found");
    });

    it("handles permission denied", async () => {
      const execute = vi.fn();
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "write" });
      (deps.permissionGate as Record<string, unknown>).checkTool = vi.fn().mockReturnValue({
        allowed: false, reason: "not allowed",
      });

      const messages: unknown[] = [];
      await executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1",
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
      expect((messages[0] as Record<string, unknown>).content).toContain("not allowed");
    });

    it("handles needsApproval with accepted approval", async () => {
      deps.permissionGate = {
        checkTool: vi.fn().mockReturnValue({ allowed: false, needsApproval: true, reason: "needs ok" }),
        askForTool: vi.fn().mockResolvedValue("once" as const),
        checkSavedApproval: vi.fn().mockReturnValue(false),
        saveApproval: vi.fn(),
      } as never;

      const execute = vi.fn().mockResolvedValue("content");
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "write" });

      const executor2 = new StepExecutor(deps);

      const result = await executor2.executeToolCalls(
        [makeToolCall()], [], 1, "run1",
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
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "write" });

      const executor2 = new StepExecutor(deps);
      const messages: unknown[] = [];

      await executor2.executeToolCalls(
        [makeToolCall()], messages, 1, "run1",
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
      expect((messages[0] as Record<string, unknown>).content).toContain("rejected");
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
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "write" });

      const executor2 = new StepExecutor(deps);

      await executor2.executeToolCalls(
        [makeToolCall()], [], 1, "run1",
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(saveApproval).toHaveBeenCalledOnce();
    });

    it("stops when run is aborted", async () => {
      const abort = new AbortController();
      abort.abort();

      const execute = vi.fn();
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "read" });

      const result = await executor.executeToolCalls(
        [makeToolCall()], [], 1, "run1",
        { traceId: "trace1" } as never,
        abort, "sess1", { model: "fake" } as never,
      );

      expect(result.toolCallCount).toBe(0);
      expect(execute).not.toHaveBeenCalled();
    });

    it("records saga entries on success", async () => {
      const output = { lines: ["hello"] };
      (deps.findTool as vi.Mock).mockReturnValue({
        execute: vi.fn().mockResolvedValue(output), risk: "read",
      });

      await executor.executeToolCalls(
        [makeToolCall({ toolId: "t1" })], [], 1, "run1",
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      const entries = deps.saga.getEntries(1);
      expect(entries).toHaveLength(1);
      expect(entries[0].toolId).toBe("t1");
      expect(entries[0].output).toEqual(output);
    });

    it("calls permission gate with tool risk and agent", async () => {
      const checkTool = vi.fn().mockReturnValue({ allowed: true });
      deps.permissionGate = { checkTool, askForTool: vi.fn(), checkSavedApproval: vi.fn(), saveApproval: vi.fn() } as never;
      deps.currentAgent = { id: "agent1", profile: { name: "test" }, permissions: {} } as never;

      const execute = vi.fn().mockResolvedValue("ok");
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "write" });

      const executor2 = new StepExecutor(deps);
      await executor2.executeToolCalls(
        [makeToolCall()], [], 1, "run1",
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(checkTool).toHaveBeenCalledWith("read_file", "write", { filePath: "/test.txt" }, deps.currentAgent);
    });

    it("handles tool execution error gracefully", async () => {
      const execute = vi.fn().mockRejectedValue(new Error("execution failed"));
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "read" });

      const messages: unknown[] = [];
      await executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1",
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
      expect((messages[0] as Record<string, unknown>).content).toContain("execution failed");
    });

    it("handles RunAbortedError from tool execution silently", async () => {
      const execute = vi.fn().mockRejectedValue(new RunAbortedError("run1"));
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "read" });

      const messages: unknown[] = [];
      await executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1",
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(0);
    });

    it("handles ToolPermissionDenied from tool execution", async () => {
      const { ToolPermissionDenied } = await import("@vinhnt-sdk/schema");
      const execute = vi.fn().mockRejectedValue(new ToolPermissionDenied("read_file", "no access"));
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "read" });

      const messages: unknown[] = [];
      await executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1",
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
    });

    it("emits tool.invoked and tool.completed events on success", async () => {
      const emitEvent = vi.fn();
      const localDeps = makeDeps({ store: { emitEvent } });
      const exec2 = new StepExecutor(localDeps);
      (localDeps.findTool as vi.Mock).mockReturnValue({
        execute: vi.fn().mockResolvedValue("result"), risk: "read",
      });

      await exec2.executeToolCalls(
        [makeToolCall()], [], 1, "run1",
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
      (localDeps.findTool as vi.Mock).mockReturnValue({
        execute: vi.fn().mockResolvedValue("result"), risk: "read",
      });

      await exec2.executeToolCalls(
        [makeToolCall()], [], 1, "run1",
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
      (localDeps.findTool as vi.Mock).mockReturnValue({
        execute: vi.fn().mockResolvedValue("result"), risk: "read",
      });

      await exec2.executeToolCalls(
        [makeToolCall()], [], 1, "run1",
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      const typeChangedEvents = emitEvent.mock.calls.filter(
        (c: unknown[]) => (c[0] as Record<string, unknown>).type === "step.type_changed",
      );
      expect(typeChangedEvents).toHaveLength(1);
      expect(typeChangedEvents[0][0].data.stepType).toBeDefined();
    });
  });

  describe("edit_file fallback", () => {
    it("falls back to read_file when edit_file fails with 'not found'", async () => {
      const readFileExecute = vi.fn().mockResolvedValue("current content");
      (deps.findTool as vi.Mock).mockImplementation((name: string) => {
        if (name === "read_file") return { execute: readFileExecute, risk: "read" };
        if (name === "edit_file") return {
          execute: vi.fn().mockRejectedValue(new Error("not found: /test.txt")), risk: "write",
        };
        return undefined;
      });

      const messages: unknown[] = [];
      const result = await executor.executeToolCalls(
        [makeToolCall({ toolName: "edit_file", args: { filePath: "/test.txt" } })],
        messages, 1, "run1", { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(result.toolCallCount).toBe(0); // fallback does not increment count
      expect(messages).toHaveLength(1);
      const msg = messages[0] as { content: string };
      expect(msg.content).toContain("Current file content");
    });

    it("does not fall back when read_file tool is unavailable", async () => {
      (deps.findTool as vi.Mock).mockImplementation((name: string) => {
        if (name === "edit_file") return {
          execute: vi.fn().mockRejectedValue(new Error("not found: /test.txt")), risk: "write",
        };
        return undefined;
      });

      const messages: unknown[] = [];
      await executor.executeToolCalls(
        [makeToolCall({ toolName: "edit_file", args: { filePath: "/test.txt" } })],
        messages, 1, "run1", { traceId: "trace1" } as never,
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
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "read" });
      (deps.modelCaller as Record<string, unknown>).callModelStream = vi.fn().mockResolvedValue({
        content: "corrected approach",
      });

      const messages: unknown[] = [];
      await executor.executeToolCalls(
        [makeToolCall()], messages, 1, "run1",
        { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("external directory detection", () => {
    it("blocks read_file with path outside workspace", async () => {
      deps.workspaceRoot = "/home/user/project";
      const execute = vi.fn().mockResolvedValue("content");
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "read" });

      const messages: unknown[] = [];
      await executor.executeToolCalls(
        [makeToolCall({ toolName: "read_file", args: { filePath: "/etc/passwd" } })],
        messages, 1, "run1", { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
      expect((messages[0] as { content: string }).content).toContain("External directory");
      expect(execute).not.toHaveBeenCalled();
    });

    it("blocks write_file with path outside workspace", async () => {
      deps.workspaceRoot = "/home/user/project";
      const execute = vi.fn().mockResolvedValue("done");
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "write" });

      const messages: unknown[] = [];
      await executor.executeToolCalls(
        [makeToolCall({ toolName: "write_file", args: { filePath: "/tmp/malicious.txt" } })],
        messages, 1, "run1", { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
      expect((messages[0] as { content: string }).content).toContain("External directory");
      expect(execute).not.toHaveBeenCalled();
    });

    it("allows read_file within workspace", async () => {
      deps.workspaceRoot = "/home/user/project";
      const execute = vi.fn().mockResolvedValue("content");
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "read" });

      const messages: unknown[] = [];
      await executor.executeToolCalls(
        [makeToolCall({ toolName: "read_file", args: { filePath: "/home/user/project/src/index.ts" } })],
        messages, 1, "run1", { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(execute).toHaveBeenCalled();
    });

    it("allows relative path within workspace", async () => {
      deps.workspaceRoot = "/home/user/project";
      const execute = vi.fn().mockResolvedValue("content");
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "read" });

      const messages: unknown[] = [];
      await executor.executeToolCalls(
        [makeToolCall({ toolName: "read_file", args: { filePath: "src/lib/index.ts" } })],
        messages, 1, "run1", { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(execute).toHaveBeenCalled();
    });

    it("does not block external path when externalDirectoryAccess is true", async () => {
      deps.externalDirectoryAccess = true;
      deps.workspaceRoot = "/home/user/project";
      const execute = vi.fn().mockResolvedValue("content");
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "read" });

      const messages: unknown[] = [];
      await executor.executeToolCalls(
        [makeToolCall({ toolName: "read_file", args: { filePath: "/etc/passwd" } })],
        messages, 1, "run1", { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(execute).toHaveBeenCalled();
    });

    it("does not check non-path-aware tools", async () => {
      deps.workspaceRoot = "/home/user/project";
      const execute = vi.fn().mockResolvedValue("content");
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "read" });

      const messages: unknown[] = [];
      await executor.executeToolCalls(
        [makeToolCall({ toolName: "web_fetch", args: { url: "https://example.com" } })],
        messages, 1, "run1", { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(execute).toHaveBeenCalled();
    });

    it("default behavior (no externalDirectoryAccess) blocks external paths", async () => {
      deps.workspaceRoot = "/home/user/project";
      const execute = vi.fn().mockResolvedValue("content");
      (deps.findTool as vi.Mock).mockReturnValue({ execute, risk: "read" });

      const messages: unknown[] = [];
      await executor.executeToolCalls(
        [makeToolCall({ toolName: "read_file", args: { filePath: "/etc/passwd" } })],
        messages, 1, "run1", { traceId: "trace1" } as never,
        new AbortController(), "sess1", { model: "fake" } as never,
      );

      expect(messages).toHaveLength(1);
      expect((messages[0] as { content: string }).content).toContain("External directory");
      expect(execute).not.toHaveBeenCalled();
    });
  });
});
