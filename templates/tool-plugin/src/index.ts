/**
 * Tool Plugin Template for vinhnt-sdk
 * 
 * This template provides a starting point for creating tool plugins.
 * Copy this directory and customize it for your needs.
 */

import { definePlugin } from "@vinhnt-sdk/plugin";
import { defineTool } from "@vinhnt-sdk/tools";
import { z } from "zod";
import type { PluginManifest, PluginContext, PluginHooks, ToolDefinition } from "@vinhnt-sdk/core";

/**
 * Plugin manifest - describes the plugin
 */
const manifest: PluginManifest = {
  id: "my-tool-plugin",
  name: "My Tool Plugin",
  version: "0.1.0",
  description: "A tool plugin for vinhnt-sdk",
  author: "Your Name",
};

/**
 * Define a custom tool
 */
const helloTool = defineTool({
  name: "hello",
  description: "Say hello to someone",
  risk: "read",
  input: z.object({
    name: z.string().describe("The name of the person to greet"),
  }),
  async execute(input, ctx) {
    return `Hello, ${input.name}!`;
  },
});

/**
 * Define another custom tool
 */
const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform basic calculations",
  risk: "read",
  input: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]).describe("The operation to perform"),
    a: z.number().describe("The first number"),
    b: z.number().describe("The second number"),
  }),
  async execute(input, ctx) {
    switch (input.operation) {
      case "add":
        return input.a + input.b;
      case "subtract":
        return input.a - input.b;
      case "multiply":
        return input.a * input.b;
      case "divide":
        if (input.b === 0) {
          throw new Error("Division by zero");
        }
        return input.a / input.b;
    }
  },
});

/**
 * Collect tools from this plugin
 */
function getTools(): ToolDefinition[] {
  return [
    helloTool,
    calculatorTool,
  ];
}

/**
 * Plugin hooks - implement lifecycle methods
 */
const hooks: PluginHooks = {
  /**
   * Called before a run starts
   */
  onRunStart: async (ctx) => {
    console.log(`[my-tool-plugin] Run started: ${ctx.runId}`);
  },

  /**
   * Called after a run completes
   */
  onRunCompleted: async (ctx) => {
    console.log(`[my-tool-plugin] Run completed: ${ctx.runId}`);
  },
};

/**
 * Activate the plugin
 */
async function activate(ctx: PluginContext): Promise<void> {
  console.log(`[my-tool-plugin] Plugin activated with workspace: ${ctx.workspaceRoot}`);
}

/**
 * Deactivate the plugin
 */
async function deactivate(): Promise<void> {
  console.log("[my-tool-plugin] Plugin deactivated");
}

/**
 * Export the plugin
 */
export default definePlugin(manifest, {
  hooks,
  activate,
  deactivate,
});

/**
 * Export tools for external use
 */
export { helloTool, calculatorTool, getTools };
