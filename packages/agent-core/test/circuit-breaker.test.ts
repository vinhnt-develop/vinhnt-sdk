import { describe, expect, it, vi } from "vitest";
import { CircuitBreaker, CircuitBreakerOpenError } from "../src/kernel/circuit-breaker.js";

describe("CircuitBreaker", () => {
  it("starts closed and allows calls", async () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe("closed");
    await expect(cb.call(() => Promise.resolve("ok"))).resolves.toBe("ok");
    expect(cb.getState()).toBe("closed");
  });

  it("opens after failureThreshold failures", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 60000 });
    const fn = vi.fn().mockRejectedValue(new Error("API error"));

    for (let i = 0; i < 3; i++) {
      await expect(cb.call(fn)).rejects.toThrow("API error");
    }
    expect(cb.getState()).toBe("open");
    await expect(cb.call(fn)).rejects.toThrow(CircuitBreakerOpenError);
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
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 60000 });
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
      failureThreshold: 2,
      isFailure: (err) => (err as Error).message.includes("real_failure"),
    });
    await expect(cb.call(() => Promise.reject(new Error("ignore_me")))).rejects.toThrow("ignore_me");
    expect(cb.getState()).toBe("closed");
    await expect(cb.call(() => Promise.reject(new Error("real_failure")))).rejects.toThrow("real_failure");
    expect(cb.getState()).toBe("closed");
    await expect(cb.call(() => Promise.reject(new Error("real_failure")))).rejects.toThrow("real_failure");
    expect(cb.getState()).toBe("open");
  });

  it("CircuitBreakerOpenError has remainingMs", () => {
    const err = new CircuitBreakerOpenError(30000);
    expect(err.remainingMs).toBe(30000);
    expect(err.message).toContain("30000");
    expect(err.name).toBe("CircuitBreakerOpenError");
  });
});
