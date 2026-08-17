import { stat } from "node:fs/promises";
import { ToolPermissionDenied } from "@vinhnt-sdk/schema";

interface ReadRecord {
  readAt: number;
  mtimeMs: number;
}

/**
 * Tracks when files were read and enforces read-before-write: writes to a
 * file that was never read (or changed externally since) are denied.
 */
export class FileReadTracker {
  private records = new Map<string, ReadRecord>();

  trackRead(filePath: string, mtimeMs: number): void {
    this.records.set(filePath, { readAt: Date.now(), mtimeMs });
  }

  async assertWasRead(filePath: string): Promise<void> {
    const record = this.records.get(filePath);
    if (!record) {
      throw new ToolPermissionDenied(
        "write_file",
        `File "${filePath}" has not been read before writing. Use read_file first.`,
      );
    }
    try {
      const st = await stat(filePath);
      if (st.mtimeMs !== record.mtimeMs) {
        this.records.delete(filePath);
        throw new ToolPermissionDenied(
          "write_file",
          `File "${filePath}" has been modified externally since it was last read. Read it again before writing.`,
        );
      }
    } catch (err) {
      if (err instanceof ToolPermissionDenied) throw err;
      this.records.delete(filePath);
    }
  }

  clear(filePath: string): void {
    this.records.delete(filePath);
  }

  reset(): void {
    this.records.clear();
  }
}
