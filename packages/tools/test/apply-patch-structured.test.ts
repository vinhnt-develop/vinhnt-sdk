import { describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApplyPatchTool } from "../src/file-tools.js";
import { detectApplyPatchFormat, parseApplyPatch, applyHunkToContent } from "../src/apply-patch-grammar.js";
import { FileReadTracker } from "../src/read-tracker.js";
import { ToolPermissionDenied } from "@vinhnt-sdk/schema";
import type { ToolContext, PermissionReply } from "../src/context.js";

interface ApplyPatchResult {
  patched: string | string[];
  blocks: number;
  diff: string;
  additions: number;
  removals: number;
  deleted?: string[];
}

function withTmpDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "vinhnt-ap-"));
  return fn(dir).finally(() => rmSync(dir, { recursive: true, force: true }));
}

function makeCtx(reply: PermissionReply = "once"): { ctx: ToolContext; compensation: (() => Promise<void>)[] } {
  const compensation: (() => Promise<void>)[] = [];
  const ctx: ToolContext = {
    sessionId: "session-1",
    runId: "run-1",
    agentId: "agent-1",
    agentName: "test",
    signal: new AbortController().signal,
    env: {},
    ask: vi.fn(async () => reply),
    metadata: vi.fn(),
    setCompensation: (action) => {
      compensation.push(action);
    },
  };
  return { ctx, compensation };
}

describe("apply_patch grammar - strict mode", () => {
  it("TC01_strict_missing_begin_throws_with_line_number", () => {
    expect(() => parseApplyPatch("*** Update File: a.txt\n@@\n-old\n+new", "strict")).toThrowError(
      /apply_patch line 1: expected/,
    );
  });

  it("TC02_strict_unknown_directive_throws", () => {
    expect(() => parseApplyPatch("*** Begin Patch\n*** Frob File: a\n*** End Patch", "strict")).toThrowError(
      /unknown directive/,
    );
  });

  it("TC03_strict_hunk_line_without_prefix_throws", () => {
    const patch = "*** Begin Patch\n*** Update File: a.txt\n@@\nnotag line\n*** End Patch";
    expect(() => parseApplyPatch(patch, "strict")).toThrowError(/hunk line must start with/);
  });

  it("TC04_strict_update_without_hunk_or_move_throws", () => {
    const patch = "*** Begin Patch\n*** Update File: a.txt\n*** End Patch";
    expect(() => parseApplyPatch(patch, "strict")).toThrowError(/has no "@@ hunk"/);
  });

  it("TC05_strict_missing_end_marker_throws", () => {
    expect(() => parseApplyPatch("*** Begin Patch\n*** Delete File: a.txt", "strict")).toThrowError(
      /expected "\*\*\* End Patch"/,
    );
  });

  it("TC06_strict_add_line_without_plus_throws", () => {
    const patch = "*** Begin Patch\n*** Add File: b.txt\nhello\n*** End Patch";
    expect(() => parseApplyPatch(patch, "strict")).toThrowError(/\*\*\* Add File:" line must start with/);
  });
});

describe("apply_patch grammar - lenient mode", () => {
  it("TC07_lenient_missing_begin_and_end_parses", () => {
    const program = parseApplyPatch("*** Update File: a.txt\n@@\n-old\n+new", "lenient");
    expect(program.mode).toBe("lenient");
    expect(program.ops).toHaveLength(1);
    expect(program.ops[0]!.kind).toBe("update");
  });

  it("TC08_lenient_content_before_at_starts_implicit_hunk", () => {
    const patch = "*** Begin Patch\n*** Update File: a.txt\n-old\n+new\n*** End Patch";
    const program = parseApplyPatch(patch, "lenient");
    const op = program.ops[0];
    expect(op!.kind).toBe("update");
    if (op!.kind === "update") {
      expect(op!.hunks).toHaveLength(1);
      expect(op!.hunks[0]!.lines).toEqual(["-old", "+new"]);
    }
  });

  it("TC09_lenient_unknown_directive_skipped", () => {
    const patch = "*** Begin Patch\n*** Frob\n*** Add File: b.txt\n+hello\n*** End Patch";
    const program = parseApplyPatch(patch, "lenient");
    expect(program.ops).toHaveLength(1);
    expect(program.ops[0]).toEqual({ kind: "add", path: "b.txt", content: "hello\n" });
  });

  it("TC10_lenient_add_line_without_plus_kept", () => {
    const patch = "*** Begin Patch\n*** Add File: b.txt\nhello\n*** End Patch";
    const program = parseApplyPatch(patch, "lenient");
    expect(program.ops[0]).toEqual({ kind: "add", path: "b.txt", content: "hello\n" });
  });
});

describe("detectApplyPatchFormat", () => {
  it("TC11_detects_structured_formats", () => {
    expect(detectApplyPatchFormat("*** Begin Patch\n*** End Patch")).toBe("structured");
    expect(detectApplyPatchFormat("*** Add File: x\n+y")).toBe("structured");
    expect(detectApplyPatchFormat("*** Update File: x\n@@\n-a\n+b")).toBe("structured");
  });

  it("TC12_detects_legacy_formats_and_begin_marker_wins_over_search", () => {
    expect(detectApplyPatchFormat("<<<<<<< SEARCH\nx\n=======\ny\n>>>>>>>\n")).toBe("legacy");
    expect(detectApplyPatchFormat("just some text")).toBe("legacy");
    const mixed = "<<<<<<< SEARCH\nx\n=======\ny\n>>>>>>>\n*** Begin Patch\n*** End Patch";
    expect(detectApplyPatchFormat(mixed)).toBe("structured");
  });
});

describe("apply_patch grammar - blank lines", () => {
  it("TC13_edge_blanks_trimmed_and_middle_blank_kept_as_context", () => {
    const patch = "*** Begin Patch\n*** Update File: a.txt\n@@\n\n a\n\n-b\n+B\n\n*** End Patch";
    const program = parseApplyPatch(patch, "strict");
    const op = program.ops[0];
    expect(op!.kind).toBe("update");
    if (op!.kind === "update") {
      expect(op!.hunks[0]!.lines).toEqual([" a", "", "-b", "+B"]);
    }
  });

  it("TC14_blank_lines_outside_open_hunk_are_separators", () => {
    const patch = "*** Begin Patch\n\n*** Update File: a.txt\n\n@@\n-x\n+y\n*** End Patch";
    const program = parseApplyPatch(patch, "strict");
    const op = program.ops[0];
    expect(op!.kind).toBe("update");
    if (op!.kind === "update") {
      expect(op!.hunks[0]!.lines).toEqual(["-x", "+y"]);
    }
  });
});

describe("applyHunkToContent", () => {
  it("TC15_simple_hunk_with_context_replaces", () => {
    const out = applyHunkToContent("a\nb\nc\n", { header: undefined, lines: [" b", "-c", "+C"] }, "f.txt");
    expect(out).toBe("a\nb\nC\n");
  });

  it("TC16_header_anchor_picks_later_occurrence", () => {
    const content = "s\nx\nmid\ns\nx\nend\n";
    const anchored = applyHunkToContent(content, { header: "mid", lines: [" s", "-x", "+X"] }, "f.txt");
    expect(anchored).toBe("s\nx\nmid\ns\nX\nend\n");
    const first = applyHunkToContent(content, { header: undefined, lines: [" s", "-x", "+X"] }, "f.txt");
    expect(first).toBe("s\nX\nmid\ns\nx\nend\n");
  });

  it("TC17_insert_only_with_header_inserts_after_header_line", () => {
    const out = applyHunkToContent("head\ntail\n", { header: "head", lines: ["+new"] }, "f.txt");
    expect(out).toBe("head\nnew\ntail\n");
  });

  it("TC18_insert_only_without_header_throws", () => {
    expect(() => applyHunkToContent("head\n", { header: undefined, lines: ["+new"] }, "f.txt")).toThrowError(
      /only adds lines but has no context/,
    );
  });

  it("TC19_hunk_not_found_throws_with_content_snippet", () => {
    expect(() => applyHunkToContent("real\n", { header: undefined, lines: [" missing"] }, "f.txt")).toThrowError(
      /hunk search block not found in f.txt/,
    );
    try {
      applyHunkToContent("real\n", { header: undefined, lines: [" missing"] }, "f.txt");
    } catch (err) {
      expect(String(err)).toContain("real");
    }
  });
});

describe("apply_patch tool - structured format", () => {
  it("TC20_multi_file_update_add_delete_is_transactional", () =>
    withTmpDir(async (dir) => {
      writeFileSync(join(dir, "a.txt"), "one\ntwo\n");
      writeFileSync(join(dir, "keep.txt"), "untouched\n");
      writeFileSync(join(dir, "c.txt"), "gone\n");
      const tool = createApplyPatchTool(() => dir);
      const patch =
        "*** Begin Patch\n" +
        "*** Update File: a.txt\n" +
        "@@\n" +
        "-one\n" +
        "+ONE\n" +
        " two\n" +
        "*** Add File: new.txt\n" +
        "+added\n" +
        "*** Delete File: c.txt\n" +
        "*** End Patch";
      const res = await tool.execute({ patch }, makeCtx().ctx) as ApplyPatchResult;
      expect(res.patched).toEqual(["a.txt", "new.txt"]);
      expect(res.deleted).toEqual(["c.txt"]);
      expect(res.blocks).toBe(3);
      expect(res.additions).toBe(3);
      expect(res.removals).toBe(3);
      expect(res.diff).toContain("ONE");
      expect(readFileSync(join(dir, "a.txt"), "utf-8")).toBe("ONE\ntwo\n");
      expect(readFileSync(join(dir, "new.txt"), "utf-8")).toBe("added\n");
      expect(existsSync(join(dir, "c.txt"))).toBe(false);
      expect(readFileSync(join(dir, "keep.txt"), "utf-8")).toBe("untouched\n");
    }));

  it("TC21_single_update_returns_string_patch_path", () =>
    withTmpDir(async (dir) => {
      writeFileSync(join(dir, "a.txt"), "hello\nworld\n");
      const tool = createApplyPatchTool(() => dir);
      const patch = "*** Begin Patch\n*** Update File: a.txt\n@@\n-hello\n+HELLO\n world\n*** End Patch";
      const res = await tool.execute({ patch }, makeCtx().ctx) as ApplyPatchResult;
      expect(res.patched).toBe("a.txt");
      expect(res.additions).toBe(1);
      expect(res.removals).toBe(1);
      expect(readFileSync(join(dir, "a.txt"), "utf-8")).toBe("HELLO\nworld\n");
    }));

  it("TC22_update_missing_file_throws_not_found", () =>
    withTmpDir(async (dir) => {
      const tool = createApplyPatchTool(() => dir);
      const patch = "*** Begin Patch\n*** Update File: a.txt\n@@\n-x\n+y\n*** End Patch";
      await expect(tool.execute({ patch }, makeCtx().ctx)).rejects.toThrow(/file not found: a.txt/);
    }));

  it("TC23_add_existing_file_throws", () =>
    withTmpDir(async (dir) => {
      writeFileSync(join(dir, "a.txt"), "exists\n");
      const tool = createApplyPatchTool(() => dir);
      const patch = "*** Begin Patch\n*** Add File: a.txt\n+new\n*** End Patch";
      await expect(tool.execute({ patch }, makeCtx().ctx)).rejects.toThrow(/file already exists/);
    }));

  it("TC24_hunk_not_found_leaves_every_file_untouched", () =>
    withTmpDir(async (dir) => {
      writeFileSync(join(dir, "a.txt"), "one\ntwo\n");
      writeFileSync(join(dir, "b.txt"), "keep\n");
      const tool = createApplyPatchTool(() => dir);
      const patch =
        "*** Begin Patch\n" +
        "*** Update File: a.txt\n" +
        "@@\n" +
        "-one\n" +
        "+ONE\n" +
        "*** Update File: b.txt\n" +
        "@@\n" +
        "-missing-context\n" +
        "+X\n" +
        "*** End Patch";
      await expect(tool.execute({ patch }, makeCtx().ctx)).rejects.toThrow(/hunk search block not found in b.txt/);
      expect(readFileSync(join(dir, "a.txt"), "utf-8")).toBe("one\ntwo\n");
      expect(readFileSync(join(dir, "b.txt"), "utf-8")).toBe("keep\n");
    }));

  it("TC25_outside_workspace_is_rejected", () =>
    withTmpDir(async (dir) => {
      const tool = createApplyPatchTool(() => dir);
      const patch = "*** Begin Patch\n*** Update File: ../evil.txt\n@@\n-x\n+y\n*** End Patch";
      await expect(tool.execute({ patch }, makeCtx("reject").ctx)).rejects.toBeInstanceOf(ToolPermissionDenied);
      expect(existsSync(join(dir, "..", "evil.txt"))).toBe(false);
    }));

  it("TC26_strict_parse_falls_back_to_lenient", () =>
    withTmpDir(async (dir) => {
      writeFileSync(join(dir, "a.txt"), "one\ntwo\n");
      const tool = createApplyPatchTool(() => dir);
      // Missing "*** Begin Patch": strict fails, lenient recovers.
      const patch = "*** Update File: a.txt\n@@\n-one\n+ONE\n two\n*** End Patch";
      const res = await tool.execute({ patch }, makeCtx().ctx) as ApplyPatchResult;
      expect(res.patched).toBe("a.txt");
      expect(readFileSync(join(dir, "a.txt"), "utf-8")).toBe("ONE\ntwo\n");
    }));

  it("TC27_both_modes_fail_rethrows_strict_error", () =>
    withTmpDir(async (dir) => {
      const tool = createApplyPatchTool(() => dir);
      const patch = "*** Begin Patch\n*** Delete File:\n*** End Patch";
      await expect(tool.execute({ patch }, makeCtx().ctx)).rejects.toThrow(/is missing a path/);
    }));

  it("TC28_move_updates_path_and_deletes_source", () =>
    withTmpDir(async (dir) => {
      writeFileSync(join(dir, "a.txt"), "one\ntwo\n");
      const tool = createApplyPatchTool(() => dir);
      const patch =
        "*** Begin Patch\n" +
        "*** Update File: a.txt\n" +
        "@@\n" +
        "-one\n" +
        "+ONE\n" +
        " two\n" +
        "*** Move to: sub/b.txt\n" +
        "*** End Patch";
      const res = await tool.execute({ patch }, makeCtx().ctx) as ApplyPatchResult;
      expect(res.patched).toBe("sub/b.txt");
      expect(res.deleted).toEqual(["a.txt"]);
      expect(existsSync(join(dir, "a.txt"))).toBe(false);
      expect(readFileSync(join(dir, "sub", "b.txt"), "utf-8")).toBe("ONE\ntwo\n");
    }));

  it("TC29_compensation_restores_all_files", () =>
    withTmpDir(async (dir) => {
      writeFileSync(join(dir, "a.txt"), "one\ntwo\n");
      writeFileSync(join(dir, "c.txt"), "gone\n");
      const tool = createApplyPatchTool(() => dir);
      const { ctx, compensation } = makeCtx();
      const patch =
        "*** Begin Patch\n" +
        "*** Update File: a.txt\n" +
        "@@\n" +
        "-one\n" +
        "+ONE\n" +
        " two\n" +
        "*** Delete File: c.txt\n" +
        "*** End Patch";
      await tool.execute({ patch }, ctx);
      expect(readFileSync(join(dir, "a.txt"), "utf-8")).toBe("ONE\ntwo\n");
      expect(existsSync(join(dir, "c.txt"))).toBe(false);
      expect(compensation).toHaveLength(1);
      await compensation[0]!();
      expect(readFileSync(join(dir, "a.txt"), "utf-8")).toBe("one\ntwo\n");
      expect(readFileSync(join(dir, "c.txt"), "utf-8")).toBe("gone\n");
    }));

  it("TC30_tracker_requires_read_before_update", () =>
    withTmpDir(async (dir) => {
      writeFileSync(join(dir, "a.txt"), "one\ntwo\n");
      const tracker = new FileReadTracker();
      const tool = createApplyPatchTool(() => dir, tracker);
      const patch = "*** Begin Patch\n*** Update File: a.txt\n@@\n-one\n+ONE\n two\n*** End Patch";
      const { ctx } = makeCtx();
      await expect(tool.execute({ patch }, ctx)).rejects.toBeInstanceOf(ToolPermissionDenied);
      await tracker.trackRead(join(dir, "a.txt"), await stat(join(dir, "a.txt")));
      const res = await tool.execute({ patch }, ctx) as ApplyPatchResult;
      expect(res.patched).toBe("a.txt");
      expect(readFileSync(join(dir, "a.txt"), "utf-8")).toBe("ONE\ntwo\n");
    }));
});

describe("apply_patch tool - legacy SEARCH/REPLACE format", () => {
  it("TC31_legacy_with_filePath_still_applies", () =>
    withTmpDir(async (dir) => {
      writeFileSync(join(dir, "a.txt"), "one\ntwo\n");
      const tool = createApplyPatchTool(() => dir);
      const patch = "<<<<<<< SEARCH\none\n=======\nONE\n>>>>>>>\n";
      const res = await tool.execute({ filePath: "a.txt", patch }, makeCtx().ctx) as ApplyPatchResult;
      expect(res.patched).toBe("a.txt");
      expect(res.blocks).toBe(1);
      expect(readFileSync(join(dir, "a.txt"), "utf-8")).toBe("ONE\ntwo\n");
    }));

  it("TC32_legacy_without_filePath_throws", () =>
    withTmpDir(async (dir) => {
      const tool = createApplyPatchTool(() => dir);
      const patch = "<<<<<<< SEARCH\none\n=======\nONE\n>>>>>>>\n";
      await expect(tool.execute({ patch }, makeCtx().ctx)).rejects.toThrow(/filePath is required/);
    }));
});
