import { describe, it, expect } from "vitest";
import { createSandbox, SandboxUnavailableError } from "@vinhnt-sdk/sandbox";
import { createContainerSandbox } from "../src/index.js";

describe("sandbox-container", () => {
  it("is scoped to container", () => {
    const sandbox = createSandbox({ defaultTimeoutMs: 30_000, scope: "container" }, { container: createContainerSandbox });
    expect(sandbox.scope).toBe("container");
  });

  it("is fail-closed: executes always throw SandboxUnavailableError (no silent downgrade)", async () => {
    const sandbox = createSandbox({ defaultTimeoutMs: 30_000, scope: "container" }, { container: createContainerSandbox });

    await expect(
      sandbox.execute({ command: "node ./app.js", cwd: ".", timeoutMs: 30_000 }),
    ).rejects.toThrow(SandboxUnavailableError);
  });

  it("refuses with ERR_SANDBOX_UNAVAILABLE", async () => {
    const sandbox = createSandbox({ defaultTimeoutMs: 30_000, scope: "container" }, { container: createContainerSandbox });
    try {
      await sandbox.execute({ command: "echo hi", cwd: ".", timeoutMs: 1000 });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SandboxUnavailableError);
      expect((err as SandboxUnavailableError).code).toBe("ERR_SANDBOX_UNAVAILABLE");
      expect((err as SandboxUnavailableError).scope).toBe("container");
    }
  });

  it("destroy is a no-op", async () => {
    const sandbox = createSandbox({ defaultTimeoutMs: 30_000, scope: "container" }, { container: createContainerSandbox });
    await expect(sandbox.destroy()).resolves.toBeUndefined();
  });
});