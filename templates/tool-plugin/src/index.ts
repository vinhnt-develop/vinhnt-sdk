import { definePlugin } from "@vinhnt-sdk/plugin";
import { defineTool } from "@vinhnt-sdk/tools";
import { z } from "zod";
import type { PluginManifest, PluginContext, PluginHooks } from "@vinhnt-sdk/plugin";
import type { ToolDefinition } from "@vinhnt-sdk/tools";

const manifest: PluginManifest = {
  id: "my-tool-plugin",
  name: "My Tool Plugin",
  version: "0.1.0",
  description: "A tool plugin for vinhnt-sdk",
  author: "Your Name",
};

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
      case "add": return input.a + input.b;
      case "subtract": return input.a - input.b;
      case "multiply": return input.a * input.b;
      case "divide":
        if (input.b === 0) throw new Error("Division by zero");
        return input.a / input.b;
    }
  },
});

function getTools(): ToolDefinition[] {
  return [
    helloTool.toDefinition(),
    calculatorTool.toDefinition(),
  ];
}

const hooks: PluginHooks = {
  onRunStarted: async (data) => {
    console.log(`[my-tool-plugin] Run started: ${data.runId}`);
  },
  onRunCompleted: async (data) => {
    console.log(`[my-tool-plugin] Run completed: ${data.status}`);
  },
};

async function activate(ctx: PluginContext): Promise<void> {
  console.log(`[my-tool-plugin] Plugin activated`);
}

async function deactivate(): Promise<void> {
  console.log("[my-tool-plugin] Plugin deactivated");
}

export default definePlugin(manifest, {
  hooks,
  activate,
  deactivate,
});

export { helloTool, calculatorTool, getTools };
