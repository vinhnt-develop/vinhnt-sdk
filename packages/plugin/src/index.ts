// @vinhnt-sdk/plugin
// Plugin system for AI coding agents
//
// PUBLIC API - Only essential exports for users

/**
 * Plugin system for creating and managing plugins.
 * 
 * Plugins allow you to extend the functionality of vinhnt-sdk
 * by adding custom tools, hooks, and behaviors.
 * 
 * @example
 * ```typescript
 * import { definePlugin } from "@vinhnt-sdk/plugin";
 * import type { PluginManifest } from "@vinhnt-sdk/core";
 * 
 * const manifest: PluginManifest = {
 *   id: "my-plugin",
 *   name: "My Plugin",
 *   version: "0.1.0",
 *   description: "A custom plugin",
 * };
 * 
 * const plugin = definePlugin(manifest, {
 *   activate: async (ctx) => {
 *     console.log("Plugin activated!");
 *   },
 * });
 * ```
 */

import type { PluginManifest, PluginContext, PluginHooks, Plugin } from "@vinhnt-sdk/core";

/**
 * Plugin manifest and context types.
 */
export type { PluginManifest, PluginContext, PluginHooks, Plugin };

/**
 * Tool-related types.
 */
export type { ToolDefinition, ToolRisk, ContextSourceValue, ContextSourceKey } from "@vinhnt-sdk/core";

/**
 * Plugin registry interface for managing plugins.
 * 
 * @example
 * ```typescript
 * import { PluginRegistry } from "@vinhnt-sdk/plugin";
 * 
 * const registry = new InMemoryPluginRegistry();
 * registry.register(myPlugin);
 * 
 * const plugin = registry.get("my-plugin");
 * ```
 */
export interface PluginRegistry {
  /**
   * Register a plugin.
   * @param plugin - Plugin to register
   */
  register(plugin: Plugin): void;

  /**
   * Unregister a plugin by ID.
   * @param id - Plugin ID to unregister
   * @returns true if plugin was unregistered, false if not found
   */
  unregister(id: string): boolean;

  /**
   * Get a plugin by ID.
   * @param id - Plugin ID
   * @returns Plugin or undefined if not found
   */
  get(id: string): Plugin | undefined;

  /**
   * List all registered plugins.
   * @returns Array of registered plugins
   */
  list(): Plugin[];

  /**
   * Get the number of registered plugins.
   * @returns Number of plugins
   */
  count(): number;

  /**
   * Check if a plugin is registered.
   * @param id - Plugin ID
   * @returns true if plugin is registered
   */
  has(id: string): boolean;
}

/**
 * In-memory plugin registry for managing plugins.
 * 
 * @example
 * ```typescript
 * import { InMemoryPluginRegistry } from "@vinhnt-sdk/plugin";
 * 
 * const registry = new InMemoryPluginRegistry();
 * registry.register(myPlugin);
 * 
 * console.log(registry.count()); // 1
 * ```
 */
export class InMemoryPluginRegistry implements PluginRegistry {
  private plugins = new Map<string, Plugin>();

  register(plugin: Plugin): void {
    const id = plugin.manifest.id;
    if (this.plugins.has(id)) {
      throw new Error(`Plugin "${id}" is already registered`);
    }
    this.plugins.set(id, plugin);
  }

  unregister(id: string): boolean {
    return this.plugins.delete(id);
  }

  get(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  count(): number {
    return this.plugins.size;
  }

  has(id: string): boolean {
    return this.plugins.has(id);
  }
}

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
