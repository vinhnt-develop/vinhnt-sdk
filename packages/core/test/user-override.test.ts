import { describe, expect, it } from "vitest";
import { ToolProviderRegistry, BuiltinToolProvider, ToolFileProvider } from "@vinhnt-sdk/core";
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

describe("User tool override", () => {
  it("workspace tools override builtin tools", () => {
    const registry = new ToolProviderRegistry();

    // Register builtin tools first
    const builtinProvider = new BuiltinToolProvider({
      workspaceRoot: "/tmp",
      shell: { workspaceRoot: "/tmp", defaultTimeoutMs: 5000 },
    });
    registry.registerProvider(builtinProvider);

    // Verify builtin read_file exists
    const builtinReadFile = registry.getTool("read_file");
    expect(builtinReadFile).toBeDefined();
    expect(builtinReadFile?.description).toContain("Read the contents");

    // Create user tool with same ID
    const userReadFile = defineTool({
      name: "read_file",
      description: "Custom read file tool (user override)",
      risk: "read" as const,
      input: z.object({ filePath: z.string() }),
      async execute({ filePath }) {
        return `Custom content from ${filePath}`;
      },
    }).toDefinition();

    // Register user tool (overrides builtin)
    const userProvider = new ToolFileProvider(
      "user-tools",
      "User Tools",
      [userReadFile],
    );
    registry.registerProvider(userProvider);

    // Verify user tool overrides builtin
    const overriddenTool = registry.getTool("read_file");
    expect(overriddenTool).toBeDefined();
    expect(overriddenTool?.description).toContain("Custom read file tool");
    expect(overriddenTool).toBe(userReadFile);
  });

  it("multiple user tools can be registered", () => {
    const registry = new ToolProviderRegistry();

    const userTools = [
      createMockTool("custom_tool_1"),
      createMockTool("custom_tool_2"),
      createMockTool("custom_tool_3"),
    ];

    const userProvider = new ToolFileProvider(
      "user-tools",
      "User Tools",
      userTools,
    );
    registry.registerProvider(userProvider);

    expect(registry.hasTool("custom_tool_1")).toBe(true);
    expect(registry.hasTool("custom_tool_2")).toBe(true);
    expect(registry.hasTool("custom_tool_3")).toBe(true);
    expect(registry.count()).toBe(3);
  });

  it("user tools and builtin tools coexist", () => {
    const registry = new ToolProviderRegistry();

    // Register builtin tools
    const builtinProvider = new BuiltinToolProvider({
      workspaceRoot: "/tmp",
      shell: { workspaceRoot: "/tmp", defaultTimeoutMs: 5000 },
    });
    registry.registerProvider(builtinProvider);

    // Register user tools
    const userTools = [
      createMockTool("custom_deploy"),
      createMockTool("custom_analytics"),
    ];
    const userProvider = new ToolFileProvider(
      "user-tools",
      "User Tools",
      userTools,
    );
    registry.registerProvider(userProvider);

    // Both builtin and user tools should be present
    expect(registry.hasTool("read_file")).toBe(true); // builtin
    expect(registry.hasTool("execute_command")).toBe(true); // builtin
    expect(registry.hasTool("custom_deploy")).toBe(true); // user
    expect(registry.hasTool("custom_analytics")).toBe(true); // user

    // Total count should include both
    expect(registry.count()).toBeGreaterThan(16); // 16 builtin + 2 user
  });

  it("user provider can be unregistered", () => {
    const registry = new ToolProviderRegistry();

    // Register builtin tools
    const builtinProvider = new BuiltinToolProvider({
      workspaceRoot: "/tmp",
      shell: { workspaceRoot: "/tmp", defaultTimeoutMs: 5000 },
    });
    registry.registerProvider(builtinProvider);

    // Register user tools
    const userTools = [createMockTool("custom_tool")];
    const userProvider = new ToolFileProvider(
      "user-tools",
      "User Tools",
      userTools,
    );
    registry.registerProvider(userProvider);

    expect(registry.hasTool("custom_tool")).toBe(true);

    // Unregister user provider
    registry.unregisterProvider("user-tools");

    expect(registry.hasTool("custom_tool")).toBe(false);
    // Builtin tools should still be present
    expect(registry.hasTool("read_file")).toBe(true);
  });
});
