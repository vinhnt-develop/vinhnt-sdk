/**
 * Basic Plugin Template for vinhnt-sdk
 * 
 * This template provides a starting point for creating plugins.
 * Copy this directory and customize it for your needs.
 */

import { definePlugin } from "@vinhnt-sdk/plugin";
import type { PluginManifest, PluginContext, PluginHooks } from "@vinhnt-sdk/core";

/**
 * Plugin manifest - describes the plugin
 */
const manifest: PluginManifest = {
  id: "my-basic-plugin",
  name: "My Basic Plugin",
  version: "0.1.0",
  description: "A basic plugin for vinhnt-sdk",
  author: "Your Name",
};

/**
 * Plugin hooks - implement lifecycle methods
 */
const hooks: PluginHooks = {
  /**
   * Called before a run starts
   */
  onRunStart: async (ctx) => {
    console.log(`[my-plugin] Run started: ${ctx.runId}`);
  },

  /**
   * Called after a run completes
   */
  onRunCompleted: async (ctx) => {
    console.log(`[my-plugin] Run completed: ${ctx.runId}`);
  },

  /**
   * Called when a tool is invoked
   */
  onToolInvoked: async (ctx) => {
    console.log(`[my-plugin] Tool invoked: ${ctx.toolId}`);
  },
};

/**
 * Activate the plugin
 */
async function activate(ctx: PluginContext): Promise<void> {
  console.log(`[my-plugin] Plugin activated with workspace: ${ctx.workspaceRoot}`);
}

/**
 * Deactivate the plugin
 */
async function deactivate(): Promise<void> {
  console.log("[my-plugin] Plugin deactivated");
}

/**
 * Export the plugin
 */
export default definePlugin(manifest, {
  hooks,
  activate,
  deactivate,
});
