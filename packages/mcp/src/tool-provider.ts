import type { ToolProvider, ToolDefinition, ToolRegistry } from "@vinhnt-sdk/agent-core";

/**
 * McpToolProvider — Provides tools from MCP servers.
 *
 * This is a metadata provider that declares MCP tools exist.
 * Actual tool creation happens via McpClientPool.toToolDefinitions().
 */
export class McpToolProvider implements ToolProvider {
  readonly id = "mcp";
  readonly name = "MCP Tools";
  readonly description = "Tools from Model Context Protocol servers";

  private _tools: ToolDefinition[] = [];

  /**
   * Set tools from MCP discovery.
   */
  setTools(tools: ToolDefinition[]): void {
    this._tools = tools;
  }

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
