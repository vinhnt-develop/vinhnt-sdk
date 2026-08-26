import { describe, expect, it } from "vitest";
import type { RetryOptions } from "../src/error.js";
import {
  UpstreamError,
  RETRYABLE_STATUSES,
  parseRetryAfterMs,
  computeBackoffMs,
  retryableStatusSet,
  extractErrorMessage,
  toUpstreamError,
  abortableSleep,
} from "../src/error.js";

describe("UpstreamError", () => {
  it("builds an ERR_UPSTREAM_* code for retryable statuses", () => {
    const err = new UpstreamError(503, "busy");
    expect(err.code).toBe("ERR_UPSTREAM_503");
    expect(err.retryable).toBe(true);
    expect(err.name).toBe("UpstreamError");
  });

  it("marks 4xx errors as non-retryable", () => {
    const err = new UpstreamError(401, "nope");
    expect(err.retryable).toBe(false);
  });
});

describe("parseRetryAfterMs", () => {
  it("parses delta-seconds", () => {
    expect(parseRetryAfterMs("5")).toBe(5000);
  });

  it("parses HTTP-date form", () => {
    const future = new Date(Date.now() + 3000).toUTCString();
    const ms = parseRetryAfterMs(future);
    expect(ms).toBeDefined();
    expect(ms!).toBeGreaterThanOrEqual(1000);
    expect(ms!).toBeLessThanOrEqual(3000);
  });

  it("returns undefined for missing/empty/invalid", () => {
    expect(parseRetryAfterMs(undefined)).toBeUndefined();
    expect(parseRetryAfterMs("")).toBeUndefined();
    expect(parseRetryAfterMs("not-a-date")).toBeUndefined();
  });
});

describe("computeBackoffMs", () => {
  it("grows exponentially from the base", () => {
    const opts = { baseBackoffMs: 100, maxBackoffMs: 1000, fixedBackoffMs: undefined } as unknown as RetryOptions;
    expect(computeBackoffMs(0, opts)).toBeGreaterThanOrEqual(80);
    expect(computeBackoffMs(0, opts)).toBeLessThanOrEqual(120);
    const cap = computeBackoffMs(10, opts);
    expect(cap).toBeGreaterThanOrEqual(900);
    expect(cap).toBeLessThanOrEqual(1000);
  });

  it("honours fixedBackoffMs", () => {
    expect(computeBackoffMs(0, { fixedBackoffMs: 42 })).toBe(42);
    expect(computeBackoffMs(5, { fixedBackoffMs: 42 })).toBe(42);
  });
});

describe("retryableStatusSet", () => {
  it("includes defaults and caller extras", () => {
    const set = retryableStatusSet({ retryableStatuses: [520] });
    expect(set.has(429)).toBe(true);
    expect(set.has(503)).toBe(true);
    expect(set.has(520)).toBe(true);
    expect(set.has(400)).toBe(false);
    expect(RETRYABLE_STATUSES.has(500)).toBe(true);
  });
});

describe("extractErrorMessage", () => {
  it("reads the OpenAI error.message field", () => {
    expect(extractErrorMessage({ error: { message: "boom" } })).toBe("boom");
  });

  it("reads a top-level message", () => {
    expect(extractErrorMessage({ message: "plain" })).toBe("plain");
  });

  it("returns undefined when nothing useful", () => {
    expect(extractErrorMessage(null)).toBeUndefined();
    expect(extractErrorMessage(42)).toBeUndefined();
  });

  it("redacts an echoed API key from the message (RV-43)", () => {
    const msg = extractErrorMessage({
      error: { message: "Incorrect API key provided: sk-shortKey123. See docs." },
    });
    expect(msg).toBe("Incorrect API key provided: [REDACTED:api-key-prefix]. See docs.");
  });

  it("redacts long keys too (RV-43)", () => {
    const msg = extractErrorMessage({
      error: { message: "bad key sk-abcdefghijklmnopqrstuvwxyz1234567890abc" },
    });
    expect(msg).toBe("bad key [REDACTED:openai-key]");
  });
});

describe("toUpstreamError", () => {
  it("carries retry-after through to UpstreamError", () => {
    const headers = new Headers({ "retry-after": "2" });
    const err = toUpstreamError(429, { error: { message: "slow down" } }, headers);
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err.code).toBe("ERR_UPSTREAM_429");
    expect(err.retryable).toBe(true);
    expect((err as UpstreamError).retryAfterMs).toBe(2000);
  });

  it("never embeds an echoed API key in the error message (RV-43)", () => {
    const err = toUpstreamError(401, { error: { message: "Invalid key: sk-abc123secret" } });
    expect(err.message).not.toContain("sk-abc123secret");
    expect(err.message).toContain("[REDACTED:");
  });
});

describe("abortableSleep", () => {
  it("rejects early when the signal aborts mid-sleep", async () => {
    const controller = new AbortController();
    const pending = abortableSleep(1000, controller.signal);
    const assertion = expect(pending).rejects.toThrow("Aborted");
    controller.abort(new Error("Aborted"));
    await assertion;
  });

  it("resolves after the delay without leaving an abort listener behind (RV-50)", async () => {
    const controller = new AbortController();
    const signal = controller.signal;
    await abortableSleep(1, signal);
    // A stray listener would reject the already-settled promise on abort —
    // the sleep must not throw/reject here and must stay resolved.
    controller.abort();
    await expect(Promise.resolve("done")).resolves.toBe("done");
  });
});