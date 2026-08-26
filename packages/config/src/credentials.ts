/**
 * Credential references — configuration carries references to secrets,
 * never the secrets themselves.
 *
 * A `CredentialRef` is a branded POSIX-style environment variable name
 * (e.g., `DEEPSEEK_API_KEY`), NOT the actual key value. Resolution happens
 * at operation time through the credential seam.
 *
 * @example
 * ```ts
 * import { credentialRef } from "@vinhnt-sdk/config";
 *
 * const ref = credentialRef("DEEPSEEK_API_KEY");
 * // ref is a branded string, not the key value
 * ```
 */

// ── Branded CredentialRef ──

declare const __credentialRefBrand: unique symbol;

/**
 * Branded credential reference — a POSIX-style environment variable name.
 * Use this instead of plain `string` to prevent passing literal secrets.
 */
export type CredentialRef = string & { readonly [__credentialRefBrand]: true };

/**
 * Create a credential reference from an environment variable name.
 * This is a type-level marker — no runtime validation.
 *
 * @param envName - Environment variable name (e.g., `"DEEPSEEK_API_KEY"`)
 * @returns Branded CredentialRef
 */
export function credentialRef(envName: string): CredentialRef {
  return envName as CredentialRef;
}

// ── Resolved credential ──

/** A resolved credential with its value and source. */
export interface ResolvedCredential {
  /** The secret value. */
  readonly value: string;
  /** Where the credential was resolved from. */
  readonly source: CredentialSource;
}

/** Source of a resolved credential. */
export type CredentialSource =
  | "env"          // Inherited process environment (read-only)
  | "managed"      // Managed credential store (writable)
  | "project-env"  // Project .env file (read-only)
  | "user-env"     // User home .env file (read-only)
  | (string & {}); // Extensible — custom sources via CredentialProvider

/** Known credential source constants for runtime checks. */
export const KNOWN_CREDENTIAL_SOURCES = ["env", "managed", "project-env", "user-env"] as const;

/** Metadata about a credential without exposing its value. */
export interface CredentialInfo {
  /** Whether the credential is configured (has a non-empty value). */
  readonly configured: boolean;
  /** Where the credential would be resolved from. */
  readonly source: CredentialSource | undefined;
  /** Whether the credential can be written to (false for env-shadowed). */
  readonly writable: boolean;
}

// ── Credential Provider interface ──

/**
 * Abstract credential provider — resolves credential references to values.
 *
 * Implementations layer multiple sources (env, managed store, .env files)
 * with the following precedence:
 * 1. Process environment (read-only, always wins)
 * 2. Managed store (writable)
 * 3. Project .env (read-only fallback)
 * 4. User home .env (read-only fallback)
 *
 * @example
 * ```ts
 * const provider: CredentialProvider = createLocalCredentialProvider({
 *   homeDir: process.env.HOME ?? process.env.USERPROFILE ?? "",
 * });
 *
 * const resolved = await provider.resolve(credentialRef("DEEPSEEK_API_KEY"));
 * if (resolved) {
 *   console.log(resolved.source); // "env"
 *   // use resolved.value
 * }
 * ```
 */
export interface CredentialProvider {
  /**
   * Resolve a credential reference to its value.
   * Returns undefined if the credential is not configured.
   * Resolution is per-request — rotated credentials reach the next request.
   */
  resolve(ref: CredentialRef): Promise<ResolvedCredential | undefined>;

  /**
   * Describe a credential without exposing its value.
   * Used by configuration UIs to show which credentials are configured.
   */
  describe(ref: CredentialRef): Promise<CredentialInfo>;

  /**
   * Set a credential value in the managed store.
   * Rejects if the credential is shadowed by the process environment.
   */
  set(ref: CredentialRef, value: string): Promise<void>;

  /**
   * Remove a credential from the managed store.
   * Rejects if the credential is shadowed by the process environment.
   */
  unset(ref: CredentialRef): Promise<void>;
}
