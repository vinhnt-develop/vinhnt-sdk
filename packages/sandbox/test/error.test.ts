import { describe, it, expect } from "vitest";
import { SandboxUnavailableError } from "../src/error.js";

describe("SandboxUnavailableError", () => {
  it("carries the standard VntError fields", () => {
    const err = new SandboxUnavailableError("container");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SandboxUnavailableError);
    expect(err.name).toBe("SandboxUnavailableError");
    expect(err.code).toBe("ERR_SANDBOX_UNAVAILABLE");
    expect(err.retryable).toBe(false);
    expect(err.scope).toBe("container");
  });

  it("mentions the requested scope in the message", () => {
    const err = new SandboxUnavailableError("container");
    expect(err.message).toContain("container");
  });

  it("lists available scopes when provided", () => {
    const err = new SandboxUnavailableError("container", ["host", "process"]);
    expect(err.availableScopes).toEqual(["host", "process"]);
    expect(err.message).toContain("host");
    expect(err.message).toContain("process");
  });

  it("is fail-closed even when no backends are registered", () => {
    const err = new SandboxUnavailableError("host", []);
    expect(err.availableScopes).toHaveLength(0);
    expect(err.message).toMatch(/no sandbox backends registered/i);
  });
});