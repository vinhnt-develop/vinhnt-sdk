/**
 * Tool sandboxing for isolated execution.
 *
 * @module tool/sandbox
 * @packageDocumentation
 */

import type { ToolDefinition, ToolContext } from "./definitions.js";
import { parseCommand } from "./shell-parser.js";
import { sanitizeEnv } from "@vinhnt-sdk/security";
import { killProcessTree, treeKillSpawnOptions } from "./kill-tree.js";

export { sanitizeEnv };

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

// ---------------------------------------------------------------------------
// Command allowlisting
// ---------------------------------------------------------------------------

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
  /\brm\s+-rf\s+\/[^a-z]/i,  // rm -rf / (not /something)
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
 * Check if a command is allowed in the sandbox.
 */
function isCommandAllowed(command: string, allowedCommands?: Set<string>): boolean {
  const parsed = parseCommand(command);
  const baseCommand = parsed.file.split("/").pop()?.split("\\").pop() ?? parsed.file;

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Sandbox execution scope — string type, NOT closed union */
export type SandboxScope = string;

/**
 * Default sandbox scopes — exported for convenience.
 * User có thể register custom scope qua ProcessSandbox adapter.
 */
export const KNOWN_SANDBOX_SCOPES = ["host", "process", "container"] as const;

/** Sandbox configuration */
export interface SandboxConfig {
  defaultTimeoutMs: number;
  /** Execution scope (default: "host" — no isolation) */
  scope?: SandboxScope;
  /** Allowed filesystem paths (for "process" scope) */
  allowedPaths?: string[];
  /** Blocked filesystem paths */
  blockedPaths?: string[];
  /** Allow network access (default: true) */
  allowNetwork?: boolean;
  /** Allowed environment variables */
  allowedEnvVars?: string[];
  /** Allowed commands (for "process" scope) */
  allowedCommands?: Set<string>;
  /** Enable Node.js Permission Model (Node 22+) */
  enablePermissionModel?: boolean;
}

/** Result of a sandboxed execution */
export interface SandboxResult<T = unknown> {
  result: T;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
  /** Resources consumed during execution */
  resources?: {
    cpuTimeMs?: number;
    memoryBytes?: number;
  };
}

// ---------------------------------------------------------------------------
// Sandboxed execution adapter interface
// ---------------------------------------------------------------------------

/**
 * Interface for sandbox execution adapters.
 *
 * Implementations can provide different levels of isolation:
 * - `host`: No isolation (current behavior)
 * - `process`: Node.js Permission Model + empty env + command allowlist
 * - `container`: Docker/Firecracker microVM
 */
export interface ProcessSandbox {
  /** The scope this sandbox provides */
  readonly scope: SandboxScope;

  /** Execute a command in the sandbox */
  execute(options: {
    command: string;
    cwd: string;
    timeoutMs: number;
    env?: Record<string, string>;
    signal?: AbortSignal;
  }): Promise<SandboxResult<{ stdout: string; stderr: string; exitCode: number }>>;

  /** Clean up resources */
  destroy(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Host sandbox (no isolation — current behavior)
// ---------------------------------------------------------------------------

import { execFile } from "node:child_process";

class HostSandbox implements ProcessSandbox {
  readonly scope = "host" as const;

  async execute(options: {
    command: string;
    cwd: string;
    timeoutMs: number;
    env?: Record<string, string>;
    signal?: AbortSignal;
  }): Promise<SandboxResult<{ stdout: string; stderr: string; exitCode: number }>> {
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

// ---------------------------------------------------------------------------
// Process sandbox (Node.js Permission Model + command allowlist)
// ---------------------------------------------------------------------------

class ProcessSandboxImpl implements ProcessSandbox {
  readonly scope = "process" as const;
  private readonly config: SandboxConfig;

  constructor(config: SandboxConfig) {
    this.config = config;
  }

  async execute(options: {
    command: string;
    cwd: string;
    timeoutMs: number;
    env?: Record<string, string>;
    signal?: AbortSignal;
  }): Promise<SandboxResult<{ stdout: string; stderr: string; exitCode: number }>> {
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
    if (this.config.enablePermissionModel && parsed.file === "node") {
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

// ---------------------------------------------------------------------------
// Container sandbox (placeholder for future implementation)
// ---------------------------------------------------------------------------

class ContainerSandboxImpl implements ProcessSandbox {
  readonly scope = "container" as const;

  async execute(options: {
    command: string;
    cwd: string;
    timeoutMs: number;
    env?: Record<string, string>;
    signal?: AbortSignal;
  }): Promise<SandboxResult<{ stdout: string; stderr: string; exitCode: number }>> {
    // Container sandbox would use Docker, bubblewrap, or similar
    // For now, fall back to process sandbox with a warning
    console.warn("[sandbox] Container sandbox not yet implemented, using process sandbox");

    const processSandbox = new ProcessSandboxImpl({
      defaultTimeoutMs: options.timeoutMs,
      scope: "process",
    });

    return processSandbox.execute(options);
  }

  async destroy(): Promise<void> {
    // Clean up container resources if any
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a process sandbox based on the configured scope.
 *
 * @param config - Sandbox configuration
 * @returns ProcessSandbox instance
 */
export function createSandbox(config: SandboxConfig): ProcessSandbox {
  switch (config.scope) {
    case "process":
      return new ProcessSandboxImpl(config);
    case "container":
      return new ContainerSandboxImpl();
    case "host":
    default:
      return new HostSandbox();
  }
}

// ---------------------------------------------------------------------------
// Legacy API (backward compatible)
// ---------------------------------------------------------------------------

/** Create a minimal ToolContext from an AbortSignal (for backward compat) */
export function signalToToolContext(signal?: AbortSignal): ToolContext {
  const ctrl = signal ? new AbortController() : new AbortController();
  if (signal) {
    signal.addEventListener("abort", () => ctrl.abort(signal.reason), { once: true });
  }
  return {
    sessionId: "",
    runId: "",
    agentId: "",
    agentName: "",
    signal: ctrl.signal,
    env: {},
    ask: async () => "once",
    metadata: () => {},
    setCompensation: () => {},
  };
}

export class ToolSandbox {
  constructor(private readonly config: SandboxConfig = { defaultTimeoutMs: 30_000 }) {}

  async execute(
    tool: ToolDefinition,
    input: unknown,
    ctx: ToolContext,
  ): Promise<unknown> {
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), this.config.defaultTimeoutMs);

    const combinedSignal = combineSignals(ctx.signal, timeout.signal);
    const augmentedCtx: ToolContext = { ...ctx, signal: combinedSignal };

    try {
      const result = await raceAbort(tool.execute(input, augmentedCtx), combinedSignal);
      return result;
    } finally {
      clearTimeout(timer);
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(new DOMException(signal.reason ?? "Aborted", "AbortError"));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(new DOMException(signal.reason ?? "Timed out", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (val) => {
        signal.removeEventListener("abort", onAbort);
        resolve(val);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      },
    );
  });
}

function combineSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const valid = signals.filter((s): s is AbortSignal => s !== undefined);
  if (valid.length === 0) return new AbortController().signal;
  if (valid.length === 1) return valid[0]!;

  const controller = new AbortController();
  for (const s of valid) {
    if (s.aborted) {
      controller.abort(s.reason);
      return controller.signal;
    }
    s.addEventListener("abort", () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}
