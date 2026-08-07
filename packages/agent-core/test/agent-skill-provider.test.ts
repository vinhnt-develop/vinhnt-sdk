import { describe, expect, it } from "vitest";
import { AgentToolProvider } from "../src/tool/providers/agent-provider.js";
import { SkillToolProvider } from "../src/tool/providers/skill-provider.js";
import { ToolProviderRegistry } from "../src/tool/provider.js";
import { BuiltinToolProvider } from "../src/tool/providers/builtin-provider.js";

describe("AgentToolProvider", () => {
  it("has correct provider metadata", () => {
    const provider = new AgentToolProvider();
    expect(provider.id).toBe("agents");
    expect(provider.name).toBe("Agent Tools");
  });

  it("returns empty tools by default", () => {
    const provider = new AgentToolProvider();
    expect(provider.tools).toEqual([]);
  });

  it("can be registered in ToolProviderRegistry", () => {
    const registry = new ToolProviderRegistry();
    const provider = new AgentToolProvider();
    registry.registerProvider(provider);
    expect(registry.getProvider("agents")).toBe(provider);
  });
});

describe("SkillToolProvider", () => {
  it("has correct provider metadata", () => {
    const provider = new SkillToolProvider();
    expect(provider.id).toBe("skills");
    expect(provider.name).toBe("Skill Tools");
  });

  it("returns empty tools by default", () => {
    const provider = new SkillToolProvider();
    expect(provider.tools).toEqual([]);
  });

  it("can add tools externally", () => {
    const provider = new SkillToolProvider();
    const mockTool = {
      id: "skill_tool",
      description: "Load a skill",
      risk: "read" as const,
      execute: async () => "test",
    };
    provider.addTools([mockTool]);
    expect(provider.tools).toHaveLength(1);
    expect(provider.tools[0].id).toBe("skill_tool");
  });

  it("can be registered in ToolProviderRegistry", () => {
    const registry = new ToolProviderRegistry();
    const provider = new SkillToolProvider();
    registry.registerProvider(provider);
    expect(registry.getProvider("skills")).toBe(provider);
  });
});

describe("Full provider ecosystem", () => {
  it("supports builtin + agents + skills providers", () => {
    const registry = new ToolProviderRegistry();

    // Register builtin tools
    const builtinProvider = new BuiltinToolProvider({
      workspaceRoot: "/tmp",
      shell: { workspaceRoot: "/tmp", defaultTimeoutMs: 5000 },
    });
    registry.registerProvider(builtinProvider);

    // Register agent provider (empty for now)
    const agentProvider = new AgentToolProvider();
    registry.registerProvider(agentProvider);

    // Register skill provider with tools
    const skillProvider = new SkillToolProvider();
    const mockSkillTool = {
      id: "skill",
      description: "Load a skill",
      risk: "read" as const,
      execute: async () => "test",
    };
    skillProvider.addTools([mockSkillTool]);
    registry.registerProvider(skillProvider);

    // Verify all providers are registered
    expect(registry.listProviders()).toHaveLength(3);
    expect(registry.getProvider("builtin")).toBe(builtinProvider);
    expect(registry.getProvider("agents")).toBe(agentProvider);
    expect(registry.getProvider("skills")).toBe(skillProvider);

    // Verify tools
    const allTools = registry.getAllTools();
    expect(allTools.length).toBeGreaterThan(0);

    // Builtin tools should be present
    const toolIds = allTools.map((t) => t.id);
    expect(toolIds).toContain("read_file");
    expect(toolIds).toContain("execute_command");

    // Skill tool should be present
    expect(toolIds).toContain("skill");
  });
});
