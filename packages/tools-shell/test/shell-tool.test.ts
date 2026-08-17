import { describe, it, expect } from "vitest";
import { createShellTool } from "../src/shell-tool.js";

describe("createShellTool", () => {
  it("registers as execute_command with write risk", () => {
    const def = createShellTool({
      workspaceRoot: "/workspace",
      defaultTimeoutMs: 30_000,
    });
    expect(def.id).toBe("execute_command");
    expect(def.risk).toBe("write");
  });

  it("is self-approving when askPermission is enabled (default)", () => {
    const def = createShellTool({
      workspaceRoot: "/workspace",
      defaultTimeoutMs: 30_000,
    });
    expect(def.selfApproving).toBe(true);
  });

  it("is NOT self-approving when askPermission is disabled", () => {
    const def = createShellTool({
      workspaceRoot: "/workspace",
      defaultTimeoutMs: 30_000,
      askPermission: false,
    });
    expect(def.selfApproving).toBe(false);
  });
});