import { describe, it, expect } from "vitest";
import { CircuitBreaker, CircuitBreakerOpenError, LoopDetector, detectDoomLoop, hashArgs, ToolTimeoutError, withToolTimeout } from "../src/index.js";

describe("CircuitBreaker", () => {
  it("starts in closed state", () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe("closed");
  });

  it("opens after failure threshold", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, maxRetries: 0 });
    for (let i = 0; i < 3; i++) {
      await cb.call(async () => { throw new Error("fail"); }).catch(() => {});
    }
    expect(cb.getState()).toBe("open");
  });

  it("throws CircuitBreakerOpenError when open", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, maxRetries: 0 });
    await cb.call(async () => { throw new Error("fail"); }).catch(() => {});
    await expect(cb.call(async () => "ok")).rejects.toThrow(CircuitBreakerOpenError);
  });

  it("recovers after reset timeout", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50, maxRetries: 0, successThreshold: 1 });
    await cb.call(async () => { throw new Error("fail"); }).catch(() => {});
    expect(cb.getState()).toBe("open");
    await new Promise((r) => setTimeout(r, 60));
    expect(cb.getState()).toBe("half_open");
    const result = await cb.call(async () => "ok");
    expect(result).toBe("ok");
    expect(cb.getState()).toBe("closed");
  });

  it("resets manually", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, maxRetries: 0 });
    await cb.call(async () => { throw new Error("fail"); }).catch(() => {});
    expect(cb.getState()).toBe("open");
    cb.reset();
    expect(cb.getState()).toBe("closed");
  });
});

describe("LoopDetector", () => {
  it("detects doom loop after threshold", () => {
    const detector = new LoopDetector(3);
    detector.record("tool_a", { x: 1 });
    detector.record("tool_a", { x: 1 });
    detector.record("tool_a", { x: 1 });
    expect(detector.isDoomLoop("tool_a", { x: 1 })).toBe(true);
  });

  it("does not trigger on different args", () => {
    const detector = new LoopDetector(3);
    detector.record("tool_a", { x: 1 });
    detector.record("tool_a", { x: 1 });
    detector.record("tool_a", { x: 2 });
    expect(detector.isDoomLoop("tool_a", { x: 1 })).toBe(false);
  });

  it("does not trigger on different tools", () => {
    const detector = new LoopDetector(3);
    detector.record("tool_a", { x: 1 });
    detector.record("tool_a", { x: 1 });
    detector.record("tool_b", { x: 1 });
    expect(detector.isDoomLoop("tool_a", { x: 1 })).toBe(false);
  });

  it("resets state", () => {
    const detector = new LoopDetector(2);
    detector.record("tool_a", { x: 1 });
    detector.record("tool_a", { x: 1 });
    expect(detector.isDoomLoop("tool_a", { x: 1 })).toBe(true);
    detector.reset();
    expect(detector.isDoomLoop("tool_a", { x: 1 })).toBe(false);
  });
});

describe("hashArgs", () => {
  it("order-independent for objects", () => {
    expect(hashArgs({ a: 1, b: 2 })).toBe(hashArgs({ b: 2, a: 1 }));
  });

  it("different for different values", () => {
    expect(hashArgs({ a: 1 })).not.toBe(hashArgs({ a: 2 }));
  });
});

describe("ToolTimeoutError", () => {
  it("has correct name and properties", () => {
    const err = new ToolTimeoutError("my_tool", 5000);
    expect(err.name).toBe("ToolTimeoutError");
    expect(err.toolId).toBe("my_tool");
    expect(err.timeoutMs).toBe(5000);
    expect(err.message).toContain("my_tool");
    expect(err.message).toContain("5000ms");
  });
});

describe("withToolTimeout", () => {
  it("returns result on time", async () => {
    const result = await withToolTimeout("t", 1000, async () => 42);
    expect(result).toBe(42);
  });

  it("throws ToolTimeoutError on timeout", async () => {
    await expect(
      withToolTimeout("slow_tool", 50, async (signal) => {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 200);
          signal.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
        });
        return "ok";
      }),
    ).rejects.toThrow(ToolTimeoutError);
  });
});
