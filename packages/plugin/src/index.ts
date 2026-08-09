// @vinhnt-sdk/plugin
// Plugin system for AI coding agents
//
// PUBLIC API - Only essential exports for users

import type { PluginManifest, PluginContext, PluginHooks, Plugin } from "@vinhnt-sdk/core";

export type { PluginManifest, PluginContext, PluginHooks, Plugin };
export type { ToolDefinition, ToolRisk, ContextSourceValue, ContextSourceKey } from "@vinhnt-sdk/core";

export interface DefinePluginOptions {
  hooks?: PluginHooks;
  activate?(ctx: PluginContext): Promise<void>;
  deactivate?(): Promise<void>;
}

function isDefinePluginOptions(value: unknown): value is DefinePluginOptions {
  return (
    typeof value === "object" &&
    value !== null &&
    ("hooks" in value || "activate" in value || "deactivate" in value)
  );
}

export function definePlugin(
  manifest: PluginManifest,
  hooksOrOptions?: PluginHooks | DefinePluginOptions,
): Plugin {
  const options: DefinePluginOptions | undefined = (
    hooksOrOptions !== undefined && isDefinePluginOptions(hooksOrOptions)
      ? hooksOrOptions
      : hooksOrOptions !== undefined
        ? { hooks: hooksOrOptions }
        : undefined
  );

  return {
    manifest,
    ...(options?.hooks ? { hooks: options.hooks } : {}),
    activate: options?.activate ?? (async () => {}),
    ...(options?.deactivate ? { deactivate: options.deactivate } : {}),
  };
}
