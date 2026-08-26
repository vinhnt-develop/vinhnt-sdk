import { describe, it, expect, vi } from "vitest";
import { PermissionGate } from "@vinhnt-sdk/step-executor";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeApprovalStore } from "../src/fakes/fake-approval-store.js";
import type { AgentConfig, RunId } from "@vinhnt-sdk/schema";

function makeAgent(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id: "test-agent",
    profile: { name: "Test Agent", version: "1.0", description: "test" },
    systemPrompt: "",
    capabilities: {},
    permissions: {
      mode: "primary",
      ...overrides.permissions,
    },
    ...overrides,
  } as AgentConfig;
}

function makeGate(overrides: Record<string, unknown> = {}) {
  const store = new FakeRunEventStore();
  const approvalStore = new FakeApprovalStore();
  return {
    store,
    approvalStore,
    gate: new PermissionGate({
      store: store as never,
      pluginManager: undefined,
      approvalStore,
      ...overrides,
    }),
  };
}

describe("PermissionGate", () => {
  describe("checkTool", () => {
    it("allows tool when no agent permissions set", () => {
      const { gate } = makeGate();
      const result = gate.checkTool("read_file", "read", undefined, undefined);
      expect(result.allowed).toBe(true);
      expect(result.needsApproval).toBeUndefined();
    });

    it("allows tool when agent has no permissions", () => {
      const { gate } = makeGate();
      const agent = makeAgent({ permissions: {} });
      const result = gate.checkTool("read_file", "read", undefined, agent);
      expect(result.allowed).toBe(true);
    });

    it("allows tool matching ruleset allow rule", () => {
      const { gate } = makeGate();
      const agent = makeAgent({
        permissions: {
          ruleset: {
            rules: [{ effect: "allow", target: "tool.read_file" }],
          },
        },
      });
      const result = gate.checkTool("read_file", "read", undefined, agent);
      expect(result.allowed).toBe(true);
      expect(result.needsApproval).toBeUndefined();
    });

    it("denies tool matching ruleset deny rule", () => {
      const { gate } = makeGate();
      const agent = makeAgent({
        permissions: {
          ruleset: {
            rules: [{ effect: "deny", target: "tool.execute_command" }],
          },
        },
      });
      const result = gate.checkTool("execute_command", "write", undefined, agent);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Denied");
    });

    it("asks approval for tool matching ruleset ask rule", () => {
      const { gate } = makeGate();
      const agent = makeAgent({
        permissions: {
          ruleset: {
            rules: [{ effect: "ask", target: "tool.write_file" }],
          },
        },
      });
      const result = gate.checkTool("write_file", "write", undefined, agent);
      expect(result.allowed).toBe(false);
      expect(result.needsApproval).toBe(true);
    });

    it("denies tool with risk exceeding allowedRisks", () => {
      const { gate } = makeGate();
      const agent = makeAgent({
        permissions: {
          ruleset: {
            rules: [{ effect: "allow", target: "tool.*" }],
            allowedRisks: ["read"],
          },
        },
      });
      const result = gate.checkTool("execute_command", "write", undefined, agent);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("exceeds agent's allowed risks");
    });

    it("denies tool in deniedTools list", () => {
      const { gate } = makeGate();
      const agent = makeAgent({
        permissions: {
          deniedTools: ["execute_command"],
        },
      });
      const result = gate.checkTool("execute_command", "write", undefined, agent);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("denied");
    });

    it("denies tool not in allowedTools list", () => {
      const { gate } = makeGate();
      const agent = makeAgent({
        permissions: {
          allowedTools: ["read_file", "write_file"],
        },
      });
      const result = gate.checkTool("execute_command", "write", undefined, agent);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("not in the allowed tools list");
    });

    it("denies tool when risk exceeds allowedRisks (legacy)", () => {
      const { gate } = makeGate();
      const agent = makeAgent({
        permissions: {
          allowedTools: ["execute_command"],
          allowedRisks: ["read"],
        },
      });
      const result = gate.checkTool("execute_command", "write", undefined, agent);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("exceeds agent's allowed risks");
    });

    it("supports wildcard patterns in deniedTools", () => {
      const { gate } = makeGate();
      const agent = makeAgent({
        permissions: {
          deniedTools: ["git_*"],
        },
      });
      const result = gate.checkTool("git_commit", "destructive", undefined, agent);
      expect(result.allowed).toBe(false);
    });

    it("allows tool matching wildcard in allowedTools", () => {
      const { gate } = makeGate();
      const agent = makeAgent({
        permissions: {
          allowedTools: ["read_*"],
        },
      });
      const result = gate.checkTool("read_file", "read", undefined, agent);
      expect(result.allowed).toBe(true);
    });

    it("handles ruleset with no matching rule — falls through to ask", () => {
      const { gate } = makeGate();
      const agent = makeAgent({
        permissions: {
          ruleset: {
            rules: [{ effect: "deny", target: "tool.execute_command" }],
          },
        },
      });
      const result = gate.checkTool("read_file", "read", undefined, agent);
      expect(result.allowed).toBe(false);
      expect(result.needsApproval).toBe(true);
      expect(result.reason).toContain("No matching rule");
    });
  });

  describe("setTopLevelRules", () => {
    it("denies tool matching a top-level deny pattern", () => {
      const { gate } = makeGate();
      gate.setTopLevelRules({ allow: [], deny: ["execute_command(*)"], ask: [] });
      const result = gate.checkTool("execute_command", "write", { command: "rm -rf /" }, undefined);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("denied");
    });

    it("allows a destructive tool matching a top-level allow pattern", () => {
      const { gate } = makeGate();
      gate.setTopLevelRules({ allow: ["execute_command(*)"], deny: [], ask: [] });
      const result = gate.checkTool("execute_command", "destructive", { command: "git status" }, undefined);
      expect(result.allowed).toBe(true);
      expect(result.reason).toContain("Allowed");
    });

    it("asks approval for tool matching a top-level ask pattern", () => {
      const { gate } = makeGate();
      gate.setTopLevelRules({ allow: [], deny: [], ask: ["execute_command(*)"] });
      const result = gate.checkTool("execute_command", "write", { command: "npm install" }, undefined);
      expect(result.allowed).toBe(false);
      expect(result.needsApproval).toBe(true);
    });

    it("does not match when pattern glob differs", () => {
      const { gate } = makeGate();
      gate.setTopLevelRules({ allow: ["write_file(*.ts)"], deny: [], ask: [] });
      const match = gate.checkTool("write_file", "write", { filePath: "/a/b.ts" }, undefined);
      expect(match.allowed).toBe(true);
      // No rule match → falls through to risk default (approval_required for write)
      const noMatch = gate.checkTool("write_file", "write", { filePath: "/a/b.js" }, undefined);
      expect(noMatch.allowed).toBe(false);
      expect(noMatch.needsApproval).toBe(true);
    });
  });

  describe("checkMaxTokens", () => {
    it("returns true when no maxTokens set", () => {
      const { gate } = makeGate();
      expect(gate.checkMaxTokens(100, 200, undefined)).toBe(true);
    });

    it("returns true when under limit", () => {
      const { gate } = makeGate();
      const agent = makeAgent({ permissions: { maxTokens: 1000 } });
      expect(gate.checkMaxTokens(300, 200, agent)).toBe(true);
    });

    it("returns false when over limit", () => {
      const { gate } = makeGate();
      const agent = makeAgent({ permissions: { maxTokens: 1000 } });
      expect(gate.checkMaxTokens(800, 300, agent)).toBe(false);
    });

    it("returns true when exactly at limit", () => {
      const { gate } = makeGate();
      const agent = makeAgent({ permissions: { maxTokens: 1000 } });
      expect(gate.checkMaxTokens(500, 500, agent)).toBe(true);
    });
  });

  describe("checkMaxSteps", () => {
    it("returns true when no maxSteps set", () => {
      const { gate } = makeGate();
      expect(gate.checkMaxSteps(5, undefined)).toBe(true);
    });

    it("returns true when under limit", () => {
      const { gate } = makeGate();
      const agent = makeAgent({ permissions: { maxSteps: 10 } });
      expect(gate.checkMaxSteps(5, agent)).toBe(true);
    });

    it("returns false when at limit", () => {
      const { gate } = makeGate();
      const agent = makeAgent({ permissions: { maxSteps: 10 } });
      expect(gate.checkMaxSteps(10, agent)).toBe(false);
    });

    it("returns false when over limit", () => {
      const { gate } = makeGate();
      const agent = makeAgent({ permissions: { maxSteps: 10 } });
      expect(gate.checkMaxSteps(15, agent)).toBe(false);
    });
  });

  describe("checkSavedApproval", () => {
    it("returns false when no approval store", () => {
      const gate = new PermissionGate({
        store: new FakeRunEventStore() as never,
        pluginManager: undefined,
        approvalStore: undefined,
      });
      expect(gate.checkSavedApproval("read_file", "agent-1")).toBe(false);
    });

    it("returns false when no matching saved approval", () => {
      const { gate, approvalStore } = makeGate();
      approvalStore.saveApproval({ resource: "tool.read_file", action: "read_file", agentId: "agent-1" });
      expect(gate.checkSavedApproval("write_file", "agent-1")).toBe(false);
    });

    it("returns true when matching saved approval", () => {
      const { gate, approvalStore } = makeGate();
      approvalStore.saveApproval({ resource: "tool.read_file", action: "read_file", agentId: "agent-1" });
      expect(gate.checkSavedApproval("read_file", "agent-1")).toBe(true);
    });

    it("returns true for saved approval without agentId", () => {
      const { gate, approvalStore } = makeGate();
      approvalStore.saveApproval({ resource: "tool.read_file", action: "read_file" });
      expect(gate.checkSavedApproval("read_file", "agent-1")).toBe(true);
    });

    it("ignores saved approval for different agent", () => {
      const { gate, approvalStore } = makeGate();
      approvalStore.saveApproval({ resource: "tool.read_file", action: "read_file", agentId: "agent-1" });
      expect(gate.checkSavedApproval("read_file", "agent-2")).toBe(false);
    });
  });

  describe("saveApproval", () => {
    it("saves approval to approval store", () => {
      const { gate, approvalStore } = makeGate();
      gate.saveApproval("read_file", "agent-1");
      expect(approvalStore.savedApprovals).toHaveLength(1);
      expect(approvalStore.savedApprovals[0]).toMatchObject({
        resource: "tool.read_file",
        action: "read_file",
        agentId: "agent-1",
      });
    });

    it("saves approval without agentId", () => {
      const { gate, approvalStore } = makeGate();
      gate.saveApproval("read_file");
      expect(approvalStore.savedApprovals[0]!.agentId).toBeUndefined();
    });

    it("does nothing when no approval store", () => {
      const gate = new PermissionGate({
        store: new FakeRunEventStore() as never,
        pluginManager: undefined,
        approvalStore: undefined,
      });
      expect(() => gate.saveApproval("read_file")).not.toThrow();
    });
  });

  describe("askForTool", () => {
    it("asks via approval store when no permission service", async () => {
      const { gate, approvalStore } = makeGate();
      approvalStore.queueReply("once");
      const result = await gate.askForTool("read_file", "tc-1", "run-1" as RunId, "sess-1", "need reason", "agent-1", "trace-1");
      expect(result).toBe("once");
      expect(approvalStore.requests).toHaveLength(1);
      expect(approvalStore.requests[0]).toMatchObject({
        toolName: "read_file",
        reason: "need reason",
      });
    });

    it("returns reject from approval store", async () => {
      const { gate, approvalStore } = makeGate();
      approvalStore.queueReply("reject");
      const result = await gate.askForTool("read_file", "tc-1", "run-1" as RunId, "sess-1", "no", "agent-1", "trace-1");
      expect(result).toBe("reject");
    });

    it("emits permission.requested and permission.replied events via approval store", async () => {
      const { gate, approvalStore, store } = makeGate();
      approvalStore.queueReply("once");
      await gate.askForTool("read_file", "tc-1", "run-1" as RunId, "sess-1", "testing", "agent-1", "trace-1");
      const events = await store.list("run-1");
      const types = events.map((e) => e.type);
      expect(types).toContain("permission.requested");
      expect(types).toContain("permission.replied");
    });

    it("persists savePatterns as allow rules on 'always' without opening the whole tool", async () => {
      const { gate, approvalStore } = makeGate();
      approvalStore.queueReply("always");
      const reply = await gate.askForTool(
        "execute_command", "tc-1", "run-1" as RunId, "sess-1", "run npm install",
        "agent-1", "trace-1", undefined, ["npm install *"],
      );
      expect(reply).toBe("always");

      // Pattern cover a matching command...
      const matching = gate.checkTool("execute_command", "write", { command: "npm install express" }, undefined);
      expect(matching.allowed).toBe(true);
      // ...but not a different command.
      const other = gate.checkTool("execute_command", "write", { command: "git status" }, undefined);
      expect(other.allowed).toBe(false);
      expect(other.needsApproval).toBe(true);
    });

    it("persists multiple savePatterns on 'always'", async () => {
      const { gate, approvalStore } = makeGate();
      approvalStore.queueReply("always");
      await gate.askForTool(
        "execute_command", "tc-1", "run-1" as RunId, "sess-1", "install deps",
        "agent-1", "trace-1", undefined, ["npm install *", "pnpm install *"],
      );
      expect(gate.checkTool("execute_command", "write", { command: "npm install lodash" }, undefined).allowed).toBe(true);
      expect(gate.checkTool("execute_command", "write", { command: "pnpm install lodash" }, undefined).allowed).toBe(true);
      expect(gate.checkTool("execute_command", "write", { command: "rm -rf node_modules" }, undefined).allowed).toBe(false);
    });

    it("does NOT persist savePatterns on 'once'", async () => {
      const { gate, approvalStore } = makeGate();
      approvalStore.queueReply("once");
      await gate.askForTool(
        "execute_command", "tc-1", "run-1" as RunId, "sess-1", "run once",
        "agent-1", "trace-1", undefined, ["npm install *"],
      );
      expect(gate.checkTool("execute_command", "write", { command: "npm install express" }, undefined).allowed).toBe(false);
    });

    it("ignores empty or wildcard savePatterns", async () => {
      const { gate, approvalStore } = makeGate();
      approvalStore.queueReply("always");
      await gate.askForTool(
        "execute_command", "tc-1", "run-1" as RunId, "sess-1", "install",
        "agent-1", "trace-1", undefined, ["", "*"],
      );
      expect(gate.getDynamicRules()).toHaveLength(0);
    });
  });

  describe("rejection cascade", () => {
    it("saveRejection persists and checkSavedApproval returns false for rejected tool", () => {
      const { gate, approvalStore } = makeGate();
      gate.saveRejection("shell_tool", "agent-1");
      expect(approvalStore.checkRejection("tool.shell_tool", "shell_tool", "agent-1")).toBe(true);
      expect(gate.checkSavedApproval("shell_tool", "agent-1")).toBe(false);
    });

    it("rejected tool auto-denied even without explicit re-check", () => {
      const { gate, approvalStore } = makeGate();
      gate.saveRejection("write_file");
      expect(gate.checkSavedApproval("write_file")).toBe(false);
      expect(gate.checkSavedApproval("write_file", "any-agent")).toBe(false);
    });

    it("approval and rejection are independent per agentId", () => {
      const { gate, approvalStore } = makeGate();
      gate.saveApproval("read_file", "agent-1");
      gate.saveRejection("read_file", "agent-2");
      expect(gate.checkSavedApproval("read_file", "agent-1")).toBe(true);
      expect(gate.checkSavedApproval("read_file", "agent-2")).toBe(false);
    });
  });

  describe("RV-35: arg-scoped saved approval", () => {
    it("saving approval with args stores a scoped resource pattern", () => {
      const { gate, approvalStore } = makeGate();
      gate.saveApproval("read_file", { filePath: "/tmp/a.txt" }, "agent-1");
      expect(approvalStore.savedApprovals[0]).toMatchObject({
        resource: "tool.read_file(/tmp/a.txt)",
        action: "read_file",
        agentId: "agent-1",
      });
    });

    it("approving one arg does NOT auto-approve a different arg", () => {
      const { gate, approvalStore } = makeGate();
      gate.saveApproval("read_file", { filePath: "/tmp/a.txt" }, "agent-1");
      expect(gate.checkSavedApproval("read_file", { filePath: "/tmp/a.txt" }, "agent-1")).toBe(true);
      expect(gate.checkSavedApproval("read_file", { filePath: "/tmp/b.txt" }, "agent-1")).toBe(false);
    });

    it("scoped approval matches via glob pattern", () => {
      const { gate, approvalStore } = makeGate();
      approvalStore.saveApproval({ resource: "tool.read_file(/tmp/*)", action: "read_file", agentId: "agent-1" });
      expect(gate.checkSavedApproval("read_file", { filePath: "/tmp/a.txt" }, "agent-1")).toBe(true);
      expect(gate.checkSavedApproval("read_file", { filePath: "/etc/passwd" }, "agent-1")).toBe(false);
    });

    it("scoped approval does not leak across tools", () => {
      const { gate, approvalStore } = makeGate();
      gate.saveApproval("read_file", { filePath: "/tmp/a.txt" }, "agent-1");
      expect(gate.checkSavedApproval("write_file", { filePath: "/tmp/a.txt" }, "agent-1")).toBe(false);
    });

    it("whole-tool approval still covers any args (backward compat)", () => {
      const { gate, approvalStore } = makeGate();
      approvalStore.saveApproval({ resource: "tool.read_file", action: "read_file", agentId: "agent-1" });
      expect(gate.checkSavedApproval("read_file", { filePath: "/tmp/a.txt" }, "agent-1")).toBe(true);
    });

    it("scoped rejection blocks matching call but not others", () => {
      const { gate, approvalStore } = makeGate();
      gate.saveApproval("read_file", { filePath: "/tmp/ok.txt" }, "agent-1");
      gate.saveRejection("read_file", { filePath: "/tmp/secret.txt" }, "agent-1");
      expect(gate.checkSavedApproval("read_file", { filePath: "/tmp/secret.txt" }, "agent-1")).toBe(false);
      expect(gate.checkSavedApproval("read_file", { filePath: "/tmp/ok.txt" }, "agent-1")).toBe(true);
    });

    it("scoped approval does not resurrect a whole-tool rejection", () => {
      const { gate, approvalStore } = makeGate();
      gate.saveRejection("read_file", "agent-1");
      gate.saveApproval("read_file", { filePath: "/tmp/a.txt" }, "agent-1");
      expect(gate.checkSavedApproval("read_file", { filePath: "/tmp/a.txt" }, "agent-1")).toBe(false);
    });
  });
});

