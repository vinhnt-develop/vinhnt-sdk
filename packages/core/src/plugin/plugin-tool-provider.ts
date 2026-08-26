import type { ToolDefinition, ToolRegistry, ToolProvider } from "@vinhnt-sdk/tools";
import type { DefaultPluginManager } from "./manager.js";

/**
 * PluginToolProvider — Wraps tools registered by plugins as a ToolProvider.
 *
 * Each plugin that calls `ctx.registerTool()` during `activate()` gets its
 * tools collected here. The PluginToolProvider then presents them as a
 * single ToolProvider to the ToolProviderRegistry.
 */
export class PluginToolProvider implements ToolProvider {
  readonly id = "plugins";
  readonly name = "Plugin Tools";
  readonly description = "Tools contributed by active plugins";

  private readonly pluginManager: DefaultPluginManager;

  constructor(pluginManager: DefaultPluginManager) {
    this.pluginManager = pluginManager;
  }

  get tools(): ToolDefinition[] {
    // Live view — tools are added as plugins activate
    return [...this.pluginManager.tools];
  }

  register(_registry: ToolRegistry): void {
    // Registration is handled by ToolProviderRegistry
  }

  unregister(_registry: ToolRegistry): void {
    // Plugin tools are removed when plugins are deactivated
  }
}
