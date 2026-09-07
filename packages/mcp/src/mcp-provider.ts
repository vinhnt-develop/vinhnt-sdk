/**
 * McpToolProvider — ToolProvider implementation for MCP servers.
 *
 * Wraps McpClient + tool-mapper into the ToolProvider interface,
 * allowing MCP tools to be registered into the ToolProviderRegistry.
 *
 * @example
 * ```ts
 * const provider = new McpToolProvider({
 *   name: "github",
 *   transport: "stdio",
 *   command: "npx",
 *   args: ["-y", "@modelcontextprotocol/server-github"],
 *   env: { GITHUB_TOKEN: "xxx" },
 * });
 * await provider.connect();
 * registry.registerProvider(provider);
 * ```
 */

import type { ToolDefinition, ToolProvider, ToolRegistry } from "@vinhnt-sdk/tools";
import { McpClient } from "./client.js";
import type { McpConnection } from "./client.js";
import type { McpServerConfig } from "./types.js";
import { discoverMcpTools } from "./tool-mapper.js";

/** Configuration for McpToolProvider. */
export interface McpToolProviderConfig extends McpServerConfig {
  /**
   * Unique provider ID. Defaults to `"mcp:<name>"`.
   */
  readonly id?: string;
}

/**
 * McpToolProvider — Provides tools from an MCP server as a ToolProvider.
 *
 * Lifecycle:
 *   1. construct with config
 *   2. connect() — spawns/connects to MCP server, discovers tools
 *   3. register into ToolProviderRegistry
 *   4. refresh() — re-discovers tools (e.g., when server notifies listChanged)
 *   5. close() — disconnects from server
 */
export class McpToolProvider implements ToolProvider {
  readonly id: string;
  readonly name: string;
  readonly description: string;

  private readonly config: McpToolProviderConfig;
  private readonly client: McpClient;
  private connection: McpConnection | null = null;
  private _tools: ToolDefinition[] = [];

  constructor(config: McpToolProviderConfig) {
    this.config = config;
    this.id = config.id ?? `mcp:${config.name}`;
    this.name = `MCP: ${config.name}`;
    this.description = `Tools from MCP server "${config.name}" (${config.transport})`;
    this.client = new McpClient();
  }

  get tools(): ToolDefinition[] {
    return this._tools;
  }

  /**
   * Connect to the MCP server and discover tools.
   * Must be called before registering into a ToolProviderRegistry.
   */
  async connect(): Promise<void> {
    this.connection = await this.client.connect(this.config);
    this._tools = await discoverMcpTools(this.config.name, this.connection);
  }

  /**
   * Get the underlying MCP connection (for direct access to resources, etc.).
   */
  getConnection(): McpConnection | null {
    return this.connection;
  }

  /**
   * Get the number of discovered tools.
   */
  toolCount(): number {
    return this._tools.length;
  }

  register(_registry: ToolRegistry): void {
    // Registration is handled by ToolProviderRegistry
  }

  unregister(_registry: ToolRegistry): void {
    this._tools = [];
  }

  /**
   * Refresh tools from the MCP server.
   * Re-discovers tools and updates the internal list.
   */
  async refresh(): Promise<void> {
    if (!this.connection) {
      await this.connect();
      return;
    }

    try {
      this._tools = await discoverMcpTools(this.config.name, this.connection);
    } catch {
      // Connection may have dropped — reconnect and re-discover
      await this.close();
      await this.connect();
    }
  }

  /**
   * Disconnect from the MCP server.
   */
  async close(): Promise<void> {
    try {
      await this.client.closeAll();
    } finally {
      this.connection = null;
      this._tools = [];
    }
  }
}
