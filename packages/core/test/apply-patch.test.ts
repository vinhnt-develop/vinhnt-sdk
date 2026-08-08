import { describe, expect, it } from "vitest";
import { createApplyPatchTool } from "../src/tool/file-tools.js";
import type { ToolContext } from "../src/tool/definitions.js";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function makeCtx(): ToolContext {
  return {
    sessionId: "test", runId: "test", agentId: "test", agentName: "test",
    signal: new AbortController().signal, env: {},
    ask: async () => "once",
    metadata: () => {},
    setCompensation: () => {},
  };
}

describe("apply_patch", () => {
  it("applies a single search/replace block", async () => {
    const dir = mkdtempSync(join(tmpdir(), "vnt-test-"));
    const fp = join(dir, "test.txt");
    writeFileSync(fp, "hello world\nfoo bar\n", "utf-8");
    const tool = createApplyPatchTool(() => dir);
    const result = await tool.execute({
      filePath: "test.txt",
      patch: "<<<<<<< SEARCH\nfoo bar\n=======\nbar baz\n>>>>>>>",
    }, makeCtx());
    expect(result).toHaveProperty("patched", "test.txt");
    expect(result).toHaveProperty("blocks", 1);
    expect(readFileSync(fp, "utf-8")).toBe("hello world\nbar baz\n");
  });

  it("applies multiple blocks in sequence", async () => {
    const dir = mkdtempSync(join(tmpdir(), "vnt-test-"));
    const fp = join(dir, "test.txt");
    writeFileSync(fp, "aaa\nbbb\nccc\n", "utf-8");
    const tool = createApplyPatchTool(() => dir);
    const result = await tool.execute({
      filePath: "test.txt",
      patch: "<<<<<<< SEARCH\naaa\n=======\nAAA\n>>>>>>>\n<<<<<<< SEARCH\nbbb\n=======\nBBB\n>>>>>>>",
    }, makeCtx());
    expect(result.blocks).toBe(2);
    expect(readFileSync(fp, "utf-8")).toBe("AAA\nBBB\nccc\n");
  });

  it("throws when search string not found", async () => {
    const dir = mkdtempSync(join(tmpdir(), "vnt-test-"));
    const fp = join(dir, "test.txt");
    writeFileSync(fp, "hello world\n", "utf-8");
    const tool = createApplyPatchTool(() => dir);
    await expect(tool.execute({
      filePath: "test.txt",
      patch: "<<<<<<< SEARCH\nnot_there\n=======\nreplacement\n>>>>>>>",
    }, makeCtx())).rejects.toThrow("not found");
  });

  it("throws on invalid patch format", async () => {
    const dir = mkdtempSync(join(tmpdir(), "vnt-test-"));
    const fp = join(dir, "test.txt");
    writeFileSync(fp, "hello\n", "utf-8");
    const tool = createApplyPatchTool(() => dir);
    await expect(tool.execute({
      filePath: "test.txt",
      patch: "not a valid patch",
    }, makeCtx())).rejects.toThrow("No valid search/replace blocks");
  });

  it("rejects file outside workspace", async () => {
    const tool = createApplyPatchTool(() => "d:/workspace");
    const rejectCtx: ToolContext = {
      sessionId: "test", runId: "test", agentId: "test", agentName: "test",
      signal: new AbortController().signal, env: {},
      ask: async () => "reject",
      metadata: () => {},
      setCompensation: () => {},
    };
    await expect(tool.execute({
      filePath: "../etc/passwd",
      patch: "<<<<<<< SEARCH\nx\n=======\ny\n>>>>>>>",
    }, rejectCtx)).rejects.toThrow("outside workspace");
  });
});
