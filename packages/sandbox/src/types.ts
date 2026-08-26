/** Sandbox execution scope — string type, NOT closed union */
export type SandboxScope = string;

/**
 * Default sandbox scopes — exported for convenience.
 * Backends register custom scopes via the `createSandbox` backends map.
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
  readonly metadata?: Record<string, unknown>;
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
  readonly metadata?: Record<string, unknown>;
}

/** Options for a sandboxed command execution */
export interface ProcessSandboxExecuteOptions {
  command: string;
  cwd: string;
  timeoutMs: number;
  env?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Interface for sandbox execution adapters.
 *
 * Implementations can provide different levels of isolation:
 * - `host`: No isolation
 * - `process`: Node.js Permission Model + empty env + command allowlist
 * - `container`: Docker/Firecracker microVM
 */
export interface ProcessSandbox {
  /** The scope this sandbox provides */
  readonly scope: SandboxScope;

  /** Execute a command in the sandbox */
  execute(options: ProcessSandboxExecuteOptions): Promise<SandboxResult<{ stdout: string; stderr: string; exitCode: number }>>;

  /** Clean up resources */
  destroy(): Promise<void>;
}