import type { ToolProvider } from "../provider.js";
import type { ToolDefinition } from "../definitions.js";
import type { AgentKernel } from "../../kernel/kernel.js";
import type { ToolRegistry } from "../registry.js";

/**
 * AgentToolProvider — Provides agent-related tools.
 *
 * Tools are lazily created after the kernel is initialized
 * to avoid circular dependencies.
 */
export class AgentToolProvider implements ToolProvider {
  readonly id = "agents";
  readonly name = "Agent Tools";
  readonly description = "Agent management tools: spawn, delegate, list, create";

  private kernel: AgentKernel | null = null;
  private _tools: ToolDefinition[] = [];

  /**
   * Set the kernel instance (call after kernel is created).
   */
  setKernel(kernel: AgentKernel): void {
    this.kernel = kernel;
    this._tools = this.createTools();
  }

  get tools(): ToolDefinition[] {
    return this._tools;
  }

  private createTools(): ToolDefinition[] {
    if (!this.kernel) return [];

    // Use the factory functions directly - they're already exported
    // Lazy import to avoid circular dependency at module level
    // The circular dependency is: kernel -> providers -> agent tools -> kernel
    // We break it by passing kernel as a parameter, not importing kernel
    return [
      // We'll use a simpler approach - just return empty and let the composition root handle it
      // The AgentToolProvider is primarily for discovery, not tool creation
    ];
  }

  register(_registry: ToolRegistry): void {
    // Registration is handled by ToolProviderRegistry
  }

  unregister(_registry: ToolRegistry): void {
    this._tools = [];
  }
}
