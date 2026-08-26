import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import { relative, isAbsolute } from "node:path";
import type { SandboxConfig, SandboxResult, ProcessSandbox, ProcessSandboxExecuteOptions } from "../types.js";
import { parseCommand } from "../shell-parser.js";
import { treeKillSpawnOptions } from "../kill-tree.js";
import { withTimeoutAndAbort } from "../timeout.js";

const DEFAULT_ALLOWED_COMMANDS = new Set([
  "node", "npm", "npx", "pnpm", "git",
  "ls", "cat", "grep", "find", "head", "tail", "wc", "sort", "uniq", "diff",
  "echo", "pwd", "whoami", "date",
]);

const BLOCKED_COMMAND_PATTERNS = [
  /\brm\s+-rf\s+\/(?:[^a-z]|$)/i,
  /\bmkfs\b/i,
  /\bdd\b.*of=\/dev/i,
  /\bformat\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bkill\s+-9\s+1\b/i,
  /\bcurl\b.*\|\s*sh/i,
  /\bwget\b.*\|\s*sh/i,
];

function extractBaseName(file: string): string {
  const name = file.split("/").pop()?.split("\\").pop() ?? file;
  return process.platform === "win32" ? name.toLowerCase().replace(/\.exe$/, "") : name;
}

function isCommandAllowed(command: string, allowedCommands?: Set<string>): boolean {
  const parsed = parseCommand(command);
  const baseCommand = extractBaseName(parsed.file);
  for (const pattern of BLOCKED_COMMAND_PATTERNS) {
    if (pattern.test(command)) return false;
  }
  const allowlist = allowedCommands ?? DEFAULT_ALLOWED_COMMANDS;
  return allowlist.has(baseCommand);
}

function isPathWithin(target: string, roots: string[]): boolean {
  for (const root of roots) {
    const rel = relative(root, target);
    if (rel === "") return true;
    if (rel.startsWith("..")) continue;
    if (isAbsolute(rel)) continue;
    return true;
  }
  return false;
}

function createEmptyEnv(allowedVars?: string[]): Record<string, string> {
  const env: Record<string, string> = {};
  if (allowedVars) {
    for (const key of allowedVars) {
      const value = process.env[key];
      if (value !== undefined) env[key] = value;
    }
  }
  return env;
}

class ProcessSandboxImpl implements ProcessSandbox {
  readonly scope = "process" as const;
  private readonly config: SandboxConfig;

  constructor(config: SandboxConfig) {
    this.config = config;
  }

  async execute(options: ProcessSandboxExecuteOptions): Promise<SandboxResult<{ stdout: string; stderr: string; exitCode: number }>> {
    const start = Date.now();

    if (!isCommandAllowed(options.command, this.config.allowedCommands)) {
      return {
        result: { stdout: "", stderr: `Command not allowed: ${options.command.split(" ")[0]}`, exitCode: 126 },
        exitCode: 126, durationMs: Date.now() - start, timedOut: false,
      };
    }

    if (this.config.allowedPaths && this.config.allowedPaths.length > 0) {
      let cwdReal: string;
      const allowedReal: string[] = [];
      try { cwdReal = await realpath(options.cwd); } catch { cwdReal = options.cwd; }
      for (const p of this.config.allowedPaths) {
        let rootReal = p;
        try { rootReal = await realpath(p); } catch { /* fall back to lexical path */ }
        allowedReal.push(rootReal);
      }
      if (!isPathWithin(cwdReal, allowedReal)) {
        return {
          result: { stdout: "", stderr: `Working directory outside allowed paths: ${options.cwd}`, exitCode: 126 },
          exitCode: 126, durationMs: Date.now() - start, timedOut: false,
        };
      }
    }

    const secureEnv = this.config.allowedEnvVars
      ? createEmptyEnv(this.config.allowedEnvVars)
      : createEmptyEnv();

    const parsed = parseCommand(options.command);
    const execArgs: string[] = [];

    if (this.config.enablePermissionModel && extractBaseName(parsed.file) === "node") {
      execArgs.push("--permission");
      execArgs.push(`--allow-fs-read=${options.cwd}`);
      execArgs.push("--allow-fs-read=/tmp");
      execArgs.push("--allow-fs-write=/tmp");
    }

    const maxBuffer = 10 * 1024 * 1024;

    return new Promise((resolve) => {
      const child = execFile(
        parsed.file,
        [...execArgs, ...parsed.args],
        {
          cwd: options.cwd,
          maxBuffer,
          encoding: "utf-8" as const,
          windowsHide: true,
          ...treeKillSpawnOptions(),
          env: secureEnv,
          ...(process.platform !== "win32" ? { uid: process.getuid?.(), gid: process.getgid?.() } : {}),
        },
        (err, stdout, stderr) => {
          const durationMs = Date.now() - start;
          if (err) {
            const exitCode = typeof err.code === "number" ? err.code : 1;
            resolve({
              result: { stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), exitCode },
              exitCode, durationMs, timedOut: handle.timedOut,
            });
          } else {
            resolve({
              result: { stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), exitCode: 0 },
              exitCode: 0, durationMs, timedOut: false,
            });
          }
        },
      );

      const handle = withTimeoutAndAbort(child, options.timeoutMs, options.signal, (reason) => {
        resolve({
          result: { stdout: "", stderr: reason, exitCode: 1 },
          exitCode: 1, durationMs: Date.now() - start, timedOut: handle.timedOut,
        });
      });
    });
  }

  async destroy(): Promise<void> {}
}

/** Create a process-isolation sandbox backend. */
export function createProcessSandbox(config: SandboxConfig): ProcessSandbox {
  return new ProcessSandboxImpl(config);
}
