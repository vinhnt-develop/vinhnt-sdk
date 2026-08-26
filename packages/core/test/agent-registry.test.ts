import { describe, expect, it } from "vitest";
import { FakeAgentRegistry } from "../src/fakes/fake-agent-registry.js";
import { InMemoryAgentRegistry } from "../src/agent/agent-registry.js";
import { createAgent, createSubAgent, validateAgentConfig } from "../src/agent/agent-factory.js";
import type { AgentId, AgentConfig } from "@vinhnt-sdk/core";

const testAgent: AgentConfig = {
  id: "agent-code-1" as AgentId,
  profile: { name: "Code Assistant", description: "Helps with code" },
  capabilities: { tools: ["read", "write"], streaming: true },
  systemPrompt: "You are a code assistant.",
};

const testAgent2: AgentConfig = {
  id: "agent-debug-1" as AgentId,
  profile: { name: "Debugger", description: "Helps debug code" },
  capabilities: { tools: ["read", "shell"], models: ["gpt-4"] },
  systemPrompt: "You are a debugger.",
};

describe("FakeAgentRegistry", () => {
  it("register and get an agent", async () => {
    const registry = new FakeAgentRegistry();
    await registry.register(testAgent);
    const result = await registry.get(testAgent.id);
    expect(result).toEqual(testAgent);
  });

  it("get returns null for unknown agent", async () => {
    const registry = new FakeAgentRegistry();
    const result = await registry.get("unknown" as AgentId);
    expect(result).toBeNull();
  });

  it("list returns all registered agents", async () => {
    const registry = new FakeAgentRegistry();
    await registry.register(testAgent);
    await registry.register(testAgent2);
    const list = await registry.list();
    expect(list).toHaveLength(2);
    expect(list).toContainEqual(testAgent);
    expect(list).toContainEqual(testAgent2);
  });

  it("list returns empty array when no agents registered", async () => {
    const registry = new FakeAgentRegistry();
    const list = await registry.list();
    expect(list).toEqual([]);
  });

  it("findByCapability filters agents by capability key-value", async () => {
    const registry = new FakeAgentRegistry();
    await registry.register(testAgent);
    await registry.register(testAgent2);
    const streamingAgents = await registry.findByCapability("streaming", true);
    expect(streamingAgents).toHaveLength(1);
    expect(streamingAgents[0]?.id).toBe(testAgent.id);
  });

  it("findByCapability returns empty when no match", async () => {
    const registry = new FakeAgentRegistry();
    await registry.register(testAgent);
    const result = await registry.findByCapability("nonexistent", true);
    expect(result).toEqual([]);
  });

  it("unregister removes an agent", async () => {
    const registry = new FakeAgentRegistry();
    await registry.register(testAgent);
    await registry.unregister(testAgent.id);
    const result = await registry.get(testAgent.id);
    expect(result).toBeNull();
  });

  it("unregister non-existent agent does not throw", async () => {
    const registry = new FakeAgentRegistry();
    await expect(registry.unregister("nonexistent" as AgentId)).resolves.toBeUndefined();
  });

  it("register with parentId creates parent-child relationship", async () => {
    const registry = new FakeAgentRegistry();
    await registry.register(testAgent);
    await registry.register(testAgent2, testAgent.id);
    const children = await registry.getChildren(testAgent.id);
    expect(children).toHaveLength(1);
    expect(children[0]?.id).toBe(testAgent2.id);
    const parent = await registry.getParent(testAgent2.id);
    expect(parent?.id).toBe(testAgent.id);
  });

  it("getChildren returns empty for agent with no children", async () => {
    const registry = new FakeAgentRegistry();
    await registry.register(testAgent);
    const children = await registry.getChildren(testAgent.id);
    expect(children).toEqual([]);
  });

  it("getParent returns null for top-level agent", async () => {
    const registry = new FakeAgentRegistry();
    await registry.register(testAgent);
    const parent = await registry.getParent(testAgent.id);
    expect(parent).toBeNull();
  });

  it("getAncestors returns chain from child to root", async () => {
    const registry = new FakeAgentRegistry();
    const root: AgentConfig = { id: "root" as AgentId, profile: { name: "Root", description: "" }, capabilities: {} };
    const mid: AgentConfig = { id: "mid" as AgentId, profile: { name: "Mid", description: "" }, capabilities: {} };
    const leaf: AgentConfig = { id: "leaf" as AgentId, profile: { name: "Leaf", description: "" }, capabilities: {} };
    await registry.register(root);
    await registry.register(mid, root.id);
    await registry.register(leaf, mid.id);
    const ancestors = await registry.getAncestors(leaf.id);
    expect(ancestors).toHaveLength(2);
    expect(ancestors[0]?.id).toBe("root");
    expect(ancestors[1]?.id).toBe("mid");
  });

  it("unregister removes child from parent's children list", async () => {
    const registry = new FakeAgentRegistry();
    await registry.register(testAgent);
    await registry.register(testAgent2, testAgent.id);
    await registry.unregister(testAgent2.id);
    const children = await registry.getChildren(testAgent.id);
    expect(children).toEqual([]);
  });

  it("update merges patch into existing agent", async () => {
    const registry = new FakeAgentRegistry();
    await registry.register(testAgent);
    const updated = await registry.update(testAgent.id, { systemPrompt: "new prompt" });
    expect(updated?.profile.name).toBe(testAgent.profile.name);
    expect(updated?.systemPrompt).toBe("new prompt");
    const fetched = await registry.get(testAgent.id);
    expect(fetched?.systemPrompt).toBe("new prompt");
  });

  it("update returns null for unknown agent", async () => {
    const registry = new FakeAgentRegistry();
    const result = await registry.update("nope" as AgentId, {});
    expect(result).toBeNull();
  });
});

describe("InMemoryAgentRegistry", () => {
  it("register and get an agent", async () => {
    const registry = new InMemoryAgentRegistry();
    await registry.register(testAgent);
    const result = await registry.get(testAgent.id);
    expect(result).toEqual(testAgent);
  });

  it("supports parent-child relationships", async () => {
    const registry = new InMemoryAgentRegistry();
    await registry.register(testAgent);
    await registry.register(testAgent2, testAgent.id);
    const children = await registry.getChildren(testAgent.id);
    expect(children).toHaveLength(1);
    const parent = await registry.getParent(testAgent2.id);
    expect(parent?.id).toBe(testAgent.id);
  });

  it("update merges patch into existing agent", async () => {
    const registry = new InMemoryAgentRegistry();
    await registry.register(testAgent);
    const updated = await registry.update(testAgent.id, { profile: { name: "Renamed", description: testAgent.profile.description } });
    expect(updated?.profile.name).toBe("Renamed");
    expect((await registry.get(testAgent.id))?.profile.name).toBe("Renamed");
  });
});

describe("createAgent factory", () => {
  it("creates agent with required fields", () => {
    const agent = createAgent({ profile: { name: "Test", description: "Test agent" } });
    expect(agent.profile.name).toBe("Test");
    expect(agent.id).toBeTruthy();
    expect(agent.capabilities.streaming).toBe(true);
  });

  it("throws when name is missing", () => {
    expect(() => createAgent({ profile: { name: "", description: "Test" } })).toThrow("Agent name is required");
  });

  it("throws when description is missing", () => {
    expect(() => createAgent({ profile: { name: "Test", description: "" } })).toThrow("Agent description is required");
  });

  it("merges capabilities with defaults", () => {
    const agent = createAgent({ profile: { name: "T", description: "D" }, capabilities: { thinking: true } });
    expect(agent.capabilities.streaming).toBe(true);
    expect(agent.capabilities.thinking).toBe(true);
  });
});

describe("createSubAgent factory", () => {
  const parent: AgentConfig = {
    id: "parent" as AgentId,
    profile: { name: "Parent", description: "Top", version: "1.0", author: "me" },
    capabilities: { streaming: true, tools: ["read", "write"] },
    permissions: { allowedTools: ["read"], deniedTools: ["write"], maxSteps: 10, maxTokens: 5000 },
  };

  it("creates sub-agent inheriting parent profile fields", () => {
    const child = createSubAgent({ profile: { name: "Child", description: "Sub" } }, parent);
    expect(child.profile.name).toBe("Child");
    expect(child.profile.version).toBe("1.0");
    expect(child.profile.author).toBe("me");
  });

  it("inherits and merges permissions from parent", () => {
    const child = createSubAgent({ profile: { name: "C", description: "D" } }, parent);
    expect(child.permissions?.allowedTools).toEqual(["read"]);
    expect(child.permissions?.deniedTools).toEqual(["write"]);
    expect(child.permissions?.maxSteps).toBe(10);
    expect(child.permissions?.maxTokens).toBe(5000);
  });

  it("child deniedTools are added to parent deniedTools", () => {
    const child = createSubAgent({
      profile: { name: "C", description: "D" },
      permissions: { deniedTools: ["shell"] },
    }, parent);
    expect(child.permissions?.deniedTools).toEqual(["write", "shell"]);
  });

  it("child maxSteps is min of parent and child values", () => {
    const child = createSubAgent({
      profile: { name: "C", description: "D" },
      permissions: { maxSteps: 5 },
    }, parent);
    expect(child.permissions?.maxSteps).toBe(5);
  });

  it("child maxTokens is min of parent and child values", () => {
    const child = createSubAgent({
      profile: { name: "C", description: "D" },
      permissions: { maxTokens: 100 },
    }, parent);
    expect(child.permissions?.maxTokens).toBe(100);
  });

  it("sub-agent defaults to subagent mode", () => {
    const child = createSubAgent({ profile: { name: "C", description: "D" } }, parent);
    expect(child.permissions?.mode).toBe("subagent");
  });

  it("createAgent defaults to primary mode", () => {
    const agent = createAgent({ profile: { name: "T", description: "D" } });
    expect(agent.permissions?.mode).toBe("primary");
  });

  it("mode can be explicitly set", () => {
    const agent = createAgent({
      profile: { name: "T", description: "D" },
      permissions: { mode: "all" },
    });
    expect(agent.permissions?.mode).toBe("all");
  });
});

describe("createSubAgent with ruleset", () => {
  const parentWithRuleset: AgentConfig = {
    id: "parent-ruleset" as AgentId,
    profile: { name: "Parent", description: "Top" },
    capabilities: {},
    permissions: {
      ruleset: {
        rules: [{ effect: "allow", target: "tool.read_*" }],
        allowedRisks: ["low"],
        maxSteps: 50,
      },
    },
  };

  it("uses ruleset-based inheritance when parent has ruleset", () => {
    const child = createSubAgent({
      profile: { name: "C", description: "D" },
      permissions: {
        ruleset: { rules: [{ effect: "deny", target: "tool.write_*" }] },
      },
    }, parentWithRuleset);
    expect(child.permissions?.mode).toBe("subagent");
    const rules = child.permissions?.ruleset?.rules;
    expect(rules).toBeDefined();
    expect(rules!.some((r) => r.effect === "allow" && r.target === "tool.read_*")).toBe(true);
    expect(rules!.some((r) => r.effect === "deny" && r.target === "tool.write_*")).toBe(true);
  });
});

describe("validateAgentConfig", () => {
  it("returns no errors for valid config", () => {
    const errors = validateAgentConfig({
      id: "test" as AgentId,
      profile: { name: "T", description: "D" },
      capabilities: {},
    });
    expect(errors).toEqual([]);
  });

  it("returns errors for missing id", () => {
    const errors = validateAgentConfig({
      id: "" as AgentId,
      profile: { name: "T", description: "D" },
      capabilities: {},
    });
    expect(errors).toContain("Agent id is required");
  });

  it("returns errors for missing name", () => {
    const errors = validateAgentConfig({
      id: "test" as AgentId,
      profile: { name: "", description: "D" },
      capabilities: {},
    });
    expect(errors).toContain("Agent profile.name is required");
  });

  it("returns errors for invalid mode", () => {
    const errors = validateAgentConfig({
      id: "test" as AgentId,
      profile: { name: "T", description: "D" },
      capabilities: {},
      permissions: { mode: "invalid" as never },
    });
    expect(errors).toContain("Invalid mode: invalid. Expected primary, subagent, or all");
  });

  it("returns errors for invalid rule effect", () => {
    const errors = validateAgentConfig({
      id: "test" as AgentId,
      profile: { name: "T", description: "D" },
      capabilities: {},
      permissions: {
        ruleset: {
          rules: [{ effect: "invalid" as never, target: "tool.*" }],
        },
      },
    });
    expect(errors).toContain("Rule[0]: effect must be 'allow' or 'deny'");
  });

  it("returns errors for missing rule target", () => {
    const errors = validateAgentConfig({
      id: "test" as AgentId,
      profile: { name: "T", description: "D" },
      capabilities: {},
      permissions: {
        ruleset: {
          rules: [{ effect: "allow", target: "" }],
        },
      },
    });
    expect(errors).toContain("Rule[0]: target is required");
  });
});
