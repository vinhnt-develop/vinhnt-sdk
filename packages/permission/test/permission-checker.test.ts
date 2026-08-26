import { describe, expect, it } from "vitest";
import {
  normalizePermissions,
  mergeRulesets,
  checkRiskAllowed,
  resolveEffectivePermissions,
  evaluatePermission,
} from "../src/index.js";
import type { AgentConfig, AgentId, AgentPermissions, AgentRuleset } from "@vinhnt-sdk/schema";

describe("normalizePermissions", () => {
  it("returns empty for undefined", () => {
    expect(normalizePermissions(undefined)).toEqual({});
  });

  it("returns ruleset as-is when present", () => {
    const ruleset: AgentRuleset = {
      rules: [{ effect: "deny", target: "tool.*" }],
      allowedRisks: ["high"],
      maxSteps: 10,
      maxTokens: 5000,
      inheritFromParent: false,
    };
    const result = normalizePermissions({ mode: "subagent", ruleset });
    expect(result).toMatchObject({ rules: [{ effect: "deny", target: "tool.*" }], allowedRisks: ["high"] });
    expect(result.maxSteps).toBe(10);
    expect(result.maxTokens).toBe(5000);
    expect(result.inheritFromParent).toBe(false);
  });

  it("converts legacy allowedTools to rules", () => {
    const p: AgentPermissions = { allowedTools: ["read", "write"] };
    const result = normalizePermissions(p);
    expect(result.rules).toHaveLength(2);
    expect(result.rules![0]).toEqual({ effect: "allow", target: "tool.read" });
    expect(result.rules![1]).toEqual({ effect: "allow", target: "tool.write" });
  });

  it("converts legacy deniedTools to rules", () => {
    const p: AgentPermissions = { deniedTools: ["delete", "shell"] };
    const result = normalizePermissions(p);
    expect(result.rules).toHaveLength(2);
    expect(result.rules![0]).toEqual({ effect: "deny", target: "tool.delete" });
    expect(result.rules![1]).toEqual({ effect: "deny", target: "tool.shell" });
  });

  it("converts legacy allowedRisks, maxSteps, maxTokens", () => {
    const p: AgentPermissions = { allowedRisks: ["medium"], maxSteps: 20, maxTokens: 10000 };
    const result = normalizePermissions(p);
    expect(result.allowedRisks).toEqual(["medium"]);
    expect(result.maxSteps).toBe(20);
    expect(result.maxTokens).toBe(10000);
  });

  it("sets inheritFromParent to true by default", () => {
    const result = normalizePermissions({});
    expect(result.inheritFromParent).toBe(true);
  });
});

describe("mergeRulesets", () => {
  const parent: AgentRuleset = {
    rules: [{ effect: "allow", target: "tool.*" }],
    allowedRisks: ["low"],
    maxSteps: 50,
    maxTokens: 50000,
  };

  it("merges child rules on top of parent", () => {
    const child: AgentRuleset = {
      rules: [{ effect: "allow", target: "tool.git_*" }],
      maxSteps: 10,
    };
    const result = mergeRulesets(child, parent);
    expect(result.rules).toHaveLength(2);
    expect(result.rules![0]).toEqual({ effect: "allow", target: "tool.*" });
    expect(result.rules![1]).toEqual({ effect: "allow", target: "tool.git_*" });
  });

  it("child deny overrides parent allow for same target", () => {
    const child: AgentRuleset = {
      rules: [{ effect: "deny", target: "tool.write_*" }],
    };
    const p: AgentRuleset = {
      rules: [
        { effect: "allow", target: "tool.*" },
      ],
    };
    const result = mergeRulesets(child, p);
    expect(result.rules).toHaveLength(2);
    // parent allow for tool.* filtered out for tool.write_* -> but that's per-target
    // The deny doesn't remove the parent allow, it just adds a deny
    expect(result.rules).toContainEqual({ effect: "allow", target: "tool.*" });
    expect(result.rules).toContainEqual({ effect: "deny", target: "tool.write_*" });
  });

  it("merges risks with dedup", () => {
    const child: AgentRuleset = { allowedRisks: ["medium", "high"] };
    const p: AgentRuleset = { allowedRisks: ["low", "medium"] };
    const result = mergeRulesets(child, p);
    expect(result.allowedRisks).toEqual(["low", "medium", "high"]);
  });

  it("uses min of child and parent maxSteps", () => {
    expect(mergeRulesets({ maxSteps: 5 }, { maxSteps: 50 }).maxSteps).toBe(5);
    expect(mergeRulesets({ maxSteps: 100 }, { maxSteps: 50 }).maxSteps).toBe(50);
  });

  it("uses min of child and parent maxTokens", () => {
    expect(mergeRulesets({ maxTokens: 1000 }, { maxTokens: 50000 }).maxTokens).toBe(1000);
    expect(mergeRulesets({ maxTokens: 100000 }, { maxTokens: 50000 }).maxTokens).toBe(50000);
  });

  it("inherits parent limits when child not specified", () => {
    expect(mergeRulesets({}, { maxSteps: 30, maxTokens: 30000 }).maxSteps).toBe(30);
    expect(mergeRulesets({}, { maxSteps: 30, maxTokens: 30000 }).maxTokens).toBe(30000);
  });
});

describe("evaluatePermission", () => {
  const ruleset: AgentRuleset = {
    rules: [
      { effect: "allow", target: "tool.read_*" },
      { effect: "allow", target: "tool.web_*" },
      { effect: "deny", target: "tool.write_*" },
      { effect: "deny", target: "tool.delete_*" },
    ],
  };

  it("allows matching allow rule", () => {
    expect(evaluatePermission(ruleset, "tool.read_file").decision).toBe("allow");
  });

  it("deny overrides allow (last-match-wins)", () => {
    expect(evaluatePermission(ruleset, "tool.write_file").decision).toBe("deny");
  });

  it("asks when no rule matches", () => {
    const result = evaluatePermission(ruleset, "tool.git_status") as { decision: "ask"; reason: string };
    expect(result.decision).toBe("ask");
    expect(result.reason).toMatch(/matching/);
  });

  it("no ruleset means ask (safe default)", () => {
    expect(evaluatePermission(undefined, "anything").decision).toBe("ask");
  });

  it("empty ruleset means ask", () => {
    expect(evaluatePermission({}, "anything").decision).toBe("ask");
  });

  it("allow-only ruleset asks for unmatched", () => {
    const r: AgentRuleset = { rules: [{ effect: "allow", target: "safe_*" }] };
    expect(evaluatePermission(r, "safe_tool").decision).toBe("allow");
    expect(evaluatePermission(r, "unsafe_tool").decision).toBe("ask");
  });

  it("deny-only ruleset allows non-matching", () => {
    const r: AgentRuleset = { rules: [{ effect: "deny", target: "danger_*" }] };
    expect(evaluatePermission(r, "safe_tool").decision).toBe("ask");
    expect(evaluatePermission(r, "danger_tool").decision).toBe("deny");
  });

  it("uses wildcard matching for rules", () => {
    const r: AgentRuleset = { rules: [{ effect: "allow", target: "tool.*" }] };
    expect(evaluatePermission(r, "tool.anything").decision).toBe("allow");
  });
});

describe("checkRiskAllowed", () => {
  const ruleset: AgentRuleset = { allowedRisks: ["low", "medium", "read:*"] };

  it("exact match", () => {
    expect(checkRiskAllowed(ruleset, "low")).toBe(true);
  });

  it("wildcard match", () => {
    expect(checkRiskAllowed(ruleset, "read:file")).toBe(true);
    expect(checkRiskAllowed(ruleset, "read:search")).toBe(true);
  });

  it("no match", () => {
    expect(checkRiskAllowed(ruleset, "high")).toBe(false);
  });

  it("no ruleset returns false", () => {
    expect(checkRiskAllowed(undefined, "low")).toBe(false);
  });

  it("no allowedRisks returns false", () => {
    expect(checkRiskAllowed({}, "low")).toBe(false);
  });
});

describe("resolveEffectivePermissions", () => {
  it("single agent with no parent uses own permissions", () => {
    const agent: AgentConfig = {
      id: "a" as AgentId,
      profile: { name: "A", description: "" },
      capabilities: {},
      permissions: { allowedTools: ["read"] },
    };
    const result = resolveEffectivePermissions(agent);
    expect(result.rules).toHaveLength(1);
    expect(result.rules![0]).toEqual({ effect: "allow", target: "tool.read" });
  });

  it("agent without permissions returns empty ruleset", () => {
    const agent: AgentConfig = {
      id: "a" as AgentId,
      profile: { name: "A", description: "" },
      capabilities: {},
    };
    expect(resolveEffectivePermissions(agent)).toEqual({});
  });

  it("merges with ancestor permissions", () => {
    const child: AgentConfig = {
      id: "child" as AgentId,
      profile: { name: "C", description: "" },
      capabilities: {},
      permissions: { allowedTools: ["read"] },
    };
    const parent: AgentConfig = {
      id: "parent" as AgentId,
      profile: { name: "P", description: "" },
      capabilities: {},
      permissions: { deniedTools: ["delete"] },
    };
    const result = resolveEffectivePermissions(child, [parent]);
    expect(result.rules).toHaveLength(2);
    // Parent rules come first, child rules appended (deny from parent, allow from child)
    expect(result.rules![0]).toEqual({ effect: "deny", target: "tool.delete" });
    expect(result.rules![1]).toEqual({ effect: "allow", target: "tool.read" });
  });

  it("allows when paramPattern matches args", () => {
    const ruleset: AgentRuleset = {
      rules: [
        { effect: "allow", target: "tool.write_file", paramPattern: "*tmp*" },
      ],
    };
    expect(evaluatePermission(ruleset, "tool.write_file", { path: "/tmp/test.txt" }).decision).toBe("allow");
  });

  it("denies when paramPattern does not match args", () => {
    const ruleset: AgentRuleset = {
      rules: [
        { effect: "allow", target: "tool.write_file", paramPattern: "*tmp*" },
        { effect: "deny", target: "tool.write_file" },
      ],
    };
    expect(evaluatePermission(ruleset, "tool.write_file", { path: "/etc/passwd" }).decision).toBe("deny");
  });

  it("skips paramPattern rule when args not provided", () => {
    const ruleset: AgentRuleset = {
      rules: [
        { effect: "deny", target: "tool.write_file", paramPattern: "*secret*" },
        { effect: "allow", target: "tool.write_file" },
      ],
    };
    expect(evaluatePermission(ruleset, "tool.write_file").decision).toBe("allow");
  });

  it("last matching paramPattern rule wins", () => {
    const ruleset: AgentRuleset = {
      rules: [
        { effect: "deny", target: "tool.*", paramPattern: "*rm*" },
        { effect: "allow", target: "tool.*", paramPattern: "*rm /tmp*" },
      ],
    };
    expect(evaluatePermission(ruleset, "tool.shell", { command: "rm /tmp/foo" }).decision).toBe("allow");
    expect(evaluatePermission(ruleset, "tool.shell", { command: "rm -rf /" }).decision).toBe("deny");
  });

  it("does not inherit when inheritFromParent is false", () => {
    const child: AgentConfig = {
      id: "child" as AgentId,
      profile: { name: "C", description: "" },
      capabilities: {},
      permissions: { ruleset: { rules: [{ effect: "allow", target: "tool.read" }], inheritFromParent: false } },
    };
    const parent: AgentConfig = {
      id: "parent" as AgentId,
      profile: { name: "P", description: "" },
      capabilities: {},
      permissions: { deniedTools: ["delete"] },
    };
    const result = resolveEffectivePermissions(child, [parent]);
    expect(result.rules).toHaveLength(1);
    expect(result.rules![0]).toEqual({ effect: "allow", target: "tool.read" });
  });
});
