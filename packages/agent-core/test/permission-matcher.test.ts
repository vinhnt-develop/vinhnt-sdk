import { describe, it, expect } from "vitest";
import { matchPermission, buildPermissionRules } from "../src/permission/evaluator.js";
import type { PermissionRule } from "../src/permission/permission.js";

describe("matchPermission", () => {
  it("returns ask for empty rules", () => {
    expect(matchPermission([], "bash.run")).toEqual({ effect: "ask" });
  });

  it("matches exact action", () => {
    const rules: PermissionRule[] = [
      { action: "bash.run", resource: "*", effect: "allow" },
    ];
    expect(matchPermission(rules, "bash.run").effect).toBe("allow");
  });

  it("last-match-wins: later override overrides earlier", () => {
    const rules: PermissionRule[] = [
      { action: "bash.*", resource: "*", effect: "deny" },
      { action: "bash.run", resource: "*", effect: "allow" },
    ];
    expect(matchPermission(rules, "bash.run").effect).toBe("allow");
  });

  it("last-match-wins: deny overrides earlier allow", () => {
    const rules: PermissionRule[] = [
      { action: "*", resource: "*", effect: "allow" },
      { action: "rm", resource: "*", effect: "deny" },
    ];
    expect(matchPermission(rules, "rm").effect).toBe("deny");
  });

  it("matches wildcard pattern", () => {
    const rules: PermissionRule[] = [
      { action: "bash.*", resource: "*", effect: "allow" },
    ];
    expect(matchPermission(rules, "bash.run").effect).toBe("allow");
    expect(matchPermission(rules, "bash.status").effect).toBe("allow");
  });

  it("does not match non-matching action", () => {
    const rules: PermissionRule[] = [
      { action: "git.*", resource: "*", effect: "allow" },
    ];
    expect(matchPermission(rules, "bash.run").effect).toBe("ask");
  });

  it("matches with paramPattern context", () => {
    const rules: PermissionRule[] = [
      { action: "read", resource: "*", effect: "deny", paramPattern: "*.env" },
    ];
    expect(matchPermission(rules, "read", ".env").effect).toBe("deny");
    expect(matchPermission(rules, "read", "main.ts").effect).toBe("ask");
  });

  it("returns matchedRule on match", () => {
    const rules: PermissionRule[] = [
      { action: "test", resource: "*", effect: "allow" },
    ];
    const result = matchPermission(rules, "test");
    expect(result.matchedRule).toBeDefined();
    expect(result.matchedRule!.effect).toBe("allow");
  });

  it("does not return matchedRule when no match", () => {
    expect(matchPermission([], "test").matchedRule).toBeUndefined();
  });

  it("matches dot-separated nested action context", () => {
    const rules: PermissionRule[] = [
      { action: "bash.git*", resource: "*", effect: "allow" },
    ];
    expect(matchPermission(rules, "bash", "git diff").effect).toBe("allow");
    expect(matchPermission(rules, "bash", "rm -rf").effect).toBe("ask");
  });

  it("matches with paramPattern in nested context", () => {
    const rules: PermissionRule[] = [
      { action: "bash.rm*", resource: "*", effect: "deny", paramPattern: "*/*" },
    ];
    expect(matchPermission(rules, "bash", "rm -rf /tmp").effect).toBe("deny");
    expect(matchPermission(rules, "bash", "echo hi").effect).toBe("ask");
  });
});

describe("buildPermissionRules", () => {
  it("parses flat syntax: edit: deny", () => {
    const rules = buildPermissionRules({ edit: "deny" });
    expect(rules).toHaveLength(1);
    expect(rules[0]!.action).toBe("edit");
    expect(rules[0]!.effect).toBe("deny");
  });

  it("parses nested syntax: bash: { \"*\": \"ask\" }", () => {
    const rules = buildPermissionRules({ bash: { "*": "ask" } });
    expect(rules).toHaveLength(1);
    expect(rules[0]!.action).toBe("bash");
    expect(rules[0]!.effect).toBe("ask");
  });

  it("parses nested syntax with specific patterns", () => {
    const rules = buildPermissionRules({
      bash: { "git *": "allow", "rm *": "deny" },
    });
    expect(rules).toHaveLength(2);
    expect(rules[0]!.action).toBe("bash.git *");
    expect(rules[0]!.effect).toBe("allow");
    expect(rules[1]!.action).toBe("bash.rm *");
    expect(rules[1]!.effect).toBe("deny");
  });

  it("handles mixed flat and nested syntax", () => {
    const rules = buildPermissionRules({
      edit: "allow",
      bash: { "rm *": "deny" },
    });
    expect(rules).toHaveLength(2);
    expect(rules[0]!.action).toBe("edit");
    expect(rules[0]!.effect).toBe("allow");
    expect(rules[1]!.action).toBe("bash.rm *");
    expect(rules[1]!.effect).toBe("deny");
  });

  it("handles empty config", () => {
    const rules = buildPermissionRules({});
    expect(rules).toEqual([]);
  });
});
