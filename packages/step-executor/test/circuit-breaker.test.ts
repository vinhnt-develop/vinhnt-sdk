import { describe, expect, it, vi } from "vitest";
import { CircuitBreaker, CircuitBreakerOpenError } from "../src/circuit-breaker.js";

describe("CircuitBreaker", () => {
  it("starts closed and allows calls", async () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe("closed");
    await expect(cb.call(() => Promise.resolve("ok"))).resolves.toBe("ok");
    expect(cb.getState()).toBe("closed");
  });

  it("opens after failureThreshold failures", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 60000, maxRetries: 0 });
    const fn = vi.fn().mockRejectedValue(new Error("API error"));

    // First 2 calls: circuit is closed, fn throws original error
    await expect(cb.call(fn)).rejects.toThrow("API error");
    await expect(cb.call(fn)).rejects.toThrow("API error");
    expect(cb.getState()).toBe("closed");

    // 3rd call: circuit opens after failure, fn throws CircuitBreakerOpenError
    await expect(cb.call(fn)).rejects.toThrow(CircuitBreakerOpenError);
    expect(cb.getState()).toBe("open");
  });

  it("resets to half_open after resetTimeoutMs", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 10 });
    const failFn = vi.fn().mockRejectedValue(new Error("fail"));

    await expect(cb.call(failFn)).rejects.toThrow("fail");
    await expect(cb.call(failFn)).rejects.toThrow("fail");
    expect(cb.getState()).toBe("open");

    await vi.waitFor(() => expect(cb.getState()).toBe("half_open"), { timeout: 100 });
  });

  it("closes again after successThreshold successes in half_open", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, successThreshold: 2, resetTimeoutMs: 10 });
    const failFn = vi.fn().mockRejectedValue(new Error("fail"));
    const okFn = vi.fn().mockResolvedValue("ok");

    await expect(cb.call(failFn)).rejects.toThrow("fail");
    await expect(cb.call(failFn)).rejects.toThrow("fail");

    await vi.waitFor(() => expect(cb.getState()).toBe("half_open"), { timeout: 100 });

    await cb.call(okFn);
    expect(cb.getState()).toBe("half_open");
    await cb.call(okFn);
    expect(cb.getState()).toBe("closed");
  });

  it("re-opens if half_open call fails", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, successThreshold: 1, resetTimeoutMs: 10 });
    const failFn = vi.fn().mockRejectedValue(new Error("fail"));

    await expect(cb.call(failFn)).rejects.toThrow("fail");
    await expect(cb.call(failFn)).rejects.toThrow("fail");
    await vi.waitFor(() => expect(cb.getState()).toBe("half_open"), { timeout: 100 });

    await expect(cb.call(failFn)).rejects.toThrow("fail");
    expect(cb.getState()).toBe("open");
  });

  it("does not count non-failures (auth errors)", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 60000 });
    await expect(cb.call(() => Promise.reject(new Error("unauthorized")))).rejects.toThrow("unauthorized");
    expect(cb.getState()).toBe("closed");
  });

  it("does not count context overflow errors", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 60000, maxRetries: 0 });
    await expect(cb.call(() => Promise.reject(new Error("context length exceeded")))).rejects.toThrow("context length exceeded");
    expect(cb.getState()).toBe("closed");
  });

  it("does not count 'not found' errors", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 60000 });
    await expect(cb.call(() => Promise.reject(new Error("not_found")))).rejects.toThrow("not_found");
    expect(cb.getState()).toBe("closed");
  });

  it("reset() returns to closed state", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 60000 });
    await expect(cb.call(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
    expect(cb.getState()).toBe("open");
    cb.reset();
    expect(cb.getState()).toBe("closed");
    await expect(cb.call(() => Promise.resolve("ok"))).resolves.toBe("ok");
  });

  it("accepts custom isFailure predicate", async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      maxRetries: 0,
      isFailure: (err) => (err as Error).message.includes("real_failure"),
    });
    // Non-failure errors don't count
    await expect(cb.call(() => Promise.reject(new Error("ignore_me")))).rejects.toThrow("ignore_me");
    expect(cb.getState()).toBe("closed");

    // First real_failure
    await expect(cb.call(() => Promise.reject(new Error("real_failure")))).rejects.toThrow("real_failure");
    expect(cb.getState()).toBe("closed");
    
    // Second real_failure
    await expect(cb.call(() => Promise.reject(new Error("real_failure")))).rejects.toThrow("real_failure");
    expect(cb.getState()).toBe("closed");
    
    // Third real_failure - circuit opens
    await expect(cb.call(() => Promise.reject(new Error("real_failure")))).rejects.toThrow(CircuitBreakerOpenError);
    expect(cb.getState()).toBe("open");
  });

  it("CircuitBreakerOpenError has remainingMs", () => {
    const err = new CircuitBreakerOpenError(30000);
    expect(err.remainingMs).toBe(30000);
    expect(err.message).toContain("30000");
    expect(err.name).toBe("CircuitBreakerOpenError");
  });

  describe("retry logic with exponential backoff", () => {
    it("retries on transient failures with default maxRetries", async () => {
      const cb = new CircuitBreaker({ maxRetries: 2, backoffMs: 10 });
      let attempt = 0;
      const fn = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt < 3) {
          return Promise.reject(new Error("transient error"));
        }
        return Promise.resolve("success");
      });

      const result = await cb.call(fn);
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("throws after maxRetries exceeded", async () => {
      const cb = new CircuitBreaker({ maxRetries: 2, backoffMs: 10 });
      const fn = vi.fn().mockRejectedValue(new Error("persistent error"));

      await expect(cb.call(fn)).rejects.toThrow("persistent error");
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it("respects AbortSignal during retry delay", async () => {
      const cb = new CircuitBreaker({ maxRetries: 3, backoffMs: 1000 });
      const fn = vi.fn().mockRejectedValue(new Error("error"));
      const controller = new AbortController();

      // Abort after first attempt
      setTimeout(() => controller.abort(), 50);

      await expect(cb.call(fn, controller.signal)).rejects.toThrow("Aborted");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("does not retry non-failure errors", async () => {
      const cb = new CircuitBreaker({ maxRetries: 3, backoffMs: 10 });
      const fn = vi.fn().mockRejectedValue(new Error("unauthorized"));

      await expect(cb.call(fn)).rejects.toThrow("unauthorized");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("resets retry count on success", async () => {
      const cb = new CircuitBreaker({ maxRetries: 2, backoffMs: 10 });
      let attempt = 0;
      const fn = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt === 1) {
          return Promise.reject(new Error("transient"));
        }
        return Promise.resolve("ok");
      });

      await cb.call(fn);
      expect(fn).toHaveBeenCalledTimes(2);

      // Second call should start fresh
      attempt = 0;
      fn.mockClear();
      fn.mockRejectedValue(new Error("transient"));
      
      // Should fail after maxRetries
      await expect(cb.call(fn)).rejects.toThrow("transient");
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it("getOptions returns current configuration", () => {
      const cb = new CircuitBreaker({
        maxRetries: 5,
        backoffMs: 2000,
        maxBackoffMs: 60000,
      });

      const options = cb.getOptions();
      expect(options.maxRetries).toBe(5);
      expect(options.backoffMs).toBe(2000);
      expect(options.maxBackoffMs).toBe(60000);
    });

    it("does not count an aborted call as a failure (no false trip)", async () => {
      const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 60000, maxRetries: 0 });
      const abort = new AbortController();
      abort.abort();

      await expect(cb.call(
        () => Promise.reject(new DOMException("Aborted", "AbortError")),
        abort.signal,
      )).rejects.toMatchObject({ name: "AbortError" });

      // Abort must never trip or count toward the failure threshold.
      expect(cb.getState()).toBe("closed");
      await expect(cb.call(() => Promise.resolve("ok"))).resolves.toBe("ok");
    });

    it("throws AbortError immediately when the signal fires during backoff", async () => {
      const cb = new CircuitBreaker({ maxRetries: 3, backoffMs: 1000, maxBackoffMs: 1000 });
      const abort = new AbortController();
      const fn = vi.fn().mockRejectedValue(new Error("transient"));

      const pending = cb.call(fn, abort.signal).catch((e) => e);
      abort.abort();

      const result = await pending;
      expect(result).toBeInstanceOf(DOMException);
      expect((result as DOMException).name).toBe("AbortError");
    });
  });
});
