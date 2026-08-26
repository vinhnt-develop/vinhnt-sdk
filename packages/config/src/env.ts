/**
 * Environment variable resolution — multi-layer env access.
 *
 * Provides a structured way to read environment variables with
 * layering (process env > .env file > defaults) and type-safe
 * resolution.
 *
 * @example
 * ```ts
 * import { resolveEnv, type EnvSnapshot } from "@vinhnt-sdk/config";
 *
 * const env = resolveEnv(process.env);
 * const apiKey = env.get("DEEPSEEK_API_KEY");
 * const baseUrl = env.get("DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com/v1";
 * ```
 */

// ── Env Snapshot ──

/** A frozen snapshot of environment variables. */
export interface EnvSnapshot {
  /**
   * Get an environment variable value.
   * @param key - Environment variable name
   * @returns The value, or undefined if not set
   */
  get(key: string): string | undefined;

  /**
   * Check if an environment variable is set (even if empty).
   */
  has(key: string): boolean;

  /**
   * Get all environment variables as a readonly record.
   */
  all(): Readonly<Record<string, string | undefined>>;
}

/**
 * Create an env snapshot from a record of environment variables.
 *
 * @param vars - The environment variables (typically `process.env`)
 * @returns A frozen EnvSnapshot
 */
export function resolveEnv(vars: Record<string, string | undefined>): EnvSnapshot {
  const frozen = Object.freeze({ ...vars });
  return {
    get(key: string): string | undefined {
      return frozen[key];
    },
    has(key: string): boolean {
      return key in frozen;
    },
    all(): Readonly<Record<string, string | undefined>> {
      return frozen;
    },
  };
}

// ── Credential resolution from env ──

import type { CredentialRef, CredentialSource, ResolvedCredential } from "./credentials.js";

/**
 * Resolve a credential from a process environment snapshot.
 * Checks in order: env > undefined (caller handles other layers).
 *
 * @param env - The environment snapshot
 * @param ref - The credential reference
 * @returns The resolved credential, or undefined
 */
export function resolveCredentialFromEnv(
  env: EnvSnapshot,
  ref: CredentialRef,
): ResolvedCredential | undefined {
  const value = env.get(ref);
  if (value !== undefined && value.length > 0) {
    return { value, source: "env" satisfies CredentialSource };
  }
  return undefined;
}

// ── .env file parser ──

/**
 * Parse a .env file content into a record.
 * Supports `KEY=value`, `KEY="value"`, `# comments`, and blank lines.
 *
 * @param content - The .env file content
 * @returns Parsed key-value pairs
 */
export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

// ── Multi-layer env resolution ──

import type { CredentialSource as CS2 } from "./credentials.js";

/** Configuration for multi-layer credential resolution. */
export interface MultiLayerEnvConfig {
  /** Process environment (highest priority, read-only). */
  readonly processEnv: EnvSnapshot;
  /** Managed credential store (writable, second priority). */
  readonly managedStore?: Map<string, string>;
  /** Project .env file content (third priority). */
  readonly projectEnv?: string;
  /** User home .env file content (lowest priority). */
  readonly userEnv?: string;
}

/**
 * Resolve a credential through 4 layers:
 * 1. Process environment (always wins, read-only)
 * 2. Managed store (writable)
 * 3. Project .env (read-only fallback)
 * 4. User home .env (read-only fallback)
 *
 * Empty values are treated as absent.
 */
export function resolveCredentialMultiLayer(
  config: MultiLayerEnvConfig,
  ref: CredentialRef,
): ResolvedCredential | undefined {
  // Layer 1: Process environment
  const envResult = resolveCredentialFromEnv(config.processEnv, ref);
  if (envResult) return envResult;

  // Layer 2: Managed store
  if (config.managedStore) {
    const managedValue = config.managedStore.get(ref);
    if (managedValue !== undefined && managedValue.length > 0) {
      return { value: managedValue, source: "managed" satisfies CS2 };
    }
  }

  // Layer 3: Project .env
  if (config.projectEnv) {
    const parsed = parseEnvFile(config.projectEnv);
    const projectValue = parsed[ref];
    if (projectValue !== undefined && projectValue.length > 0) {
      return { value: projectValue, source: "project-env" satisfies CS2 };
    }
  }

  // Layer 4: User home .env
  if (config.userEnv) {
    const parsed = parseEnvFile(config.userEnv);
    const userValue = parsed[ref];
    if (userValue !== undefined && userValue.length > 0) {
      return { value: userValue, source: "user-env" satisfies CS2 };
    }
  }

  return undefined;
}
