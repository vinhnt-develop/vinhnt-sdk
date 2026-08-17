import { VntError } from "./base.js";

/** Generic kernel-level failure. */
export class KernelError extends VntError {
  public readonly code = "KERNEL_ERROR";
  public readonly retryable = false;

  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "KernelError";
  }
}

/** Thrown when a circuit breaker is open (calls rejected until it resets). */
export class CircuitBreakerOpenError extends VntError {
  public readonly code = "KERNEL_CIRCUIT_OPEN";
  public readonly retryable = true;

  constructor(message: string = "Circuit breaker is open") {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}

/** Thrown when a tool receives invalid input. */
export class ToolInputError extends VntError {
  public readonly code = "TOOL_INPUT_ERROR";
  public readonly retryable = false;

  constructor(toolName: string, message: string) {
    super(`Tool ${toolName} input error: ${message}`);
    this.name = "ToolInputError";
  }
}

/** Thrown when a resource access is denied. */
export class PermissionDeniedError extends VntError {
  public readonly code = "PERMISSION_DENIED";
  public readonly retryable = false;

  constructor(resource: string, reason?: string) {
    super(`Permission denied${reason ? `: ${reason}` : ""}`);
    this.name = "PermissionDeniedError";
  }
}

/** Thrown when a value fails validation. */
export class ValidationError extends VntError {
  public readonly code = "VALIDATION_ERROR";
  public readonly retryable = false;

  constructor(message: string, details?: readonly string[]) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Thrown when an operation times out. */
export class TimeoutError extends VntError {
  public readonly code = "TIMEOUT";
  public readonly retryable = true;

  constructor(operation: string, timeoutMs: number) {
    super(`${operation} timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
  }
}

/** Thrown on a network-level failure. */
export class NetworkError extends VntError {
  public readonly code = "NETWORK_ERROR";
  public readonly retryable = true;

  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "NetworkError";
  }
}

/** Thrown when a rate limit is exceeded; may carry a retry-after delay. */
export class RateLimitError extends VntError {
  public readonly code = "RATE_LIMIT";
  public readonly retryable = true;
  public readonly retryAfterMs?: number;

  constructor(message: string = "Rate limit exceeded", retryAfterMs?: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

/** Thrown when authentication fails. */
export class AuthenticationError extends VntError {
  public readonly code = "AUTHENTICATION_ERROR";
  public readonly retryable = false;

  constructor(message: string = "Authentication failed") {
    super(message);
    this.name = "AuthenticationError";
  }
}

/** Thrown on invalid configuration. */
export class ConfigurationError extends VntError {
  public readonly code = "CONFIGURATION_ERROR";
  public readonly retryable = false;

  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

/** Thrown when a plugin operation fails. */
export class PluginError extends VntError {
  public readonly code = "PLUGIN_ERROR";
  public readonly retryable = false;

  constructor(pluginId: string, message: string, cause?: unknown) {
    super(`Plugin ${pluginId}: ${message}`, { cause });
    this.name = "PluginError";
  }
}
