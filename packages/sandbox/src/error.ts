import { VntError } from "@vinhnt-sdk/schema";

/**
 * Thrown when a sandbox scope is requested but no backend is available for it.
 *
 * Sandboxes are **fail-closed**: requesting an unsupported/unavailable scope
 * never silently downgrades to a weaker sandbox. Instead this error makes the
 * gap explicit, listing the scopes that ARE wired.
 */
export class SandboxUnavailableError extends VntError {
  public readonly code = "ERR_SANDBOX_UNAVAILABLE" as const;
  public readonly retryable = false;

  constructor(
    public readonly scope: string,
    public readonly availableScopes: readonly string[] = [],
  ) {
    super(
      `Sandbox scope "${scope}" is not available` +
      (availableScopes.length > 0
        ? ` (available: ${availableScopes.join(", ")})`
        : " — no sandbox backends registered; wire a backend package like @vinhnt-sdk/sandbox-host or @vinhnt-sdk/sandbox-process"),
    );
    this.name = "SandboxUnavailableError";
  }
}