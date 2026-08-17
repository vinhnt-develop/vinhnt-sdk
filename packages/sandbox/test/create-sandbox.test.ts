import { describe, it, expect } from "vitest";
import { createSandbox } from "../src/factory.js";
import type { ProcessSandbox } from "../src/types.js";
import { SandboxUnavailableError } from "../src/error.js";

function makeStub(scope: string): ProcessSandbox {
  return {
    scope,
    execute: async () => ({ result: { stdout: "", stderr: "", exitCode: 0 }, exitCode: 0, durationMs: 0, timedOut: false }),
    destroy: async () => {},
  };
}

describe("createSandbox (fail-closed factory)", () => {
  it("returns a backend for a wired scope", () => {
    const sandbox = createSandbox({ defaultTimeoutMs: 1000, scope: "host" }, { host: () => makeStub("host") });
    expect(sandbox.scope).toBe("host");
  });

  it("defaults to host scope", () => {
    const sandbox = createSandbox({ defaultTimeoutMs: 1000 }, { host: () => makeStub("host") });
    expect(sandbox.scope).toBe("host");
  });

  it("throws SandboxUnavailableError for an unwired scope (no silent downgrade)", () => {
    expect(() =>
      createSandbox({ defaultTimeoutMs: 1000, scope: "container" }, { host: () => makeStub("host") }),
    ).toThrow(SandboxUnavailableError);
  });

  it("throws with the list of available scopes", () => {
    try {
      createSandbox({ defaultTimeoutMs: 1000, scope: "process" }, { host: () => makeStub("host") });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SandboxUnavailableError);
      expect((err as SandboxUnavailableError).scope).toBe("process");
      expect((err as SandboxUnavailableError).availableScopes).toEqual(["host"]);
    }
  });

  it("throws when NO backends are registered (pure fail-closed)", () => {
    expect(() => createSandbox({ defaultTimeoutMs: 1000, scope: "host" })).toThrow(SandboxUnavailableError);
  });

  it("passes the config to the backend factory", () => {
    let receivedConfig: unknown;
    const sandbox = createSandbox({ defaultTimeoutMs: 5000 }, {
      host: (config) => {
        receivedConfig = config;
        return makeStub("host");
      },
    });
    expect(sandbox.scope).toBe("host");
    expect(receivedConfig).toEqual({ defaultTimeoutMs: 5000 });
  });
});