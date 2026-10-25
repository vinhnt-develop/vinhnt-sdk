import { SdkError } from "@vinhnt-sdk/schema";

/**
 * Error domain for durable-state package.
 * Local definition to avoid coupling to schema's closed ErrorDomain union.
 */
export type DurableStateDomain = string;

/**
 * Error category for durable-state package.
 */
export type DurableStateCategory = "user" | "system" | "dependency" | "config";

/**
 * Base error for all @vinhnt-sdk/durable-state errors.
 *
 * Extends {@link SdkError} with machine-readable code, retryable flag,
 * correlation IDs (requestId, traceId), and structured context.
 *
 * @example
 * ```typescript
 * throw new DurableStateError(
 *   "CHANNEL_NOT_FOUND",
 *   `Channel "messages" not declared in graph "my-graph"`,
 *   { channel: "messages", graphId: "my-graph" }
 * );
 * if (error.code === "CHANNEL_NOT_FOUND") { ... }
 * ```
 */
export class DurableStateError extends SdkError {
  /** Additional structured context attached to the error. */
  readonly context?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    options?: {
      retryable?: boolean;
      cause?: unknown;
      requestId?: string;
      traceId?: string;
      category?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(code, message, {
      retryable: options?.retryable ?? false,
      cause: options?.cause,
      requestId: options?.requestId as import("@vinhnt-sdk/schema").RequestId | undefined,
      traceId: options?.traceId as import("@vinhnt-sdk/schema").TraceId | undefined,
    });
    this.name = "DurableStateError";
    this.context = options?.context;
  }

  static override isInstance(error: unknown): error is DurableStateError {
    return error instanceof DurableStateError;
  }
}

/**
 * Thrown when a state channel is referenced but not declared in the graph.
 */
export class ChannelNotFoundError extends DurableStateError {
  readonly channel: string;
  readonly graphId: string;

  constructor(channel: string, graphId: string, ctx?: { requestId?: string; traceId?: string }) {
    super(
      "CHANNEL_NOT_FOUND",
      `Channel "${channel}" not declared in state graph "${graphId}"`,
      {
        requestId: ctx?.requestId,
        traceId: ctx?.traceId,
        context: { channel, graphId },
      },
    );
    this.name = "ChannelNotFoundError";
    this.channel = channel;
    this.graphId = graphId;
  }

  static override isInstance(error: unknown): error is ChannelNotFoundError {
    return error instanceof ChannelNotFoundError;
  }
}

/**
 * Thrown when a checkpoint operation fails (storage unavailable, corrupt data).
 */
export class CheckpointError extends DurableStateError {
  readonly checkpointId?: string;
  readonly threadId?: string;

  constructor(
    message: string,
    options?: {
      checkpointId?: string;
      threadId?: string;
      cause?: unknown;
      retryable?: boolean;
      requestId?: string;
      traceId?: string;
    },
  ) {
    super(
      "CHECKPOINT_ERROR",
      message,
      {
        retryable: options?.retryable ?? true,
        cause: options?.cause,
        requestId: options?.requestId,
        traceId: options?.traceId,
        context: {
          ...(options?.checkpointId !== undefined ? { checkpointId: options.checkpointId } : {}),
          ...(options?.threadId !== undefined ? { threadId: options.threadId } : {}),
        },
      },
    );
    this.name = "CheckpointError";
    this.checkpointId = options?.checkpointId;
    this.threadId = options?.threadId;
  }

  static override isInstance(error: unknown): error is CheckpointError {
    return error instanceof CheckpointError;
  }
}

/**
 * Thrown when an interrupt is triggered during graph execution.
 *
 * This is a control-flow exception, not a failure. The graph pauses at the
 * interrupt point and can be resumed with `Command({ resume: value })`.
 */
export class GraphInterrupt extends DurableStateError {
  /** The value passed to interrupt(), available on resume. */
  readonly interruptValue: unknown;
  /** Stable interrupt id for multi-interrupt resume mapping. */
  readonly interruptId: string;
  /** Node that raised the interrupt. */
  readonly nodeId: string;

  constructor(
    interruptValue: unknown,
    options?: {
      interruptId?: string;
      nodeId?: string;
      requestId?: string;
      traceId?: string;
    },
  ) {
    super(
      "GRAPH_INTERRUPT",
      `Graph interrupted at node "${options?.nodeId ?? "unknown"}"`,
      {
        retryable: false,
        requestId: options?.requestId,
        traceId: options?.traceId,
        context: {
          interruptId: options?.interruptId,
          nodeId: options?.nodeId,
          interruptValue,
        },
      },
    );
    this.name = "GraphInterrupt";
    this.interruptValue = interruptValue;
    this.interruptId = options?.interruptId ?? crypto.randomUUID();
    this.nodeId = options?.nodeId ?? "unknown";
  }

  static override isInstance(error: unknown): error is GraphInterrupt {
    return error instanceof GraphInterrupt;
  }
}

/**
 * Thrown when a Command is issued but the graph is not in a resumable state.
 */
export class CommandError extends DurableStateError {
  readonly commandType: string;

  constructor(
    message: string,
    commandType: string,
    options?: {
      requestId?: string;
      traceId?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(
      "COMMAND_ERROR",
      message,
      {
        retryable: false,
        requestId: options?.requestId,
        traceId: options?.traceId,
        context: { ...options?.context, commandType },
      },
    );
    this.name = "CommandError";
    this.commandType = commandType;
  }

  static override isInstance(error: unknown): error is CommandError {
    return error instanceof CommandError;
  }
}

/**
 * Thrown when an attachment reference cannot be resolved (missing file, corrupt ref).
 */
export class AttachmentRefError extends DurableStateError {
  readonly attachmentId: string;

  constructor(
    attachmentId: string,
    message: string,
    options?: {
      cause?: unknown;
      requestId?: string;
      traceId?: string;
    },
  ) {
    super(
      "ATTACHMENT_REF_ERROR",
      message,
      {
        retryable: false,
        cause: options?.cause,
        requestId: options?.requestId,
        traceId: options?.traceId,
        context: { attachmentId },
      },
    );
    this.name = "AttachmentRefError";
    this.attachmentId = attachmentId;
  }

  static override isInstance(error: unknown): error is AttachmentRefError {
    return error instanceof AttachmentRefError;
  }
}

/**
 * Type-safe guard for DurableStateError across module boundaries.
 */
export function isDurableStateError(value: unknown): value is DurableStateError {
  return value instanceof DurableStateError;
}

/**
 * Structural error-code check — safe across duplicated package installs.
 */
export function hasDurableStateErrorCode(value: unknown, code: string): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { code?: unknown }).code === code
  );
}
