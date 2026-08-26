/**
 * @module guard
 * Guard plugins — circuit breaker, loop detection, tool timeout.
 *
 * Capability Seam:
 *   Service Definition (this module) → Consumer (step-executor, core kernel)
 */

export { CircuitBreaker, CircuitBreakerOpenError } from "./circuit-breaker.js";
export type { CircuitState, CircuitBreakerOptions } from "./circuit-breaker.js";

export { LoopDetector, detectDoomLoop, hashArgs, DEFAULT_DOOM_LOOP_THRESHOLD } from "./loop-detection.js";
export type { RecentCall } from "./loop-detection.js";

export { ToolTimeoutError, withToolTimeout } from "./tool-timeout.js";
