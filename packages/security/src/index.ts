/**
 * Security utilities for vinhnt-sdk.
 *
 * @module security
 * @packageDocumentation
 */

export { sanitizeForLLM, validateToolOutput, detectInjectionPatterns } from "./input-sanitizer.js";
export {
  redactSecrets,
  detectSecrets,
  createRedactingLogger,
  redactObjectSecrets,
  SecretRedactor,
  defaultSecretRedactor,
  DEFAULT_SECRET_PATTERNS,
} from "./secret-redactor.js";
export type { SecretRedactorConfig } from "./secret-redactor.js";
export { sanitizeEnv } from "./env-sanitizer.js";
