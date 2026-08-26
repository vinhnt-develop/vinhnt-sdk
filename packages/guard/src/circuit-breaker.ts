import { VntError } from "@vinhnt-sdk/schema";

/** Current circuit breaker state — strict union, state machine core. */
export type CircuitState = "closed" | "open" | "half_open";

/** Tuning for {@link CircuitBreaker}: failure/success thresholds and retry policy. */
export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  resetTimeoutMs?: number;
  isFailure?: (err: unknown) => boolean;
  /** Maximum number of retries for transient failures. Default: 3 */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms. Default: 1000 */
  backoffMs?: number;
  /** Maximum delay for backoff in ms. Default: 30000 */
  maxBackoffMs?: number;
}

const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeoutMs: 30_000,
  maxRetries: 3,
  backoffMs: 1000,
  maxBackoffMs: 30_000,
  isFailure: (err: unknown) => {
    if (err instanceof DOMException && err.name === "AbortError") return false;
    if (err instanceof Error && err.name === "AbortError") return false;
    if (err instanceof VntError && err.retryable === false) return false;
    const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (msg.includes("auth") || msg.includes("unauthorized") || msg.includes("invalid api key")) return false;
    if (msg.includes("context") && msg.includes("token")) return false;
    if (msg.includes("not found") || msg.includes("not_found")) return false;
    return true;
  },
};

/** Circuit breaker with failure thresholds, retry/backoff and half-open probing. */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenSuccesses = 0;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options?: CircuitBreakerOptions) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...Object.fromEntries(Object.entries(options ?? {}).filter(([, v]) => v !== undefined)),
    };
  }

  getState(): CircuitState {
    if (this.state === "open" && Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs) {
      this.state = "half_open";
      this.halfOpenSuccesses = 0;
    }
    return this.state;
  }

  /**
   * Execute a function with circuit breaker and retry logic.
   * Retries on transient failures with exponential backoff.
   */
  async call<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const state = this.getState();
    if (state === "open") {
      throw new CircuitBreakerOpenError(this.options.resetTimeoutMs);
    }

    let lastError: unknown;
    let attempt = 0;

    while (attempt <= this.options.maxRetries) {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      try {
        const result = await fn();
        this.onSuccess();
        return result;
      } catch (err) {
        lastError = err;

        if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError") || (err instanceof Error && err.name === "AbortError")) {
          throw signal?.aborted ? new DOMException("Aborted", "AbortError") : err;
        }

        if (!this.options.isFailure(err)) {
          throw err;
        }

        this.onFailure(err);

        if (this.getState() === "open") {
          throw new CircuitBreakerOpenError(this.options.resetTimeoutMs);
        }

        if (attempt >= this.options.maxRetries) {
          throw err;
        }

        const delay = Math.min(
          this.options.backoffMs * Math.pow(2, attempt),
          this.options.maxBackoffMs,
        );

        await this.sleepAbortable(delay, signal);
        attempt++;
      }
    }

    throw lastError;
  }

  private async sleepAbortable(ms: number, signal?: AbortSignal): Promise<void> {
    if (!signal) {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      }
    });
  }

  private onSuccess(): void {
    if (this.state === "half_open") {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.options.successThreshold) {
        this.state = "closed";
        this.failureCount = 0;
        this.halfOpenSuccesses = 0;
      }
    } else if (this.state === "closed") {
      this.failureCount = 0;
    }
  }

  private onFailure(err: unknown): void {
    if (!this.options.isFailure(err)) return;

    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = "open";
    } else if (this.state === "half_open") {
      this.state = "open";
      this.halfOpenSuccesses = 0;
    }
  }

  reset(): void {
    this.state = "closed";
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.halfOpenSuccesses = 0;
  }

  getOptions(): Readonly<Required<CircuitBreakerOptions>> {
    return this.options;
  }
}

/** Thrown when a call is rejected because the breaker is open. */
export class CircuitBreakerOpenError extends VntError {
  readonly remainingMs: number;

  constructor(resetTimeoutMs: number) {
    super(`Circuit breaker is open — too many consecutive failures. Will retry in ${resetTimeoutMs}ms`, { code: "CIRCUIT_BREAKER_OPEN", retryable: true });
    this.name = "CircuitBreakerOpenError";
    this.remainingMs = resetTimeoutMs;
  }
}
