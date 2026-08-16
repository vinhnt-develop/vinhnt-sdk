import { describe, it, expect, vi } from "vitest";
import { createEditFileTool } from "@vinhnt-sdk/tools";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync("edit-test-");
  return fn(dir).finally(() => rmSync(dir, { recursive: true, force: true }));
}

function makeCtx() {
  return {
    ask: vi.fn(async () => "once" as const),
    setCompensation: vi.fn(),
  };
}

describe("edit_file — multi-layer matching", () => {
  it("exact match (layer 1)", async () => {
    await withTempDir(async (dir) => {
      writeFileSync(join(dir, "test.txt"), "const x = 1;\nconst y = 2;");
      const tool = createEditFileTool(() => dir);
      const result = await tool.execute(
        { filePath: "test.txt", oldString: "const x = 1;", newString: "const x = 42;" },
        makeCtx(),
      );
      const content = readFileSync(join(dir, "test.txt"), "utf-8");
      expect(content).toBe("const x = 42;\nconst y = 2;");
      expect(result).toHaveProperty("edited", "test.txt");
    });
  });

  it("trimmed match — ignores per-line whitespace (layer 2)", async () => {
    await withTempDir(async (dir) => {
      writeFileSync(join(dir, "test.txt"), "  const x = 1;\nconst y = 2;");
      const tool = createEditFileTool(() => dir);
      await tool.execute(
        { filePath: "test.txt", oldString: "const x = 1;", newString: "const x = 42;" },
        makeCtx(),
      );
      const content = readFileSync(join(dir, "test.txt"), "utf-8");
      expect(content).toBe("  const x = 42;\nconst y = 2;");
    });
  });

  it("indentation-agnostic match (layer 3)", async () => {
    await withTempDir(async (dir) => {
      writeFileSync(join(dir, "test.txt"), "function foo() {\n    return 1;\n}");
      const tool = createEditFileTool(() => dir);
      await tool.execute(
        { filePath: "test.txt", oldString: "  return 1;\n}", newString: "  return 42;\n}" },
        makeCtx(),
      );
      const content = readFileSync(join(dir, "test.txt"), "utf-8");
      expect(content).toContain("return 42");
    });
  });

  it("fuzzy sliding-window match (layer 4)", async () => {
    await withTempDir(async (dir) => {
      writeFileSync(join(dir, "test.txt"), "The quick brown fox jumps over the lazy dog.");
      const tool = createEditFileTool(() => dir);
      await tool.execute(
        { filePath: "test.txt", oldString: "quick brown fox jumps over the lazy dog.", newString: "fast brown fox leaps over the sleeping hound" },
        makeCtx(),
      );
      const content = readFileSync(join(dir, "test.txt"), "utf-8");
      expect(content).toContain("fast brown fox");
    });
  });

  it("case-insensitive match (layer 5)", async () => {
    await withTempDir(async (dir) => {
      writeFileSync(join(dir, "test.txt"), "Hello World\nFoo Bar");
      const tool = createEditFileTool(() => dir);
      await tool.execute(
        { filePath: "test.txt", oldString: "hello world", newString: "Hi World" },
        makeCtx(),
      );
      const content = readFileSync(join(dir, "test.txt"), "utf-8");
      expect(content).toBe("Hi World\nFoo Bar");
    });
  });

  it("normalized whitespace match (layer 6)", async () => {
    await withTempDir(async (dir) => {
      writeFileSync(join(dir, "test.txt"), "function  foo(a,   b) {\n  return  a +   b;\n}");
      const tool = createEditFileTool(() => dir);
      await tool.execute(
        { filePath: "test.txt", oldString: "function foo(a, b) {\nreturn a + b;", newString: "function bar(a, b) {\n  return a * b;" },
        makeCtx(),
      );
      const content = readFileSync(join(dir, "test.txt"), "utf-8");
      expect(content).toContain("function bar");
    });
  });

  it("context recovery — partial match with key phrases (layer 8)", async () => {
    await withTempDir(async (dir) => {
      writeFileSync(join(dir, "test.txt"), "// Copyright 2024\n// SPDX-License-Identifier: MIT\n\nfunction add(a, b) {\n  return a + b;\n}\n\nfunction sub(a, b) {\n  return a - b;\n}");
      const tool = createEditFileTool(() => dir);
      await tool.execute(
        { filePath: "test.txt", oldString: "function add(a, b) {\n  return a + b;\n}\n\nfunction sub(a, b) {\n  return a - b;\n}", newString: "function add(a, b) {\n  return a + b;\n}\n\nfunction multiply(a, b) {\n  return a * b;\n}" },
        makeCtx(),
      );
      const content = readFileSync(join(dir, "test.txt"), "utf-8");
      expect(content).toContain("function multiply");
    });
  });

  it("throws helpful error when no match found", async () => {
    await withTempDir(async (dir) => {
      writeFileSync(join(dir, "test.txt"), "abc def ghi");
      const tool = createEditFileTool(() => dir);
      await expect(
        tool.execute({ filePath: "test.txt", oldString: "xyz not found", newString: "nope" }, makeCtx()),
      ).rejects.toThrow("not found");
    });
  });

  it("throws when duplicate exact match found", async () => {
    await withTempDir(async (dir) => {
      writeFileSync(join(dir, "test.txt"), "foo\nbar\nfoo");
      const tool = createEditFileTool(() => dir);
      await expect(
        tool.execute({ filePath: "test.txt", oldString: "foo", newString: "baz" }, makeCtx()),
      ).rejects.toThrow("found");
    });
  });

  it("multi-line replacement preserves surrounding content", async () => {
    await withTempDir(async (dir) => {
      writeFileSync(join(dir, "test.txt"), "line1\nline2\nline3\nline4");
      const tool = createEditFileTool(() => dir);
      await tool.execute(
        { filePath: "test.txt", oldString: "line2\nline3", newString: "replaced2\nreplaced3" },
        makeCtx(),
      );
      const content = readFileSync(join(dir, "test.txt"), "utf-8");
      expect(content).toBe("line1\nreplaced2\nreplaced3\nline4");
    });
  });

  it("multi-hunk edits via edits array", async () => {
    await withTempDir(async (dir) => {
      writeFileSync(join(dir, "test.txt"), "foo = 1\nbar = 2\nbaz = 3");
      const tool = createEditFileTool(() => dir);
      const result = await tool.execute(
        {
          filePath: "test.txt",
          edits: [
            { oldString: "foo = 1", newString: "foo = 42" },
            { oldString: "baz = 3", newString: "baz = 99" },
          ],
        },
        makeCtx(),
      );
      const content = readFileSync(join(dir, "test.txt"), "utf-8");
      expect(content).toBe("foo = 42\nbar = 2\nbaz = 99");
      expect(result).toHaveProperty("hunkCount", 2);
      expect(result).toHaveProperty("edited", "test.txt");
    });
  });

  it("multi-hunk edits throws on first error in chain", async () => {
    await withTempDir(async (dir) => {
      writeFileSync(join(dir, "test.txt"), "keep = 1\nkeep = 2");
      const tool = createEditFileTool(() => dir);
      await expect(
        tool.execute(
          {
            filePath: "test.txt",
            edits: [
              { oldString: "keep = 1", newString: "changed = 1" },
              { oldString: "nonexistent", newString: "wont appear" },
            ],
          },
          makeCtx(),
        ),
      ).rejects.toThrow("not found");
      const content = readFileSync(join(dir, "test.txt"), "utf-8");
      expect(content).toBe("keep = 1\nkeep = 2");
    });
  });
});
