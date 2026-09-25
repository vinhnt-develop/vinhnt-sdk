import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ToolPermissionDenied } from "@vinhnt-sdk/schema";
import { FileReadTracker } from "../src/read-tracker.js";

function withTmpDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "vinhnt-rt-"));
  return fn(dir).finally(() => rmSync(dir, { recursive: true, force: true }));
}

describe("FileReadTracker.assertWasRead", () => {
  it("allows creating a file that does not exist yet (nothing to read first)", () =>
    withTmpDir(async (dir) => {
      const tracker = new FileReadTracker();
      await expect(tracker.assertWasRead(join(dir, "new.txt"))).resolves.toBeUndefined();
    }));

  it("denies writing an existing file that was never read", () =>
    withTmpDir(async (dir) => {
      const file = join(dir, "existing.txt");
      writeFileSync(file, "hi");
      const tracker = new FileReadTracker();
      await expect(tracker.assertWasRead(file)).rejects.toBeInstanceOf(ToolPermissionDenied);
    }));

  it("allows a file that was read and is unchanged", () =>
    withTmpDir(async (dir) => {
      const file = join(dir, "read.txt");
      writeFileSync(file, "hi");
      const tracker = new FileReadTracker();
      await tracker.trackRead(file, statSync(file));
      await expect(tracker.assertWasRead(file)).resolves.toBeUndefined();
    }));

  it("denies a file that changed externally since the last read", () =>
    withTmpDir(async (dir) => {
      const file = join(dir, "changed.txt");
      writeFileSync(file, "hi");
      const tracker = new FileReadTracker();
      await tracker.trackRead(file, statSync(file));
      // External rewrite with different size → stale record.
      writeFileSync(file, "hi — externally rewritten with a longer body");
      await expect(tracker.assertWasRead(file)).rejects.toBeInstanceOf(ToolPermissionDenied);
    }));
});
