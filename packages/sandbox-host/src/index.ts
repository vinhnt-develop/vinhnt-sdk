import { execFile } from "node:child_process";
import type { SandboxConfig, SandboxResult, ProcessSandbox, ProcessSandboxExecuteOptions } from "@vinhnt-sdk/sandbox";
import { parseCommand, killProcessTree, treeKillSpawnOptions } from "@vinhnt-sdk/sandbox";
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
          timeout: options.timeoutMs,
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
            const timedOut = err.killed === true;
            resolve({
              result: { stdout: stdout ?? "", stderr: stderr ?? "", exitCode },
              exitCode,
              durationMs,
              timedOut,
            });
          } else {
            resolve({
              result: { stdout: stdout ?? "", stderr: stderr ?? "", exitCode: 0 },
              exitCode: 0,
              durationMs,
              timedOut: false,
            });
          }
        },
      );

      if (options.signal) {
        if (options.signal.aborted) {
          killProcessTree(child);
          resolve({
            result: { stdout: "", stderr: "Aborted", exitCode: 1 },
            exitCode: 1,
            durationMs: Date.now() - start,
            timedOut: false,
          });
          return;
        }
        options.signal.addEventListener("abort", () => {
          killProcessTree(child);
          resolve({
            result: { stdout: "", stderr: options.signal?.reason ?? "Aborted", exitCode: 1 },
            exitCode: 1,
            durationMs: Date.now() - start,
            timedOut: false,
          });
        }, { once: true });
      }
    });
  }

  async destroy(): Promise<void> {
    // No resources to clean up
  }
}

/** Create a host (no-isolation) sandbox backend. */
export function createHostSandbox(_config?: SandboxConfig): ProcessSandbox {
  return new HostSandbox();
}