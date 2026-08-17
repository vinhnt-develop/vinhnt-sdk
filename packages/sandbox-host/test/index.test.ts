import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSandbox } from "@vinhnt-sdk/sandbox";
import { createHostSandbox } from "../src/index.js";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sandbox-host-"));

function makeLongRunningCommand(): string {
  const script = path.join(tmpDir, `long-${crypto.randomUUID()}.js`);
  fs.writeFileSync(script, "setTimeout(() => {}, 60_000);\n");
  const cmd = `${JSON.stringify(process.execPath.replace(/\\/g, "/"))} ${JSON.stringify(script.replace(/\\/g, "/"))}`;
  return cmd;
}

describe("sandbox-host", () => {
  it("is scoped to host", () => {
    const sandbox = createSandbox({ defaultTimeoutMs: 30_000, scope: "host" }, { host: createHostSandbox });
    expect(sandbox.scope).toBe("host");
  });

  it("executes a normal command fine", async () => {
    const sandbox = createSandbox({ defaultTimeoutMs: 30_000, scope: "host" }, { host: createHostSandbox });
    const script = path.join(tmpDir, `echo-${crypto.randomUUID()}.js`);
    fs.writeFileSync(script, "console.log('sandbox-ok');\n");
    const result = await sandbox.execute({
      command: `${JSON.stringify(process.execPath.replace(/\\/g, "/"))} ${JSON.stringify(script.replace(/\\/g, "/"))}`,
      cwd: process.cwd(),
      timeoutMs: 10_000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.result.stdout).toContain("sandbox-ok");
  }, 15_000);

  it("kills a long-running command subtree on abort", async () => {
    const sandbox = createSandbox({ defaultTimeoutMs: 30_000, scope: "host" }, { host: createHostSandbox });
    const abort = new AbortController();

    const run = sandbox.execute({
      command: makeLongRunningCommand(),
      cwd: process.cwd(),
      timeoutMs: 60_000,
      signal: abort.signal,
    });

    // Abort shortly after start.
    setTimeout(() => abort.abort(new Error("user cancel")), 200);
    const result = await run;

    expect(result.exitCode).toBe(1);
    expect(String(result.result.stderr)).toContain("user cancel");
  }, 15_000);
});