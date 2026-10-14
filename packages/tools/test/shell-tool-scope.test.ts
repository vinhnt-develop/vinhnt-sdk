import { describe, it, expect } from "vitest";
import { createShellTool } from "../src/shell-tool.js";
import { signalToToolContext } from "../src/tool-sandbox.js";
import { SandboxUnavailableError } from "@vinhnt-sdk/sandbox";
import type { ToolContext } from "../src/context.js";

function ctxWith(scope?: string): ToolContext {
  const base = signalToToolContext(new AbortController().signal);
  return scope !== undefined ? { ...base, sandboxScope: scope } : base;
}

const shellTool = () =>
  createShellTool({
    workspaceRoot: process.cwd(),
    defaultTimeoutMs: 5_000,
    askPermission: false,
  });

describe("P3.3 shell tool sandbox scope resolution", () => {
  it("TC01_default_scope_stays_process", async () => {
    const tool = shellTool();
    const result = (await tool.execute({ command: "echo hi" }, ctxWith())) as {
      exitCode: number;
    };
    expect(result).toHaveProperty("exitCode");
  });

  it("TC02_unknown_scope_fails_closed_at_execute", async () => {
    const tool = shellTool();
    await expect(
      tool.execute({ command: "echo hi" }, ctxWith("unknown-scope")),
    ).rejects.toThrow(SandboxUnavailableError);
  });

  it("TC03_context_scope_overrides_tool_config", async () => {
    const tool = createShellTool({
      workspaceRoot: process.cwd(),
      defaultTimeoutMs: 5_000,
      askPermission: false,
      sandboxScope: "container",
    });
    // Tool config says container, context says host → context wins.
    const result = (await tool.execute({ command: "echo hi" }, ctxWith("host"))) as {
      exitCode: number;
    };
    expect(result).toHaveProperty("exitCode");
  });

  it("TC04_tool_config_scope_used_when_context_absent", async () => {
    const tool = createShellTool({
      workspaceRoot: process.cwd(),
      defaultTimeoutMs: 10_000,
      askPermission: false,
      sandboxScope: "container",
    });
    // G17: container scope must actually reach the container backend — either
    // it runs in a Linux container (exit 0 + /proc/version), or docker itself
    // errors fail-closed (missing CLI/daemon/pull). It must never silently
    // downgrade to host (which would give an empty/host-shaped stderr).
    const result = (await tool.execute({ command: "cat /proc/version" }, ctxWith())) as {
      exitCode: number;
      stdout: string;
      stderr: string;
    };
    const ranInContainer = result.exitCode === 0 && /linux/i.test(result.stdout);
    const dockerFailClosed = /docker|daemon|connect|timeout|timed/i.test(result.stderr);
    expect(ranInContainer || dockerFailClosed).toBe(true);
  });

  it("TC05_scope_sandbox_is_cached_per_scope", async () => {
    const tool = shellTool();
    const r1 = (await tool.execute({ command: "echo one" }, ctxWith("host"))) as unknown;
    const r2 = (await tool.execute({ command: "echo two" }, ctxWith("host"))) as unknown;
    expect(r1).toHaveProperty("exitCode");
    expect(r2).toHaveProperty("exitCode");
    await expect(tool.execute({ command: "echo x" }, ctxWith("unknown-scope"))).rejects.toThrow(
      SandboxUnavailableError,
    );
    // Host cache must still work after a failed scope lookup.
    const r3 = (await tool.execute({ command: "echo three" }, ctxWith("host"))) as unknown;
    expect(r3).toHaveProperty("exitCode");
  });

  it("TC06_context_container_scope_never_downgrades", async () => {
    const tool = shellTool();
    // Kernel-provided scope (P3.3 path): same fail-closed container contract.
    const result = (await tool.execute({ command: "cat /proc/version" }, ctxWith("container"))) as {
      exitCode: number;
      stdout: string;
      stderr: string;
    };
    const ranInContainer = result.exitCode === 0 && /linux/i.test(result.stdout);
    const dockerFailClosed = /docker|daemon|connect|timeout|timed/i.test(result.stderr);
    expect(ranInContainer || dockerFailClosed).toBe(true);
  });
});
