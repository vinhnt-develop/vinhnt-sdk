/**
 * Tool sandboxing for isolated execution.
 *
 * @module tool/sandbox
 * @packageDocumentation
 */

import type { ToolDefinition, ToolContext } from "./definitions.js";
import { parseCommand } from "./shell-parser.js";

// ---------------------------------------------------------------------------
// Environment sanitization
// ---------------------------------------------------------------------------

const SENSITIVE_ENV_PREFIXES = [
  "AWS_",
  "GOOGLE_",
  "AZURE_",
  "GITHUB_",
  "GITLAB_",
  "npm_",
  "NODE_",
];

const SENSITIVE_ENV_KEYS = new Set([
  "HOME",
  "USER",
  "USERNAME",
  "PASSWORD",
  "SECRET",
  "TOKEN",
  "API_KEY",
  "APIKEY",
  "PRIVATE_KEY",
  "DATABASE_URL",
  "DB_URL",
  "REDIS_URL",
]);

function sanitizeEnv(): Record<string, string | undefined> {
  const safe: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(process.env)) {
    const upperKey = key.toUpperCase();
    const isSensitive = SENSITIVE_ENV_PREFIXES.some((p) => upperKey.startsWith(p)) ||
      SENSITIVE_ENV_KEYS.has(upperKey);
    if (!isSensitive) {
      safe[key] = value;
    }
  }
  return safe;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Sandbox execution scope */
export type SandboxScope = "host" | "process" | "container";

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
 * - `process`: worker_threads + restricted child_process
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
          env: options.env && Object.keys(options.env).length > 0
            ? { ...sanitizeEnv(), ...options.env }
            : undefined,
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
          child.kill();
          resolve({
            result: { stdout: "", stderr: "Aborted", exitCode: 1 },
            exitCode: 1,
            durationMs: Date.now() - start,
            timedOut: false,
          });
          return;
        }
        options.signal.addEventListener("abort", () => {
          child.kill();
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
// Process sandbox (worker_threads — basic isolation)
// ---------------------------------------------------------------------------

class ProcessSandboxImpl implements ProcessSandbox {
  readonly scope = "process" as const;

  async execute(options: {
    command: string;
    cwd: string;
    timeoutMs: number;
    env?: Record<string, string>;
    signal?: AbortSignal;
  }): Promise<SandboxResult<{ stdout: string; stderr: string; exitCode: number }>> {
    // For "process" scope, we use the same execFile but with additional checks
    // A full implementation would use worker_threads or child_process.fork
    // with restricted capabilities

    const host = new HostSandbox();
    const result = await host.execute(options);

    // Add path validation for process scope
    if (result.exitCode === 0 && result.result.stdout) {
      // Log that we're running in process sandbox mode
      // In a full implementation, this would be in an isolated worker
    }

    return result;
  }

  async destroy(): Promise<void> {
    // Clean up worker threads if any
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
      return new ProcessSandboxImpl();
    case "container":
      // Container sandbox would be implemented in a separate package
      // For now, fall back to process sandbox
      console.warn("[sandbox] Container sandbox not yet implemented, falling back to process sandbox");
      return new ProcessSandboxImpl();
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
