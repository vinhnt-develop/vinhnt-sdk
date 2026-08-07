import { appendFileSync, mkdirSync, existsSync, statSync, renameSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import type { LogEntry, LoggerSink } from "./logger.js";

export interface FileSinkOptions {
  readonly maxSize?: number;
  readonly maxFiles?: number;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;
const DEFAULT_MAX_FILES = 5;

export class FileSink implements LoggerSink {
  private readonly filePath: string;
  private readonly maxSize: number;
  private readonly maxFiles: number;

  constructor(filePath: string, options?: FileSinkOptions) {
    this.filePath = filePath;
    this.maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE;
    this.maxFiles = options?.maxFiles ?? DEFAULT_MAX_FILES;

    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  write(entry: LogEntry): void {
    this.rotateIfNeeded();
    const line = JSON.stringify(entry) + "\n";
    appendFileSync(this.filePath, line, "utf-8");
  }

  private rotateIfNeeded(): void {
    if (!existsSync(this.filePath)) return;

    let size = 0;
    try {
      size = statSync(this.filePath).size;
    } catch {
      return;
    }
    if (size < this.maxSize) return;

    const oldest = `${this.filePath}.${this.maxFiles}`;
    if (existsSync(oldest)) {
      try { unlinkSync(oldest); } catch { /* ignore */ }
    }

    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const src = `${this.filePath}.${i}`;
      const dst = `${this.filePath}.${i + 1}`;
      if (existsSync(src)) {
        try { renameSync(src, dst); } catch { /* ignore */ }
      }
    }

    try { renameSync(this.filePath, `${this.filePath}.1`); } catch { /* ignore */ }
  }
}
