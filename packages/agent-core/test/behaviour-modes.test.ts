import { describe, it, expect } from "vitest";
import { getBehaviourProfile, applyBehaviourProfile } from "../src/agent/behaviour-profiles.js";
import type { AgentRule } from "@vinhnt-sdk/schema";

describe("Behaviour Profiles", () => {
  it("returns build profile for 'build' mode", () => {
    const profile = getBehaviourProfile("build");
    expect(profile.label).toBe("Build");
    expect(profile.icon).toBe("hammer");
    expect(profile.rules.length).toBeGreaterThan(0);
  });

  it("returns plan profile for 'plan' mode", () => {
    const profile = getBehaviourProfile("plan");
    expect(profile.label).toBe("Plan");
    expect(profile.icon).toBe("clipboard");
    expect(profile.rules.length).toBeGreaterThan(0);
  });

  it("build profile allows all tools", () => {
    const profile = getBehaviourProfile("build");
    const allRule = profile.rules.find((r) => r.target === "tool.*");
    expect(allRule).toBeDefined();
    expect(allRule!.effect).toBe("allow");
  });

  it("plan profile denies all tools after allowing read-only ones", () => {
    const profile = getBehaviourProfile("plan");
    const denyAll = profile.rules.find((r) => r.target === "tool.*" && r.effect === "deny");
    expect(denyAll).toBeDefined();
    expect(denyAll!.reason).toContain("read-only");
  });

  it("plan profile allows read_file", () => {
    const profile = getBehaviourProfile("plan");
    expect(profile.rules).toContainEqual(
      expect.objectContaining({ effect: "allow", target: "tool.read_file" }),
    );
  });

  it("plan profile allows glob_files", () => {
    const profile = getBehaviourProfile("plan");
    expect(profile.rules).toContainEqual(
      expect.objectContaining({ effect: "allow", target: "tool.glob_files" }),
    );
  });

  it("plan profile allows grep_files", () => {
    const profile = getBehaviourProfile("plan");
    expect(profile.rules).toContainEqual(
      expect.objectContaining({ effect: "allow", target: "tool.grep_files" }),
    );
  });

  it("plan profile allows lsp_* wildcard", () => {
    const profile = getBehaviourProfile("plan");
    expect(profile.rules).toContainEqual(
      expect.objectContaining({ effect: "allow", target: "tool.lsp_*" }),
    );
  });

  it("plan profile allows web_fetch", () => {
    const profile = getBehaviourProfile("plan");
    expect(profile.rules).toContainEqual(
      expect.objectContaining({ effect: "allow", target: "tool.web_fetch" }),
    );
  });

  it("plan profile allows question tool", () => {
    const profile = getBehaviourProfile("plan");
    expect(profile.rules).toContainEqual(
      expect.objectContaining({ effect: "allow", target: "tool.question" }),
    );
  });

  it("plan profile blocks write_file", () => {
    const profile = getBehaviourProfile("plan");
    const denyAll = profile.rules.find((r) => r.target === "tool.*" && r.effect === "deny")!;
    expect(denyAll).toBeDefined();
  });

  it("falls back to build for unknown mode", () => {
    const profile = getBehaviourProfile("unknown_mode" as any);
    expect(profile.label).toBe("Build");
  });

  it("falls back to build for undefined mode", () => {
    const profile = getBehaviourProfile(undefined as any);
    expect(profile.label).toBe("Build");
  });

  it("applyBehaviourProfile appends profile rules after base rules", () => {
    const base: AgentRule[] = [{ effect: "allow", target: "tool.custom" }];
    const profile = getBehaviourProfile("plan");
    const result = applyBehaviourProfile(base, profile);
    expect(result.length).toBe(base.length + profile.rules.length);
    expect(result[0]).toEqual(base[0]);
    expect(result[result.length - 1]).toEqual(profile.rules[profile.rules.length - 1]);
  });

  it("applyBehaviourProfile works with undefined base rules", () => {
    const profile = getBehaviourProfile("plan");
    const result = applyBehaviourProfile(undefined, profile);
    expect(result).toEqual(profile.rules);
  });
});
