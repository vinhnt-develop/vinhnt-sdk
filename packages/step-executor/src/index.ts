/**
 * @module @vinhnt-sdk/step-executor
 * Step execution kernel: tool lifecycle, per-tool timeouts, permission gating,
 * doom-loop detection, self-correction and run state machine.
 */

// === Hooks ===

export type { StepExecutorPluginHooks } from "./hooks.js";

// === Step Executor ===

export { StepExecutor } from "./step-executor.js";
export type { StepExecutorDeps, ToolExecutionPlan } from "./step-executor.js";

// === Kernel Utils (public subset) ===

export {
  DEFAULT_MAX_STEPS,
  DEFAULT_MAX_TOOL_CALLS_PER_STEP,
  DOOM_LOOP_THRESHOLD,
  toolDomain,
} from "./kernel-utils.js";

// === Termination ===

export { evaluateStopConditions, buildJudgeMessages, parseJudgeVerdict, toToolCallOutcome } from "./termination.js";
export type { ToolCallOutcome, StepVerificationContext, StopCondition, TerminationPolicy } from "./termination.js";

// === Permission Gate ===

export { PermissionGate } from "./permission-gate.js";
export type { ApprovalDecision, DynamicRule, PermissionCheckResult } from "./permission-gate.js";

// === Run Context ===

export { createRunContext } from "./run-context.js";
export type { RunContext } from "./run-context.js";

// === Kernel Error ===

export { KernelError } from "./kernel-error.js";
export type { KernelErrorCode } from "./kernel-error.js";

// === Circuit Breaker ===

export { CircuitBreaker, CircuitBreakerOpenError } from "./circuit-breaker.js";
export type { CircuitState, CircuitBreakerOptions } from "./circuit-breaker.js";

// === Run State ===

export { RunStateMachine } from "./run-state.js";
export type { RunState } from "./run-state.js";
