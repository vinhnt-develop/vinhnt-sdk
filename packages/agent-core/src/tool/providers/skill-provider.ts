import type { ToolProvider } from "../provider.js";
import type { ToolDefinition } from "../definitions.js";
import type { ToolRegistry } from "../registry.js";

/**
 * SkillToolProvider — Provides skill-related tools.
 *
 * This is a metadata provider that declares skill tools exist.
 * Actual tool creation happens in the composition root to avoid circular dependencies.
 */
export class SkillToolProvider implements ToolProvider {
  readonly id = "skills";
  readonly name = "Skill Tools";
  readonly description = "Skill management tools: load, search, create";

  private _tools: ToolDefinition[] = [];

  get tools(): ToolDefinition[] {
    return this._tools;
  }

  /**
   * Add tools externally (called by composition root).
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
