import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLspToolHook, notifyChange } from "../src/bridge.js";
import type { LspPool } from "../src/pool.js";
import type { ToolDefinition, ToolHook } from "@vinhnt-sdk/core";

const dummyTool = {} as ToolDefinition;
type ToolHookParams = Parameters<NonNullable<ToolHook["post"]>>[0];
type ToolHookResult = { status: "success"; output: string };

const mockClient = {
  changeFile: vi.fn(),
  openFile: vi.fn(),
  closeFile: vi.fn(),
};

const mockPool = {
  getOrStart: vi.fn().mockResolvedValue(mockClient),
  getDiagnostics: vi.fn().mockResolvedValue([]),
  waitAndGetDiagnostics: vi.fn().mockResolvedValue([]),
  diagnosticsVersion: vi.fn().mockReturnValue(0),
} as unknown as LspPool;

beforeEach(() => {
  vi.clearAllMocks();
  mockPool.getOrStart = vi.fn().mockResolvedValue(mockClient);
  mockPool.getDiagnostics = vi.fn().mockResolvedValue([]);
  mockPool.waitAndGetDiagnostics = vi.fn().mockResolvedValue([]);
  mockPool.diagnosticsVersion = vi.fn().mockReturnValue(0);
});

describe("createLspToolHook", () => {
  const hook = createLspToolHook(mockPool, "/workspace");

  it("returns null for non-LSP tools", async () => {
    const params: ToolHookParams = {
      toolId: "execute_command",
      tool: dummyTool,
      input: { command: "ls" },
      result: { status: "success", output: "files" },
    };
    const result = await hook.post!(params);
    expect(result).toBeNull();
  });

  it("returns null when tool result is not success", async () => {
    const params: ToolHookParams = {
      toolId: "read_file",
      tool: dummyTool,
      input: { filePath: "/test.ts" },
      result: { status: "error", error: "fail" },
    };
    const result = await hook.post!(params);
    expect(result).toBeNull();
  });

  it("returns null when no filePath in input", async () => {
    const params: ToolHookParams = {
      toolId: "read_file",
      tool: dummyTool,
      input: {},
      result: { status: "success", output: "content" },
    };
    const result = await hook.post!(params);
    expect(result).toBeNull();
  });

  it("returns null when no diagnostics found", async () => {
    mockPool.getDiagnostics = vi.fn().mockResolvedValue([]);
    const params: ToolHookParams = {
      toolId: "read_file",
      tool: dummyTool,
      input: { filePath: "/workspace/test.ts" },
      result: { status: "success", output: "content" },
    };
    const result = await hook.post!(params);
    expect(result).toBeNull();
  });

  it("appends diagnostics to string output", async () => {
    const diag = { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } }, message: "test error", severity: 1 };
    mockPool.getDiagnostics = vi.fn().mockResolvedValue([diag]);
    const params: ToolHookParams = {
      toolId: "read_file",
      tool: dummyTool,
      input: { path: "/workspace/test.ts" },
      result: { status: "success", output: "file content" },
    };
    const result = (await hook.post!(params)) as ToolHookResult;
    expect(result).not.toBeNull();
    expect(result!.output).toContain("file content");
    expect(result!.output).toContain("ERROR");
    expect(result!.output).toContain("test error");
  });

  it("appends diagnostics to object output", async () => {
    const diag = { range: { start: { line: 2, character: 0 }, end: { line: 2, character: 3 } }, message: "warn", severity: 2 };
    mockPool.waitAndGetDiagnostics = vi.fn().mockResolvedValue([diag]);
    const params: ToolHookParams = {
      toolId: "write_file",
      tool: dummyTool,
      input: { filePath: "/workspace/test.ts", content: "updated" },
      result: { status: "success", output: { written: true } },
    };
    const result = (await hook.post!(params)) as ToolHookResult;
    expect(result).not.toBeNull();
    expect((result!.output as unknown as Record<string, unknown>).diagnostics).toContain("WARN");
  });

  it("notifies pool on file write", async () => {
    mockPool.getDiagnostics = vi.fn().mockResolvedValue([]);
    await hook.post!({
      toolId: "write_file",
      tool: dummyTool,
      input: { filePath: "/workspace/test.ts", content: "new content" },
      result: { status: "success", output: "ok" },
    });
    expect(mockPool.getOrStart).toHaveBeenCalled();
  });

  it("waits for a newer diagnostic version after a write (no fixed 200ms sleep)", async () => {
    mockPool.getDiagnostics = vi.fn().mockResolvedValue([]);
    mockPool.diagnosticsVersion = vi.fn().mockReturnValue(3);
    mockPool.waitAndGetDiagnostics = vi.fn().mockResolvedValue([]);
    await hook.post!({
      toolId: "write_file",
      tool: dummyTool,
      input: { filePath: "/workspace/test.ts", content: "new content" },
      result: { status: "success", output: "ok" },
    });
    expect(mockPool.diagnosticsVersion).toHaveBeenCalledWith("/workspace/test.ts");
    expect(mockPool.waitAndGetDiagnostics).toHaveBeenCalledWith("/workspace/test.ts", 3);
  });

  it("handles relative file paths", async () => {
    mockPool.getDiagnostics = vi.fn().mockResolvedValue([]);
    const result = await hook.post!({
      toolId: "read_file",
      tool: dummyTool,
      input: { filePath: "src/test.ts" },
      result: { status: "success", output: "content" },
    });
    expect(result).toBeNull();
  });
});

describe("notifyChange", () => {
  it("calls getOrStart on pool", () => {
    mockPool.getOrStart = vi.fn().mockResolvedValue(mockClient);
    notifyChange(mockPool, "/workspace/test.ts", "new content");
    expect(mockPool.getOrStart).toHaveBeenCalledWith("/workspace/test.ts");
  });

  it("does not throw when getOrStart fails", () => {
    mockPool.getOrStart = vi.fn().mockRejectedValue(new Error("fail"));
    expect(() => notifyChange(mockPool, "/workspace/test.ts", "content")).not.toThrow();
  });
});
