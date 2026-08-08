import { stderr } from "node:process";
import type { LogEntry, LoggerSink } from "./logger.js";

const LEVEL_PREFIX: Record<string, string> = {
  debug: "  •",
  info: "  •",
  warn: "  ⚠",
  error: "  ✘",
};

export class ConsoleSink implements LoggerSink {
  write(entry: LogEntry): void {
    const prefix = LEVEL_PREFIX[entry.level] ?? "  •";
    const parts = [`${prefix} [${entry.level.toUpperCase()}] ${entry.message}`];

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context));
    }
    if (entry.error) {
      parts.push(`(${entry.error.message})`);
    }

    stderr.write(parts.join(" ") + "\n");
  }
}
