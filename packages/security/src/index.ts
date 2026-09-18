/**
 * Security utilities for vinhnt-sdk.
 *
 * @deprecated Use @vinhnt-sdk/guard instead. This package re-exports from guard.
 *
 * @module security
 * @packageDocumentation
 */

export { sanitizeForLLM, validateToolOutput, detectInjectionPatterns } from "@vinhnt-sdk/guard";
export {
  redactSecrets,
  detectSecrets,
  createRedactingLogger,
  redactObjectSecrets,
  SecretRedactor,
  defaultSecretRedactor,
  DEFAULT_SECRET_PATTERNS,
} from "@vinhnt-sdk/guard";
export type { SecretRedactorConfig, SecretPattern } from "@vinhnt-sdk/guard";
export { sanitizeEnv } from "@vinhnt-sdk/guard";
