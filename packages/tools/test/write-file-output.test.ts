import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWriteFileTool } from "../src/file-tools.js";
import type { ToolContext } from "../src/context.js";

function withTmpDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "vinhnt-wf-"));
  return fn(dir).finally(() => rmSync(dir, { recursive: true, force: true }));
}

function makeCtx(): ToolContext {
  return {
    sessionId: "session-1",
    runId: "run-1",
    agentId: "agent-1",
    agentName: "test",
    signal: new AbortController().signal,
    env: {},
    ask: vi.fn(async () => "once" as const),
    metadata: vi.fn(),
    setCompensation: vi.fn(),
  };
}

describe("write_file — compact result (context efficiency)", () => {
  it("TC01_new_file_returns_empty_diff", () =>
    withTmpDir(async (dir) => {
      const tool = createWriteFileTool(() => dir);
      const content = "<!DOCTYPE html>\n<html><body>hello</body></html>\n";
      const res = (await tool.execute({ filePath: "index.html", content }, makeCtx())) as {
        written: string;
        bytes: number;
        diff: string;
        additions: number;
      };
      expect(res.written).toBe("index.html");
      expect(res.bytes).toBe(content.length);
      expect(res.diff).toBe("");
      expect(res.additions).toBeGreaterThan(0);
    }));

  it("TC02_update_diff_is_capped_with_omission_marker", () =>
    withTmpDir(async (dir) => {
      const oldLines = Array.from({ length: 200 }, (_, i) => `old line ${i}`).join("\n");
      const newLines = Array.from({ length: 200 }, (_, i) => `new line ${i}`).join("\n");
      writeFileSync(join(dir, "big.txt"), oldLines);
      const tool = createWriteFileTool(() => dir);
      const res = (await tool.execute({ filePath: "big.txt", content: newLines }, makeCtx())) as {
        diff: string;
        additions: number;
        removals: number;
      };
      expect(res.diff.length).toBeLessThan(1_700);
      expect(res.diff).toContain("chars of diff omitted");
      expect(res.additions).toBe(200);
      expect(res.removals).toBe(200);
    }));

  it("TC03_small_update_diff_is_returned_in_full", () =>
    withTmpDir(async (dir) => {
      writeFileSync(join(dir, "small.txt"), "line 1\nline 2\n");
      const tool = createWriteFileTool(() => dir);
      const res = (await tool.execute({ filePath: "small.txt", content: "line 1\nline 2 changed\n" }, makeCtx())) as {
        diff: string;
      };
      expect(res.diff).toContain("line 2 changed");
      expect(res.diff).not.toContain("omitted");
    }));
});
