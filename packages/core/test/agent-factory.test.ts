import { describe, it, expect } from "vitest";
import { createAgent, createSubAgent, validateAgentConfig } from "../src/agent/agent-factory.js";
import type { AgentConfig, AgentPermissions } from "@vinhnt-sdk/core";

const validProfile = { name: "Test Agent", description: "A test agent" };

describe("createAgent", () => {
  it("creates agent with required fields", () => {
    const agent = createAgent({ profile: validProfile });
    expect(agent.profile.name).toBe("Test Agent");
    expect(agent.profile.description).toBe("A test agent");
    expect(agent.id).toMatch(/^agent_/);
    expect(agent.capabilities.streaming).toBe(true);
    expect(agent.capabilities.thinking).toBe(false);
    expect(agent.permissions?.mode).toBe("primary");
  });

  it("throws when name is missing", () => {
    expect(() => createAgent({ profile: { name: "", description: "desc" } })).toThrow("Agent name is required");
  });

  it("throws when description is missing", () => {
    expect(() => createAgent({ profile: { name: "x", description: "" } })).toThrow("Agent description is required");
  });

  it("accepts custom id", () => {
    const agent = createAgent({ id: "custom-id" as never, profile: validProfile });
    expect(agent.id).toBe("custom-id");
  });

  it("merges capabilities", () => {
    const agent = createAgent({ profile: validProfile, capabilities: { thinking: true } });
    expect(agent.capabilities.thinking).toBe(true);
    expect(agent.capabilities.streaming).toBe(true);
  });

  it("passes system prompt and temperature", () => {
    const agent = createAgent({ profile: validProfile, systemPrompt: "Be helpful", temperature: 0.5 });
    expect(agent.systemPrompt).toBe("Be helpful");
    expect(agent.temperature).toBe(0.5);
  });

  it("sets mode from permissions", () => {
    const agent = createAgent({ profile: validProfile, permissions: { mode: "subagent" } });
    expect(agent.permissions?.mode).toBe("subagent");
  });

  it("overrides permissions with provided fields", () => {
    const agent = createAgent({
      profile: validProfile,
      permissions: { mode: "subagent", allowedTools: ["read"], maxSteps: 10 },
    });
    expect(agent.permissions?.allowedTools).toEqual(["read"]);
    expect(agent.permissions?.maxSteps).toBe(10);
  });
});

describe("createSubAgent", () => {
  const parent: AgentConfig = createAgent({
    profile: { name: "Parent", description: "Parent agent" },
    permissions: { mode: "primary", allowedTools: ["read", "write"], deniedTools: ["rm"], maxSteps: 20, maxTokens: 5000 },
  });

  it("creates sub-agent inheriting parent properties", () => {
    const sub = createSubAgent({ profile: { name: "Child", description: "Child agent" } }, parent);
    expect(sub.profile.name).toBe("Child");
    expect(sub.id).toMatch(/^agent_/);
  });

  it("inherits capabilities from parent", () => {
    const sub = createSubAgent({ profile: { name: "Child", description: "desc" } }, parent);
    expect(sub.capabilities.streaming).toBe(true);
  });

  it("inherits version and author from parent profile", () => {
    const parentWithMeta = createAgent({
      profile: { ...validProfile, version: "1.0", author: "tester" },
    });
    const sub = createSubAgent({ profile: { name: "Child", description: "desc" } }, parentWithMeta);
    expect(sub.profile.version).toBe("1.0");
    expect(sub.profile.author).toBe("tester");
  });

  it("child allowedTools overrides parent", () => {
    const sub = createSubAgent(
      { profile: { name: "Child", description: "desc" }, permissions: { allowedTools: ["chat"] } },
      parent,
    );
    expect(sub.permissions?.allowedTools).toEqual(["chat"]);
  });

  it("child deniedTools appends to parent deniedTools", () => {
    const sub = createSubAgent(
      { profile: { name: "Child", description: "desc" }, permissions: { deniedTools: ["exec"] } },
      parent,
    );
    expect(sub.permissions?.deniedTools).toContain("rm");
    expect(sub.permissions?.deniedTools).toContain("exec");
  });

  it("inherits parent maxSteps capped by Math.min", () => {
    const sub = createSubAgent(
      { profile: { name: "Child", description: "desc" }, permissions: { maxSteps: 30 } },
      parent,
    );
    expect(sub.permissions?.maxSteps).toBe(20); // parent limit is lower
  });

  it("inherits parent maxTokens capped by Math.min", () => {
    const sub = createSubAgent(
      { profile: { name: "Child", description: "desc" }, permissions: { maxTokens: 10000 } },
      parent,
    );
    expect(sub.permissions?.maxTokens).toBe(5000); // parent limit is lower
  });

  it("child can request stricter limits than parent", () => {
    const sub = createSubAgent(
      { profile: { name: "Child", description: "desc" }, permissions: { maxSteps: 5 } },
      parent,
    );
    expect(sub.permissions?.maxSteps).toBe(5);
  });

  it("sets mode to subagent by default", () => {
    const sub = createSubAgent({ profile: { name: "Child", description: "desc" } }, parent);
    expect(sub.permissions?.mode).toBe("subagent");
  });

  it("throws when sub-agent name is missing", () => {
    expect(() => createSubAgent({ profile: { name: "", description: "desc" } }, parent)).toThrow("Sub-agent name is required");
  });

  it("throws when sub-agent description is missing", () => {
    expect(() => createSubAgent({ profile: { name: "x", description: "" } }, parent)).toThrow("Sub-agent description is required");
  });

  it("child systemPrompt overrides", () => {
    const sub = createSubAgent(
      { profile: { name: "Child", description: "desc" }, systemPrompt: "Child prompt" },
      parent,
    );
    expect(sub.systemPrompt).toBe("Child prompt");
  });
});

describe("validateAgentConfig", () => {
  it("returns empty errors for valid config", () => {
    const agent = createAgent({ profile: validProfile });
    expect(validateAgentConfig(agent)).toEqual([]);
  });

  it("reports missing id", () => {
    const errors = validateAgentConfig({} as AgentConfig);
    expect(errors).toContain("Agent id is required");
  });

  it("reports missing profile.name", () => {
    const errors = validateAgentConfig({ id: "a1" as never } as AgentConfig);
    expect(errors).toContain("Agent profile.name is required");
  });

  it("reports missing profile.description", () => {
    const errors = validateAgentConfig({ id: "a1", profile: { name: "x" } } as AgentConfig);
    expect(errors).toContain("Agent profile.description is required");
  });

  it("reports invalid mode", () => {
    const agent = createAgent({ profile: validProfile, permissions: { mode: "invalid" as never } });
    const errors = validateAgentConfig(agent);
    expect(errors.some((e) => e.includes("Invalid mode"))).toBe(true);
  });

  it("reports invalid rule effect", () => {
    const agent = createAgent({
      profile: validProfile,
      permissions: {
        mode: "primary",
        ruleset: { rules: [{ effect: "invalid" as never, target: "bash" }] },
      } as AgentPermissions,
    });
    const errors = validateAgentConfig(agent);
    expect(errors.some((e) => e.includes("effect must be"))).toBe(true);
  });

  it("reports missing rule target", () => {
    const agent = createAgent({
      profile: validProfile,
      permissions: {
        mode: "primary",
        ruleset: { rules: [{ effect: "allow" as never, target: "" }] },
      } as AgentPermissions,
    });
    const errors = validateAgentConfig(agent);
    expect(errors.some((e) => e.includes("target is required"))).toBe(true);
  });

  it("validates ruleset rules", () => {
    const agent = createAgent({
      profile: validProfile,
      permissions: {
        mode: "primary",
        ruleset: { rules: [{ effect: "allow", target: "read" }] },
      } as AgentPermissions,
    });
    expect(validateAgentConfig(agent)).toEqual([]);
  });
});

describe("createSubAgent with ruleset inheritance", () => {
  it("inherits ruleset from parent", () => {
    const parent = createAgent({
      profile: validProfile,
      permissions: { mode: "primary", ruleset: { rules: [{ effect: "allow", target: "read" }] } } as AgentPermissions,
    });
    const sub = createSubAgent({ profile: { name: "Child", description: "desc" } }, parent);
    expect(sub.permissions?.ruleset).toBeDefined();
  });
});
