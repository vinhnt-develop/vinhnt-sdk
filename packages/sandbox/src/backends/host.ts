import { execFile } from "node:child_process";
import type { SandboxConfig, SandboxResult, ProcessSandbox, ProcessSandboxExecuteOptions } from "../types.js";
import { parseCommand } from "../shell-parser.js";
import { treeKillSpawnOptions } from "../kill-tree.js";
import { withTimeoutAndAbort } from "../timeout.js";
import { sanitizeEnv } from "@vinhnt-sdk/security";

class HostSandbox implements ProcessSandbox {
  readonly scope = "host" as const;

  async execute(options: ProcessSandboxExecuteOptions): Promise<SandboxResult<{ stdout: string; stderr: string; exitCode: number }>> {
    const start = Date.now();

    return new Promise((resolve) => {
      const parsed = parseCommand(options.command);
      const child = execFile(
        parsed.file,
        parsed.args,
        {
          cwd: options.cwd,
          maxBuffer: 10 * 1024 * 1024,
          encoding: "utf-8" as const,
          windowsHide: true,
          ...treeKillSpawnOptions(),
          env: options.env && Object.keys(options.env).length > 0
            ? { ...sanitizeEnv(), ...options.env }
            : sanitizeEnv(),
        },
        (err, stdout, stderr) => {
          const durationMs = Date.now() - start;
          if (err) {
            const exitCode = typeof err.code === "number" ? err.code : 1;
            resolve({
              result: { stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), exitCode },
              exitCode,
              durationMs,
              timedOut: handle.timedOut,
            });
          } else {
            resolve({
              result: { stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), exitCode: 0 },
              exitCode: 0,
              durationMs,
              timedOut: false,
            });
          }
        },
      );

      const handle = withTimeoutAndAbort(child, options.timeoutMs, options.signal, (reason) => {
        resolve({
          result: { stdout: "", stderr: reason, exitCode: 1 },
          exitCode: 1,
          durationMs: Date.now() - start,
          timedOut: handle.timedOut,
        });
      });
    });
  }

  async destroy(): Promise<void> {}
}

/** Create a host (no-isolation) sandbox backend. */
export function createHostSandbox(_config?: SandboxConfig): ProcessSandbox {
  return new HostSandbox();
}
