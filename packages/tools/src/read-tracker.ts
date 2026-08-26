import { realpath, stat } from "node:fs/promises";
import type { Stats } from "node:fs";
import { ToolPermissionDenied } from "@vinhnt-sdk/schema";

interface ReadRecord {
  readAt: number;
  ino: number;
  size: number;
  ctimeMs: number;
  mtimeMs: number;
}

/** Resolve a file path to its canonical real path (RV-47) so symlinked and
 *  differently-spelled aliases of the same file share one tracker record. */
async function resolveKey(filePath: string): Promise<string> {
  try {
    return await realpath(filePath);
  } catch {
    return filePath;
  }
}

/**
 * Tracks when files were read and enforces read-before-write: writes to a
 * file that was never read (or changed externally since) are denied.
 *
 * Records are keyed by canonical real path and snapshotted with inode + size
 * + mtime so external replacement (delete/recreate, rename over) is caught
 * even when the modification time happens to be unchanged.
 */
export class FileReadTracker {
  private records = new Map<string, ReadRecord>();

  async trackRead(filePath: string, st: Stats): Promise<void> {
    const key = await resolveKey(filePath);
    this.records.set(key, {
      readAt: Date.now(),
      ino: st.ino,
      size: st.size,
      ctimeMs: st.ctimeMs,
      mtimeMs: st.mtimeMs,
    });
  }

  async assertWasRead(filePath: string): Promise<void> {
    const key = await resolveKey(filePath);
    const record = this.records.get(key);
    if (!record) {
      throw new ToolPermissionDenied(
        "write_file",
        `File "${filePath}" has not been read before writing. Use read_file first.`,
      );
    }
    try {
      const st = await stat(key);
      const changed =
        st.ino !== record.ino ||
        st.size !== record.size ||
        st.ctimeMs !== record.ctimeMs ||
        st.mtimeMs !== record.mtimeMs;
      if (changed) {
        this.records.delete(key);
        throw new ToolPermissionDenied(
          "write_file",
          `File "${filePath}" has been modified externally since it was last read. Read it again before writing.`,
        );
      }
    } catch (err) {
      if (err instanceof ToolPermissionDenied) throw err;
      this.records.delete(key);
    }
  }

  clear(filePath: string): void {
    this.records.delete(filePath);
  }

  reset(): void {
    this.records.clear();
  }
}
