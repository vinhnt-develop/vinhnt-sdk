/**
 * @module guard
 * Guard plugins — circuit breaker, loop detection, tool timeout, monotonic tool guards.
 *
 * Capability Seam:
 *   Service Definition (this module) → Consumer (step-executor, core kernel)
 */

export { CircuitBreaker, CircuitBreakerOpenError } from "./circuit-breaker.js";
export { KNOWN_CIRCUIT_STATES } from "./circuit-breaker.js";
export type { CircuitState, CircuitBreakerOptions } from "./circuit-breaker.js";

// Monotonic guard pattern (from DeepSeek Harness)
export type { GuardDecision, ToolGuard, ToolGuardContext, ToolGuardInput, ToolGuardDecision } from "./circuit-breaker.js";
export { evaluateGuards } from "./circuit-breaker.js";

export { LoopDetector, detectDoomLoop, hashArgs, DEFAULT_DOOM_LOOP_THRESHOLD } from "./loop-detection.js";
export type { RecentCall } from "./loop-detection.js";

export { ToolTimeoutError, withToolTimeout } from "./tool-timeout.js";

// Re-export security utilities (merged from @vinhnt-sdk/security)
export {
  redactSecrets, detectSecrets, createRedactingLogger, redactObjectSecrets,
  SecretRedactor, defaultSecretRedactor, DEFAULT_SECRET_PATTERNS,
} from "./secret-redactor.js";
export type { SecretRedactorConfig, SecretPattern } from "./secret-redactor.js";
export { sanitizeForLLM, validateToolOutput, detectInjectionPatterns } from "./input-sanitizer.js";
export { sanitizeEnv } from "./env-sanitizer.js";
