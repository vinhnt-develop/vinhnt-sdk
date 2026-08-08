import type { ToolProvider } from "../provider.js";
import type { ToolDefinition } from "../definitions.js";
import type { ToolRegistry } from "../registry.js";

/**
 * Minimal kernel interface for tool registration.
 * Avoids circular dependency with @vinhnt-sdk/core.
 */
export interface KernelLike {
  registerTool(tool: ToolDefinition): void;
}

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

  private kernel: KernelLike | null = null;
  private _tools: ToolDefinition[] = [];

  /**
   * Set the kernel instance (call after kernel is created).
   */
  setKernel(kernel: KernelLike): void {
    this.kernel = kernel;
    this._tools = this.createTools();
  }

  get tools(): ToolDefinition[] {
    return this._tools;
  }

  private createTools(): ToolDefinition[] {
    if (!this.kernel) return [];
    return [];
  }

  register(_registry: ToolRegistry): void {
    // Registration is handled by ToolProviderRegistry
  }

  unregister(_registry: ToolRegistry): void {
    this._tools = [];
  }
}
