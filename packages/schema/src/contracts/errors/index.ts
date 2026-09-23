export { VntError } from "./base.js";
export type { VntErrorCtx, ErrorDomain, ErrorCategory } from "./base.js";
export { AgentNotFoundError, AgentValidationError, AgentPermissionDenied } from "./agent-error.js";
export { ToolNotFoundError, ToolExecutionError, ToolPermissionDenied } from "./tool-error.js";
export { RunNotFoundError, RunAbortedError, RunTimeoutError } from "./run-error.js";
export {
  KernelError, CircuitBreakerOpenError, ToolInputError,
  PermissionDeniedError, ValidationError, TimeoutError,
  NetworkError, RateLimitError, AuthenticationError,
  ConfigurationError, PluginError,
} from "./common-errors.js";
export { formatToolFailure, isToolFailureEnvelope, TOOL_FAILURE_HINTS } from "./respond-to-model.js";
export type { ToolFailureResult, ToolSuccessResult, ToolResultEnvelope } from "./respond-to-model.js";
