import type { ToolDefinition } from "./definitions.js";
import type { ToolRegistry } from "./registry.js";

/**
 * ToolProvider — Interface for providing tools to the kernel.
 *
 * Built-in tools (coding) use BuiltinToolProvider.
 * User tools use ToolFileProvider.
 * MCP tools use McpToolProvider.
 * Plugin tools use PluginToolProvider.
 */
export interface ToolProvider {
  readonly id: string;
  readonly name: string;
  readonly description?: string;

  /**
   * Get all tools provided by this provider.
   * Called during registration to populate the registry.
   */
  readonly tools: ToolDefinition[];

  /**
   * Register all tools into the given registry.
   * Called once when the provider is registered.
   */
  register(registry: ToolRegistry): void;

  /**
   * Unregister all tools from the given registry.
   * Called when the provider is removed.
   */
  unregister?(registry: ToolRegistry): void;

  /**
   * Optional: refresh tools from external source (e.g., MCP).
   * Called when external tools change.
   */
  refresh?(): Promise<void>;
}

/**
 * ToolProviderRegistry — Manages multiple ToolProviders.
 * Single source of truth for all available tools.
 */
export class ToolProviderRegistry {
  private readonly providers = new Map<string, ToolProvider>();
  private readonly tools = new Map<string, ToolDefinition>();

  /**
   * Register a tool provider and all its tools.
   */
  registerProvider(provider: ToolProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`ToolProvider "${provider.id}" already registered`);
    }

    this.providers.set(provider.id, provider);

    for (const tool of provider.tools) {
      if (this.tools.has(tool.id)) {
        // Workspace/global tools override built-in tools
        console.log(`[ToolProvider] Overriding tool "${tool.id}" (provider: ${provider.id})`);
      }
      this.tools.set(tool.id, tool);
    }
  }

  /**
   * Unregister a tool provider and remove all its tools.
   */
  unregisterProvider(id: string): void {
    const provider = this.providers.get(id);
    if (!provider) return;

    // Remove tools that belong to this provider
    for (const tool of provider.tools) {
      if (this.tools.get(tool.id) === tool) {
        this.tools.delete(tool.id);
      }
    }

    provider.unregister?.(undefined as unknown as ToolRegistry);
    this.providers.delete(id);
  }

  /**
   * Get a tool provider by ID.
   */
  getProvider(id: string): ToolProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * List all registered providers.
   */
  listProviders(): ToolProvider[] {
    return [...this.providers.values()];
  }

  /**
   * Get all tools from all providers.
   */
  getAllTools(): ToolDefinition[] {
    return [...this.tools.values()];
  }

  /**
   * Get a tool by ID.
   */
  getTool(id: string): ToolDefinition | undefined {
    return this.tools.get(id);
  }

  /**
   * Check if a tool exists.
   */
  hasTool(id: string): boolean {
    return this.tools.has(id);
  }

  /**
   * Refresh a specific provider (e.g., MCP tools changed).
   */
  async refreshProvider(id: string): Promise<void> {
    const provider = this.providers.get(id);
    if (!provider?.refresh) return;

    // Remove old tools from this provider
    for (const tool of provider.tools) {
      if (this.tools.get(tool.id) === tool) {
        this.tools.delete(tool.id);
      }
    }

    // Refresh and re-register
    await provider.refresh();

    for (const tool of provider.tools) {
      this.tools.set(tool.id, tool);
    }
  }

  /**
   * Get tool count.
   */
  count(): number {
    return this.tools.size;
  }
}
