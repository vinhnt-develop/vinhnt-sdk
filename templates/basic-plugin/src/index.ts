import { definePlugin } from "@vinhnt-sdk/plugin";
import type { PluginManifest, PluginContext, PluginHooks } from "@vinhnt-sdk/plugin";

const manifest: PluginManifest = {
  id: "my-basic-plugin",
  name: "My Basic Plugin",
  version: "0.1.0",
  description: "A basic plugin for vinhnt-sdk",
  author: "Your Name",
};

const hooks: PluginHooks = {
  onRunStarted: async (data) => {
    console.log(`[my-plugin] Run started: ${data.runId}`);
  },

  onRunCompleted: async (data) => {
    console.log(`[my-plugin] Run completed: ${data.status}`);
  },

  onToolCompleted: async (data) => {
    console.log(`[my-plugin] Tool completed: ${data.toolName}`);
    return null;
  },
};

async function activate(ctx: PluginContext): Promise<void> {
  console.log(`[my-plugin] Plugin activated`);
}

async function deactivate(): Promise<void> {
  console.log("[my-plugin] Plugin deactivated");
}

export default definePlugin(manifest, {
  hooks,
  activate,
  deactivate,
});
