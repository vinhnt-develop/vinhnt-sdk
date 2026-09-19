import type { ToolProvider, ToolDefinition, ToolRegistry } from "./index.js";

/**
 * AgentToolProvider — Provides agent-related tools.
 *
 * Tools are added externally via addTools() to avoid circular dependencies
 * with @vinhnt-sdk/core (where the factory functions live).
 *
 * @example
 * ```ts
 * const provider = new AgentToolProvider();
 * // After kernel is created:
 * provider.addTools([
 *   createSpawnAgentTool(kernel),
 *   createDelegateTool(kernel),
 *   createCreateAgentTool(kernel),
 *   createListAgentsTool(kernel),
 * ]);
 * registry.registerProvider(provider);
 * ```
 */
export class AgentToolProvider implements ToolProvider {
  readonly id = "agents";
  readonly name = "Agent Tools";
  readonly description = "Agent management tools: spawn, delegate, list, create";

  private _tools: ToolDefinition[] = [];

  get tools(): ToolDefinition[] {
    return this._tools;
  }

  /**
   * Add agent tools externally (called by composition root after kernel is created).
   */
  addTools(tools: ToolDefinition[]): void {
    this._tools.push(...tools);
  }

  register(_registry: ToolRegistry): void {
    // Registration is handled by ToolProviderRegistry
  }

  unregister(_registry: ToolRegistry): void {
    this._tools = [];
  }
}
