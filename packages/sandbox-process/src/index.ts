import { execFile } from "node:child_process";
import type { SandboxConfig, SandboxResult, ProcessSandbox, ProcessSandboxExecuteOptions } from "@vinhnt-sdk/sandbox";
import { parseCommand, killProcessTree, treeKillSpawnOptions } from "@vinhnt-sdk/sandbox";

/** Default allowed commands for process isolation */
const DEFAULT_ALLOWED_COMMANDS = new Set([
  "node",
  "npm",
  "npx",
  "pnpm",
  "git",
  "ls",
  "cat",
  "grep",
  "find",
  "head",
  "tail",
  "wc",
  "sort",
  "uniq",
  "diff",
  "echo",
  "pwd",
  "whoami",
  "date",
]);

/** Blocked command patterns (security) */
const BLOCKED_COMMAND_PATTERNS = [
  /\brm\s+-rf\s+\/(?:[^a-z]|$)/i,  // rm -rf / (root; not /something)
  /\bmkfs\b/i,
  /\bdd\b.*of=\/dev/i,
  /\bformat\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bkill\s+-9\s+1\b/i,  // kill PID 1
  /\bcurl\b.*\|\s*sh/i,  // curl | sh
  /\bwget\b.*\|\s*sh/i,  // wget | sh
];

/**
 * Normalize a parsed command file to a comparable base name.
 * - strips any leading directory (POSIX + Windows separators)
 * - strips the `.exe` extension and lowercases on Windows so that
 *   allowlist entries like `node` match `C:\...\node.exe`.
 */
function extractBaseName(file: string): string {
  const name = file.split("/").pop()?.split("\\").pop() ?? file;
  return process.platform === "win32" ? name.toLowerCase().replace(/\.exe$/, "") : name;
}

/**
 * Check if a command is allowed in the sandbox.
 */
function isCommandAllowed(command: string, allowedCommands?: Set<string>): boolean {
  const parsed = parseCommand(command);
  const baseCommand = extractBaseName(parsed.file);

  // Check blocked patterns first
  for (const pattern of BLOCKED_COMMAND_PATTERNS) {
    if (pattern.test(command)) {
      return false;
    }
  }

  // Check allowlist
  const allowlist = allowedCommands ?? DEFAULT_ALLOWED_COMMANDS;
  return allowlist.has(baseCommand);
}

/**
 * Create an empty environment with only explicitly allowed variables.
 * This is the secure default for process isolation.
 */
function createEmptyEnv(allowedVars?: string[]): Record<string, string> {
  const env: Record<string, string> = {};
  if (allowedVars) {
    for (const key of allowedVars) {
      const value = process.env[key];
      if (value !== undefined) {
        env[key] = value;
      }
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

    // Validate command against allowlist
    if (!isCommandAllowed(options.command, this.config.allowedCommands)) {
      return {
        result: {
          stdout: "",
          stderr: `Command not allowed: ${options.command.split(" ")[0]}`,
          exitCode: 126,
        },
        exitCode: 126,
        durationMs: Date.now() - start,
        timedOut: false,
      };
    }

    // Create secure environment (empty by default, only explicitly allowed vars)
    const secureEnv = this.config.allowedEnvVars
      ? createEmptyEnv(this.config.allowedEnvVars)
      : createEmptyEnv();

    // Parse the command
    const parsed = parseCommand(options.command);

    // Build exec args with security options
    const execArgs: string[] = [];

    // Add Node.js Permission Model flags if enabled (Node 22+)
    if (this.config.enablePermissionModel && extractBaseName(parsed.file) === "node") {
      execArgs.push("--permission");
      // Allow read-only access to current directory
      execArgs.push(`--allow-fs-read=${options.cwd}`);
      // Allow read-write to temp directory
      execArgs.push("--allow-fs-read=/tmp");
      execArgs.push("--allow-fs-write=/tmp");
      // Block all other access by default
    }

    // Add resource limits
    const maxBuffer = 10 * 1024 * 1024; // 10MB

    return new Promise((resolve) => {
      const child = execFile(
        parsed.file,
        [...execArgs, ...parsed.args],
        {
          cwd: options.cwd,
          timeout: options.timeoutMs,
          maxBuffer,
          encoding: "utf-8" as const,
          windowsHide: true,
          ...treeKillSpawnOptions(),
          env: secureEnv,
          // Security options
          ...(process.platform !== "win32" ? {
            // On Linux/macOS, use additional security
            uid: process.getuid?.(),
            gid: process.getgid?.(),
          } : {}),
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
    // Clean up resources if any
  }
}

/** Create a process-isolation sandbox backend. */
export function createProcessSandbox(config: SandboxConfig): ProcessSandbox {
  return new ProcessSandboxImpl(config);
}