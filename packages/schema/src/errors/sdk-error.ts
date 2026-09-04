/**
 * Base error class for all vinhnt-sdk errors.
 * Provides a stable machine-routable `code` field for programmatic error handling.
 *
 * @example
 * ```typescript
 * throw new SdkError('TOOL_NOT_FOUND', 'Tool "foo" not found');
 * if (error.code === 'TOOL_NOT_FOUND') { ... }
 * ```
 */
export class SdkError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(
    code: string,
    message: string,
    options?: { retryable?: boolean; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'SdkError';
    this.code = code;
    this.retryable = options?.retryable ?? false;
  }
}

/**
 * Type guard for SdkError.
 */
export function isSdkError(value: unknown): value is SdkError {
  return value instanceof SdkError;
}

/**
 * Render the full error cause chain, including AggregateError members.
 * Handles circular references and hostile values safely.
 *
 * @example
 * ```typescript
 * try { ... } catch (err) {
 *   console.error(errorChain(err));
 * }
 * ```
 */
export function errorChain(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Error) {
    const parts: string[] = [];
    const seen = new Set<object>();

    function walk(err: Error, depth: number): void {
      if (depth > 10) return;
      if (seen.has(err)) {
        parts.push(`[circular: ${err.name}]`);
        return;
      }
      seen.add(err);

      const msg = err.message || String(err);
      const prefix = depth > 0 ? ' → ' : '';
      parts.push(`${prefix}${err.name}: ${msg}`);

      if (err instanceof AggregateError) {
        for (const e of err.errors) {
          if (e instanceof Error) {
            walk(e, depth + 1);
          } else {
            parts.push(`  - ${safeString(e)}`);
          }
        }
      }

      if (err.cause instanceof Error) {
        walk(err.cause, depth + 1);
      } else if (err.cause !== undefined) {
        parts.push(`  caused by: ${safeString(err.cause)}`);
      }
    }

    walk(value, 0);
    return parts.join('\n');
  }

  if (typeof value === 'object' && value !== null && 'message' in value) {
    return errorChain((value as { message: unknown }).message);
  }

  return safeString(value);
}

function safeString(value: unknown): string {
  try {
    if (typeof value === 'function') return '[function]';
    if (typeof value === 'symbol') return '[symbol]';
    if (typeof value === 'bigint') return String(value);
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}
