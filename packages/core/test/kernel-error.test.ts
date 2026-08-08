import { describe, it, expect } from "vitest";
import { KernelError } from "../src/kernel/kernel.js";

describe("KernelError", () => {
  it("creates error with code and message", () => {
    const err = new KernelError("cancelled", "Run was cancelled");
    expect(err.code).toBe("cancelled");
    expect(err.message).toBe("Run was cancelled");
    expect(err.name).toBe("KernelError.cancelled");
  });

  it("supports all error codes", () => {
    const codes = [
      "session_busy", "cancelled", "max_steps_exceeded", "max_tokens_exceeded",
      "tool_failed", "model_failed", "session_store_failed", "internal_error",
      "timeout", "model_unavailable",
    ] as const;
    for (const code of codes) {
      const err = new KernelError(code, "test");
      expect(err.code).toBe(code);
      expect(err.name).toBe(`KernelError.${code}`);
    }
  });

  it("optionally wraps cause", () => {
    const inner = new Error("inner failure");
    const err = new KernelError("model_failed", "Model call failed", inner);
    expect(err.cause).toBe(inner);
  });

  it("is instanceof Error", () => {
    const err = new KernelError("internal_error", "oops");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(KernelError);
  });
});
