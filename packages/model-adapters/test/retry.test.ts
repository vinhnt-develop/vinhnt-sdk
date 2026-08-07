import { describe, it, expect, vi } from "vitest";
import { withRetry, RetryExhaustedError } from "../src/retry.js";

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 status error", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("429 Too Many Requests"), { status: 429 }))
      .mockResolvedValueOnce("ok");
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on 503 status error", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("503 Service Unavailable"), { status: 503 }))
      .mockRejectedValueOnce(Object.assign(new Error("503 again"), { status: 503 }))
      .mockResolvedValueOnce("ok");
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("retries on TypeError (network error)", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce("ok");
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws immediately on non-retryable error", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("400 Bad Request"));
    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 })).rejects.toThrow("400");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting retries", async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error("429"), { status: 429 }));
    await expect(withRetry(fn, { maxAttempts: 2, baseDelayMs: 10 })).rejects.toThrow("429");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("respects maxAttempts = 1 (no retry)", async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error("429"), { status: 429 }));
    await expect(withRetry(fn, { maxAttempts: 1, baseDelayMs: 10 })).rejects.toThrow("429");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("passes through the successful value", async () => {
    const fn = vi.fn().mockResolvedValue(42);
    const result = await withRetry(fn);
    expect(result).toBe(42);
  });
});
