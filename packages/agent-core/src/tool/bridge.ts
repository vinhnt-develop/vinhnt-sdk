import type { PluginManager } from "../plugin.js";
import type { ToolDefinition, ToolContext } from "./definitions.js";
import { ToolPermissionDenied } from "@vinhnt-sdk/schema";
import { ToolRuntime, type ToolHook } from "./runtime.js";

export function createKernelTools(rt: ToolRuntime): ToolDefinition[] {
  return rt.getTools().map((t) => ({
    id: t.id,
    description: t.description,
    risk: t.risk,
    inputSchema: t.inputSchema,
    async execute(input: unknown, ctx: ToolContext) {
      const result = await rt.execute(t.id, input, ctx);
      if (result.status === "success") return result.output;
      if (result.status === "denied") throw new ToolPermissionDenied(t.id, result.reason ?? "Permission denied");
      throw new Error(result.error);
    },
  }));
}

/** Create a ToolHook that bridges PluginManager lifecycle hooks into the ToolRuntime pipeline */
export function createPluginToolHook(pm: PluginManager): ToolHook {
  return {
    id: "plugin-hooks",
    async pre(params) {
      const result = await pm.fireHook("onToolInvoked", {
        toolId: params.toolId,
        toolName: params.tool.id,
        input: params.input,
      });
      if (result?.modified) {
        return { input: result.modified.input };
      }
      return null;
    },
    async post(params) {
      if (params.result.status === "error") return null;
      const result = await pm.fireHook("onToolCompleted", {
        toolId: params.toolId,
        toolName: params.tool.id,
        output: params.result.status === "success" ? params.result.output : undefined,
      });
      if (result?.modified && params.result.status === "success") {
        return { status: "success" as const, output: result.modified.output };
      }
      return null;
    },
  };
}
