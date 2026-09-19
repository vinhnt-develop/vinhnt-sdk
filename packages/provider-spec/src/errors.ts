/**
 * Error types for vinhnt-sdk.
 *
 * Follows Mastra's error taxonomy pattern: Domain + Category + machine-readable ID.
 * All errors have `isInstance()` static method for cross-module type checking.
 */

/**
 * Error domain — which subsystem caused the error.
 */
export type ErrorDomain =
  | "llm"
  | "tool"
  | "kernel"
  | "config"
  | "permission"
  | "sandbox"
  | "mcp"
  | "lsp"
  | "session"
  | "plugin";

/**
 * Error category — who is responsible.
 */
export type ErrorCategory =
  | "user"       // bad input from developer/user
  | "system"     // internal SDK error
  | "dependency" // external service failure
  | "config";    // misconfiguration

/**
 * Base error class for all vinhnt-sdk errors.
 *
 * @example
 * ```typescript
 * try {
 *   await kernel.run({ prompt: "Hello" });
 * } catch (e) {
 *   if (LlmError.isInstance(e)) {
 *     console.error("LLM error:", e.code, e.message);
 *   }
 * }
 * ```
 */
export class SdkError extends Error {
  /** Machine-readable error code. */
  readonly code: string;
  /** Error domain. */
  readonly domain: ErrorDomain;
  /** Error category. */
  readonly category: ErrorCategory;
  /** Whether this error is retryable. */
  readonly isRetryable: boolean;
  /** Additional error details. */
  readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    options: {
      domain: ErrorDomain;
      category: ErrorCategory;
      isRetryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "SdkError";
    this.code = code;
    this.domain = options.domain;
    this.category = options.category;
    this.isRetryable = options.isRetryable ?? false;
    if (options.details !== undefined) this.details = options.details;
  }

  /**
   * Type-safe error checking (works across module boundaries).
   */
  static isInstance(error: unknown): error is SdkError {
    return error instanceof SdkError;
  }
}

/**
 * LLM-related errors (API failures, rate limits, timeouts).
 */
export class LlmError extends SdkError {
  constructor(
    code: string,
    message: string,
    options?: {
      isRetryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(code, message, {
      domain: "llm",
      category: "dependency",
      ...options,
    });
    this.name = "LlmError";
  }

  static override isInstance(error: unknown): error is LlmError {
    return error instanceof LlmError;
  }

  /** Create a rate limit error. */
  static rateLimit(message: string, details?: Record<string, unknown>): LlmError {
    const opts: { isRetryable: boolean; details?: Record<string, unknown> } = { isRetryable: true };
    if (details !== undefined) opts.details = details;
    return new LlmError("llm.rate_limit", message, opts);
  }

  /** Create a timeout error. */
  static timeout(message: string, details?: Record<string, unknown>): LlmError {
    const opts: { isRetryable: boolean; details?: Record<string, unknown> } = { isRetryable: true };
    if (details !== undefined) opts.details = details;
    return new LlmError("llm.timeout", message, opts);
  }

  /** Create a network error. */
  static network(message: string, details?: Record<string, unknown>): LlmError {
    const opts: { isRetryable: boolean; details?: Record<string, unknown> } = { isRetryable: true };
    if (details !== undefined) opts.details = details;
    return new LlmError("llm.network", message, opts);
  }

  /** Create a model not found error. */
  static notFound(model: string): LlmError {
    return new LlmError("llm.not_found", `Model "${model}" not found`, {
      isRetryable: false,
      details: { model },
    });
  }

  /** Create an invalid response error. */
  static invalidResponse(message: string, details?: Record<string, unknown>): LlmError {
    const opts: { isRetryable: boolean; details?: Record<string, unknown> } = { isRetryable: false };
    if (details !== undefined) opts.details = details;
    return new LlmError("llm.invalid_response", message, opts);
  }
}

/**
 * Tool-related errors (execution failures, timeouts, not found).
 */
export class ToolError extends SdkError {
  constructor(
    code: string,
    message: string,
    options?: {
      isRetryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(code, message, {
      domain: "tool",
      category: "system",
      ...options,
    });
    this.name = "ToolError";
  }

  static override isInstance(error: unknown): error is ToolError {
    return error instanceof ToolError;
  }

  /** Create a tool not found error. */
  static notFound(toolName: string): ToolError {
    return new ToolError("tool.not_found", `Tool "${toolName}" not found`, {
      details: { toolName },
    });
  }

  /** Create a tool timeout error. */
  static timeout(toolName: string, timeoutMs: number): ToolError {
    return new ToolError("tool.timeout", `Tool "${toolName}" timed out after ${timeoutMs}ms`, {
      isRetryable: false,
      details: { toolName, timeoutMs },
    });
  }

  /** Create a tool execution error. */
  static execution(toolName: string, message: string, cause?: Error): ToolError {
    return new ToolError("tool.execution", message, cause ? { details: { toolName }, cause } : { details: { toolName } });
  }
}

/**
 * Validation errors (schema validation, input validation).
 */
export class ValidationError extends SdkError {
  constructor(
    code: string,
    message: string,
    options?: {
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(code, message, {
      domain: "config",
      category: "user",
      ...options,
    });
    this.name = "ValidationError";
  }

  static override isInstance(error: unknown): error is ValidationError {
    return error instanceof ValidationError;
  }

  /** Create a schema validation error. */
  static schema(message: string, details?: Record<string, unknown>): ValidationError {
    return details !== undefined
      ? new ValidationError("validation.schema", message, { details })
      : new ValidationError("validation.schema", message);
  }
}

/**
 * Configuration errors (missing config, invalid config).
 */
export class ConfigError extends SdkError {
  constructor(
    code: string,
    message: string,
    options?: {
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(code, message, {
      domain: "config",
      category: "config",
      ...options,
    });
    this.name = "ConfigError";
  }

  static override isInstance(error: unknown): error is ConfigError {
    return error instanceof ConfigError;
  }

  /** Create a missing config error. */
  static missing(key: string): ConfigError {
    return new ConfigError("config.missing", `Missing required config: ${key}`, {
      details: { key },
    });
  }

  /** Create an invalid config error. */
  static invalid(key: string, reason: string): ConfigError {
    return new ConfigError("config.invalid", `Invalid config for "${key}": ${reason}`, {
      details: { key, reason },
    });
  }
}
