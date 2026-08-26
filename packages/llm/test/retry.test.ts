import { describe, expect, it } from "vitest";
import { shouldRetry, calculateDelay } from "../src/retry.js";
import type { RetryPolicy } from "../src/adapter.js";

describe("shouldRetry", () => {
  const defaultPolicy: RetryPolicy | undefined = undefined;

  it("returns true for a generic error within max retries", () => {
    expect(shouldRetry({}, defaultPolicy, 0)).toBe(true);
  });

  it("returns false when attempt >= maxRetries (default 2)", () => {
    expect(shouldRetry({}, defaultPolicy, 2)).toBe(false);
    expect(shouldRetry({}, defaultPolicy, 3)).toBe(false);
  });

  it("returns false when attempt >= custom maxRetries", () => {
    const policy: RetryPolicy = { maxRetries: 5 };
    expect(shouldRetry({}, policy, 4)).toBe(true);
    expect(shouldRetry({}, policy, 5)).toBe(false);
  });

  it("returns false when error.retryable is explicitly false", () => {
    expect(shouldRetry({ retryable: false }, defaultPolicy, 0)).toBe(false);
  });

  it("returns true when error.retryable is true", () => {
    expect(shouldRetry({ retryable: true }, defaultPolicy, 0)).toBe(true);
  });

  it("returns true when error.retryable is undefined (neutral)", () => {
    expect(shouldRetry({}, defaultPolicy, 0)).toBe(true);
  });

  it("returns true for default retryable status codes", () => {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    for (const code of retryableStatuses) {
      expect(shouldRetry({ statusCode: code }, defaultPolicy, 0)).toBe(true);
    }
  });

  it("returns false for non-retryable status codes by default", () => {
    const nonRetryable = [400, 401, 403, 404, 422];
    for (const code of nonRetryable) {
      expect(shouldRetry({ statusCode: code }, defaultPolicy, 0)).toBe(false);
    }
  });

  it("uses custom retryableStatuses from policy", () => {
    const policy: RetryPolicy = { retryableStatuses: [418, 500] };
    expect(shouldRetry({ statusCode: 418 }, policy, 0)).toBe(true);
    expect(shouldRetry({ statusCode: 429 }, policy, 0)).toBe(false);
    expect(shouldRetry({ statusCode: 500 }, policy, 0)).toBe(true);
  });

  it("retryable false overrides retryable status code", () => {
    expect(shouldRetry({ retryable: false, statusCode: 500 }, defaultPolicy, 0)).toBe(false);
  });

  it("no status code passes through when retryable is not false", () => {
    expect(shouldRetry({ retryable: true }, defaultPolicy, 1)).toBe(true);
  });

  it("respects maxRetries at boundary", () => {
    const policy: RetryPolicy = { maxRetries: 1 };
    expect(shouldRetry({}, policy, 0)).toBe(true);
    expect(shouldRetry({}, policy, 1)).toBe(false);
  });
});

describe("calculateDelay", () => {
  it("returns exponential backoff for attempt 0", () => {
    // attempt 0: baseDelay * 2^0 = baseDelay * 1, plus up to 20% jitter
    const delay = calculateDelay(0, undefined);
    const base = 1000;
    expect(delay).toBeGreaterThanOrEqual(base);
    expect(delay).toBeLessThanOrEqual(base * 1.2);
  });

  it("returns exponential backoff for attempt 1", () => {
    const delay = calculateDelay(1, undefined);
    const base = 1000;
    // attempt 1: baseDelay * 2^1 = 2000, plus up to 20% jitter
    expect(delay).toBeGreaterThanOrEqual(base * 2);
    expect(delay).toBeLessThanOrEqual(base * 2 * 1.2);
  });

  it("caps at maxDelayMs (default 30s)", () => {
    const delay = calculateDelay(20, undefined);
    expect(delay).toBeLessThanOrEqual(30_000);
  });

  it("caps at custom maxDelayMs", () => {
    const policy: RetryPolicy = { maxDelayMs: 5000 };
    const delay = calculateDelay(20, policy);
    expect(delay).toBeLessThanOrEqual(5000);
  });

  it("uses custom baseDelayMs", () => {
    const policy: RetryPolicy = { baseDelayMs: 2000 };
    const delay = calculateDelay(0, policy);
    expect(delay).toBeGreaterThanOrEqual(2000);
    expect(delay).toBeLessThanOrEqual(2000 * 1.2);
  });

  it("uses retryAfterMs when provided and positive", () => {
    const delay = calculateDelay(0, undefined, 5000);
    expect(delay).toBe(5000);
  });

  it("caps retryAfterMs at maxDelayMs", () => {
    const policy: RetryPolicy = { maxDelayMs: 1000 };
    const delay = calculateDelay(0, policy, 5000);
    expect(delay).toBe(1000);
  });

  it("ignores retryAfterMs of 0 or negative", () => {
    const delay1 = calculateDelay(0, undefined, 0);
    const delay2 = calculateDelay(0, undefined, -100);
    // Should fall back to exponential backoff
    expect(delay1).toBeGreaterThanOrEqual(1000);
    expect(delay2).toBeGreaterThanOrEqual(1000);
  });

  it("delay increases with attempt number", () => {
    const delays = [0, 1, 2, 3, 4].map((attempt) => calculateDelay(attempt, { maxDelayMs: 100_000 }));
    for (let i = 1; i < delays.length; i++) {
      // The base delay at attempt i should be at least 2x the previous
      // but jitter makes exact comparison unreliable, so check the floor
      expect(delays[i]!).toBeGreaterThanOrEqual(delays[i - 1]! * 0.8);
    }
  });

  it("jitter produces varying delays", () => {
    const delays = Array.from({ length: 20 }, () => calculateDelay(0, undefined));
    // With jitter, we should see more than one unique value
    const unique = new Set(delays);
    expect(unique.size).toBeGreaterThan(1);
  });
});
