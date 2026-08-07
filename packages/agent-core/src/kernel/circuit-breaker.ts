export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  resetTimeoutMs?: number;
  isFailure?: (err: unknown) => boolean;
}

const DEFAULT_OPTIONS = {
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeoutMs: 30_000,
  isFailure: (err: unknown) => {
    const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (msg.includes("auth") || msg.includes("unauthorized") || msg.includes("invalid api key")) return false;
    if (msg.includes("context") && msg.includes("token")) return false;
    if (msg.includes("not found") || msg.includes("not_found")) return false;
    return true;
  },
};

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenSuccesses = 0;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options?: CircuitBreakerOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  getState(): CircuitState {
    if (this.state === "open" && Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs) {
      this.state = "half_open";
      this.halfOpenSuccesses = 0;
    }
    return this.state;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState();
    if (state === "open") {
      throw new CircuitBreakerOpenError(this.options.resetTimeoutMs);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      throw err;
    }
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
}

export class CircuitBreakerOpenError extends Error {
  readonly remainingMs: number;

  constructor(resetTimeoutMs: number) {
    super(`Circuit breaker is open — too many consecutive failures. Will retry in ${resetTimeoutMs}ms`);
    this.name = "CircuitBreakerOpenError";
    this.remainingMs = resetTimeoutMs;
  }
}
