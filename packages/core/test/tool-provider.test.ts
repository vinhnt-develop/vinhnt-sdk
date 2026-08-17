import { describe, expect, it } from "vitest";
import { ToolProviderRegistry, BuiltinToolProvider } from "@vinhnt-sdk/core";
import type { ToolDefinition } from "@vinhnt-sdk/core";
import { defineTool } from "@vinhnt-sdk/core";
import { z } from "zod";

function createMockTool(id: string): ToolDefinition {
  return defineTool({
    name: id,
    description: `Mock tool ${id}`,
    risk: "read" as const,
    input: z.object({}),
    async execute() {
      return `result from ${id}`;
    },
  }).toDefinition();
}

describe("ToolProviderRegistry", () => {
  it("registers a provider and its tools", () => {
    const registry = new ToolProviderRegistry();
    const tool = createMockTool("test-tool");

    const provider = {
      id: "test",
      name: "Test Provider",
      tools: [tool],
      register: () => {},
    };

    registry.registerProvider(provider);

    expect(registry.hasTool("test-tool")).toBe(true);
    expect(registry.getTool("test-tool")).toBe(tool);
    expect(registry.count()).toBe(1);
  });

  it("lists all providers", () => {
    const registry = new ToolProviderRegistry();

    const provider1 = {
      id: "p1",
      name: "Provider 1",
      tools: [createMockTool("tool-1")],
      register: () => {},
    };
    const provider2 = {
      id: "p2",
      name: "Provider 2",
      tools: [createMockTool("tool-2")],
      register: () => {},
    };

    registry.registerProvider(provider1);
    registry.registerProvider(provider2);

    expect(registry.listProviders()).toHaveLength(2);
    expect(registry.listProviders().map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("unregisters a provider and removes its tools", () => {
    const registry = new ToolProviderRegistry();
    const tool = createMockTool("test-tool");

    const provider = {
      id: "test",
      name: "Test Provider",
      tools: [tool],
      register: () => {},
    };

    registry.registerProvider(provider);
    expect(registry.hasTool("test-tool")).toBe(true);

    registry.unregisterProvider("test");
    expect(registry.hasTool("test-tool")).toBe(false);
  });

  it("overwrites tools with same ID (workspace > global)", () => {
    const registry = new ToolProviderRegistry();
    const globalTool = createMockTool("shared-tool");
    const workspaceTool = createMockTool("shared-tool");

    const globalProvider = {
      id: "global",
      name: "Global Provider",
      tools: [globalTool],
      register: () => {},
    };
    const workspaceProvider = {
      id: "workspace",
      name: "Workspace Provider",
      tools: [workspaceTool],
      register: () => {},
    };

    registry.registerProvider(globalProvider);
    registry.registerProvider(workspaceProvider);

    // Workspace tool should override global
    expect(registry.getTool("shared-tool")).toBe(workspaceTool);
    expect(registry.count()).toBe(1);
  });

  it("getAllTools returns all registered tools", () => {
    const registry = new ToolProviderRegistry();
    const tools = [
      createMockTool("tool-1"),
      createMockTool("tool-2"),
      createMockTool("tool-3"),
    ];

    registry.registerProvider({
      id: "p1",
      name: "Provider 1",
      tools: tools.slice(0, 2),
      register: () => {},
    });
    registry.registerProvider({
      id: "p2",
      name: "Provider 2",
      tools: tools.slice(2),
      register: () => {},
    });

    expect(registry.getAllTools()).toHaveLength(3);
  });

  it("throws on duplicate provider registration", () => {
    const registry = new ToolProviderRegistry();

    const provider = {
      id: "test",
      name: "Test Provider",
      tools: [],
      register: () => {},
    };

    registry.registerProvider(provider);
    expect(() => registry.registerProvider(provider)).toThrow(
      'ToolProvider "test" already registered',
    );
  });
});

describe("BuiltinToolProvider", () => {
  it("provides all built-in tools", () => {
    const provider = new BuiltinToolProvider({
      workspaceRoot: "/tmp",
      shell: { workspaceRoot: "/tmp", defaultTimeoutMs: 5000 },
    });

    const toolIds = provider.tools.map((t) => t.id);

    // File tools
    expect(toolIds).toContain("read_file");
    expect(toolIds).toContain("write_file");
    expect(toolIds).toContain("edit_file");
    expect(toolIds).toContain("apply_patch");
    expect(toolIds).toContain("list_directory");

    // Shell tool
    expect(toolIds).toContain("execute_command");

    // Search tools
    expect(toolIds).toContain("glob_files");
    expect(toolIds).toContain("grep_files");

    // Web tools
    expect(toolIds).toContain("web_fetch");

    // Git tools
    expect(toolIds).toContain("git_status");
    expect(toolIds).toContain("git_diff");
    expect(toolIds).toContain("git_log");
    expect(toolIds).toContain("git_commit");

    // Utility tools
    expect(toolIds).toContain("todowrite");
    expect(toolIds).toContain("question");
    expect(toolIds).toContain("read_image");
  });

  it("includes web_search when API key provided", () => {
    const provider = new BuiltinToolProvider({
      workspaceRoot: "/tmp",
      shell: { workspaceRoot: "/tmp", defaultTimeoutMs: 5000 },
      webSearchApiKey: "test-key",
    });

    const toolIds = provider.tools.map((t) => t.id);
    expect(toolIds).toContain("web_search");
  });

  it("excludes web_search when no API key", () => {
    const provider = new BuiltinToolProvider({
      workspaceRoot: "/tmp",
      shell: { workspaceRoot: "/tmp", defaultTimeoutMs: 5000 },
    });

    const toolIds = provider.tools.map((t) => t.id);
    expect(toolIds).not.toContain("web_search");
  });

  it("has correct provider metadata", () => {
    const provider = new BuiltinToolProvider({
      workspaceRoot: "/tmp",
      shell: { workspaceRoot: "/tmp", defaultTimeoutMs: 5000 },
    });

    expect(provider.id).toBe("builtin");
    expect(provider.name).toBe("Built-in Tools");
  });

  it("caches tools after first access", () => {
    const provider = new BuiltinToolProvider({
      workspaceRoot: "/tmp",
      shell: { workspaceRoot: "/tmp", defaultTimeoutMs: 5000 },
    });

    const tools1 = provider.tools;
    const tools2 = provider.tools;
    expect(tools1).toBe(tools2);
  });
});
