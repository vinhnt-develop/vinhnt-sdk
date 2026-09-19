/**
 * @vinhnt-sdk/security — DEPRECATED
 *
 * This package is deprecated. Use @vinhnt-sdk/guard instead.
 * All exports are re-exported from @vinhnt-sdk/guard for backward compatibility.
 */
export { redactSecrets, detectSecrets, createRedactingLogger, redactObjectSecrets } from "@vinhnt-sdk/guard";
export { sanitizeForLLM, validateToolOutput, detectInjectionPatterns } from "@vinhnt-sdk/guard";
export { sanitizeEnv } from "@vinhnt-sdk/guard";
