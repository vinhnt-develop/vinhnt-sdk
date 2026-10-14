import { VntError } from "./base.js";
import type { ErrorDomain, ErrorCategory } from "./base.js";

/** Kernel-level failure codes for {@link KernelError}. */
export type KernelErrorCode =
  | "session_busy"
  | "cancelled"
  | "max_steps_exceeded"
  | "max_tokens_exceeded"
  | "tool_failed"
  | "model_failed"
  | "session_store_failed"
  | "internal_error"
  | "timeout"
  | "model_unavailable"
  | "guardrail_denied"
  | "validation_error"
  | "missed_tool_calls";

/**
 * Kernel-level failure with a typed {@link KernelErrorCode}.
 *
 * Canonical definition (merged from `@vinhnt-sdk/step-executor`, which
 * re-exports this class): `import { KernelError } from "@vinhnt-sdk/schema"`.
 */
export class KernelError extends VntError {
  public override readonly code: string;
  public override readonly retryable = false;
  public override readonly domain: ErrorDomain = "kernel";
  public override readonly category: ErrorCategory = "system";

  constructor(kernelCode: KernelErrorCode, message: string, cause?: unknown) {
    super(message, { cause, domain: "kernel", category: "system" });
    this.code = kernelCode;
    this.name = `KernelError.${kernelCode}`;
  }

  static override isInstance(error: unknown): error is KernelError {
    return error instanceof KernelError;
  }
}

/**
 * Thrown when a call is rejected because the breaker is open.
 *
 * Canonical definition (merged from `@vinhnt-sdk/guard`, which re-exports
 * this class).
 */
export class CircuitBreakerOpenError extends VntError {
  public override readonly code = "CIRCUIT_BREAKER_OPEN";
  public override readonly retryable = true;
  public override readonly domain: ErrorDomain = "kernel";
  public override readonly category: ErrorCategory = "system";
  /** Milliseconds until the breaker transitions to half-open. */
  public readonly remainingMs: number;

  constructor(resetTimeoutMs: number) {
    super(
      `Circuit breaker is open — too many consecutive failures. Will retry in ${resetTimeoutMs}ms`,
      { code: "CIRCUIT_BREAKER_OPEN", domain: "kernel", category: "system", retryable: true },
    );
    this.name = "CircuitBreakerOpenError";
    this.remainingMs = resetTimeoutMs;
  }

  static override isInstance(error: unknown): error is CircuitBreakerOpenError {
    return error instanceof CircuitBreakerOpenError;
  }
}

/** Thrown when a tool receives invalid input. */
export class ToolInputError extends VntError {
  public override readonly code = "TOOL_INPUT_ERROR";
  public override readonly retryable = false;
  public override readonly domain: ErrorDomain = "tool";
  public override readonly category: ErrorCategory = "user";

  constructor(toolName: string, message: string) {
    super(`Tool ${toolName} input error: ${message}`, { domain: "tool", category: "user" });
    this.name = "ToolInputError";
  }

  static override isInstance(error: unknown): error is ToolInputError {
    return error instanceof ToolInputError;
  }
}

/** Thrown when a resource access is denied. */
export class PermissionDeniedError extends VntError {
  public override readonly code = "PERMISSION_DENIED";
  public override readonly retryable = false;
  public override readonly domain: ErrorDomain = "permission";
  public override readonly category: ErrorCategory = "user";

  constructor(resource: string, reason?: string) {
    super(`Permission denied${reason ? `: ${reason}` : ""}`, { domain: "permission", category: "user" });
    this.name = "PermissionDeniedError";
  }

  static override isInstance(error: unknown): error is PermissionDeniedError {
    return error instanceof PermissionDeniedError;
  }
}

/** Thrown when a value fails validation. */
export class ValidationError extends VntError {
  public override readonly code = "VALIDATION_ERROR";
  public override readonly retryable = false;
  public override readonly domain: ErrorDomain = "config";
  public override readonly category: ErrorCategory = "user";
  public readonly details?: readonly string[];

  constructor(message: string, details?: readonly string[]) {
    super(message, { domain: "config", category: "user" });
    this.name = "ValidationError";
    if (details !== undefined) {
      this.details = details;
    }
  }

  static override isInstance(error: unknown): error is ValidationError {
    return error instanceof ValidationError;
  }
}

/** Thrown when an operation times out. */
export class TimeoutError extends VntError {
  public override readonly code = "TIMEOUT";
  public override readonly retryable = true;
  public override readonly domain: ErrorDomain = "kernel";
  public override readonly category: ErrorCategory = "dependency";

  constructor(operation: string, timeoutMs: number) {
    super(`${operation} timed out after ${timeoutMs}ms`, { domain: "kernel", category: "dependency", retryable: true });
    this.name = "TimeoutError";
  }

  static override isInstance(error: unknown): error is TimeoutError {
    return error instanceof TimeoutError;
  }
}

/** Thrown on a network-level failure. */
export class NetworkError extends VntError {
  public override readonly code = "NETWORK_ERROR";
  public override readonly retryable = true;
  public override readonly domain: ErrorDomain = "llm";
  public override readonly category: ErrorCategory = "dependency";

  constructor(message: string, cause?: unknown) {
    super(message, { cause, domain: "llm", category: "dependency", retryable: true });
    this.name = "NetworkError";
  }

  static override isInstance(error: unknown): error is NetworkError {
    return error instanceof NetworkError;
  }
}

/** Thrown when a rate limit is exceeded; may carry a retry-after delay. */
export class RateLimitError extends VntError {
  public override readonly code = "RATE_LIMIT";
  public override readonly retryable = true;
  public override readonly domain: ErrorDomain = "llm";
  public override readonly category: ErrorCategory = "dependency";
  public readonly retryAfterMs?: number;

  constructor(message: string = "Rate limit exceeded", retryAfterMs?: number) {
    super(message, { domain: "llm", category: "dependency", retryable: true });
    this.name = "RateLimitError";
    if (retryAfterMs !== undefined) {
      this.retryAfterMs = retryAfterMs;
    }
  }

  static override isInstance(error: unknown): error is RateLimitError {
    return error instanceof RateLimitError;
  }
}

/** Thrown when authentication fails. */
export class AuthenticationError extends VntError {
  public override readonly code = "AUTHENTICATION_ERROR";
  public override readonly retryable = false;
  public override readonly domain: ErrorDomain = "llm";
  public override readonly category: ErrorCategory = "dependency";

  constructor(message: string = "Authentication failed") {
    super(message, { domain: "llm", category: "dependency" });
    this.name = "AuthenticationError";
  }

  static override isInstance(error: unknown): error is AuthenticationError {
    return error instanceof AuthenticationError;
  }
}

/** Thrown on invalid configuration. */
export class ConfigurationError extends VntError {
  public override readonly code = "CONFIGURATION_ERROR";
  public override readonly retryable = false;
  public override readonly domain: ErrorDomain = "config";
  public override readonly category: ErrorCategory = "config";

  constructor(message: string) {
    super(message, { domain: "config", category: "config" });
    this.name = "ConfigurationError";
  }

  static override isInstance(error: unknown): error is ConfigurationError {
    return error instanceof ConfigurationError;
  }
}

/** Thrown when a plugin operation fails. */
export class PluginError extends VntError {
  public override readonly code = "PLUGIN_ERROR";
  public override readonly retryable = false;
  public override readonly domain: ErrorDomain = "plugin";
  public override readonly category: ErrorCategory = "system";

  constructor(pluginId: string, message: string, cause?: unknown) {
    super(`Plugin ${pluginId}: ${message}`, { cause, domain: "plugin", category: "system" });
    this.name = "PluginError";
  }

  static override isInstance(error: unknown): error is PluginError {
    return error instanceof PluginError;
  }
}
