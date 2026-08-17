import type { SandboxConfig, ProcessSandbox, SandboxScope } from "./types.js";
import { SandboxUnavailableError } from "./error.js";

/** Factory that builds a `ProcessSandbox` for a scope from a config. */
export type SandboxBackendFactory = (config: SandboxConfig) => ProcessSandbox;

/**
 * Backend registry passed to `createSandbox`. Keys are sandbox scopes; values
 * are factories (or undefined if the scope is not wired).
 */
export type SandboxBackends = Record<SandboxScope, SandboxBackendFactory | undefined>;

/**
 * Build a sandbox for the configured scope.
 *
 * **Fail-closed**: if the requested scope has no registered backend this throws
 * `SandboxUnavailableError` — it never silently downgrades to a weaker sandbox.
 *
 * @param config - Sandbox configuration.
 * @param backends - Map of scope → backend factory. Wire only what you support.
 * @returns ProcessSandbox instance for the requested scope.
 */
export function createSandbox(config: SandboxConfig, backends: SandboxBackends = {}): ProcessSandbox {
  const scope: SandboxScope = config.scope ?? "host";
  const factory = backends[scope];
  if (!factory) {
    const availableScopes = Object.keys(backends).filter((s) => backends[s] !== undefined);
    throw new SandboxUnavailableError(scope, availableScopes);
  }
  return factory(config);
}