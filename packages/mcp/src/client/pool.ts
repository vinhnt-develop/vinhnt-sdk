import type { ToolDefinition, ToolRisk, JsonSchema7Object, ToolContext, DomainManifest, ToolPermissionRule } from "@vinhnt-sdk/agent-core";
import { McpClient } from "./wrapper.js";
import type { McpReconnectOptions } from "./wrapper.js";
import type { McpServerConfigItem } from "./config.js";
import { loadMcpConfig } from "./config.js";

/** Tool id namespace for an MCP server's tools: `mcp__<server>__<tool>`. */
function mcpToolId(serverName: string, toolName: string): string {
  return `mcp__${serverName}__${toolName}`;
}

/** Domain id for an MCP server: `mcp:<server>` (used in agent `domains` lists). */
function mcpDomainId(serverName: string): string {
  return `mcp:${serverName}`;
}

export interface McpServerEntry {
  name: string;
  config: McpServerConfigItem;
}

export interface McpRegisteredTool {
  serverName: string;
  name: string;
  description: string;
  inputSchema: unknown;
}

export interface McpRegisteredPrompt {
  serverName: string;
  name: string;
  description: string;
  arguments?: readonly { name: string; description?: string; required?: boolean }[];
}

export interface McpRegisteredResource {
  serverName: string;
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

export class McpClientPool {
  private readonly entries: Map<string, McpServerEntry> = new Map();
  private readonly clients: Map<string, McpClient> = new Map();
  private reconnectOpts: McpReconnectOptions | undefined;

  /** Set reconnection options for all MCP clients */
  setReconnectOptions(opts: McpReconnectOptions): void {
    this.reconnectOpts = opts;
  }

  register(name: string, config: McpServerConfigItem): void {
    this.entries.set(name, { name, config });
  }

  /** Load and register servers from mcp.json in the given directory */
  async loadConfig(cwd: string): Promise<void> {
    const config = await loadMcpConfig(cwd);
    for (const [name, serverConfig] of Object.entries(config.servers)) {
      if (!this.entries.has(name)) {
        this.register(name, serverConfig);
      }
    }
  }

  /**
   * Restore the full server set from an explicit map (config hot-reload).
   * Removes servers no longer present, updates configs of existing ones,
   * and connects any that are newly registered / not yet connected.
   */
  async applyServerConfig(servers: Record<string, McpServerConfigItem>): Promise<void> {
    // Remove servers no longer configured
    for (const name of [...this.entries.keys()]) {
      if (!(name in servers)) {
        this.disconnect(name);
        this.entries.delete(name);
      }
    }
    for (const [name, config] of Object.entries(servers)) {
      const existing = this.entries.get(name);
      // Config changed → drop old client so it reconnects with the new config
      if (existing && JSON.stringify(existing.config) !== JSON.stringify(config)) {
        this.disconnect(name);
        this.entries.set(name, { name, config });
        await this.connectOne(name).catch(() => {});
        continue;
      }
      if (!existing) {
        this.register(name, config);
        await this.connectOne(name).catch(() => {});
      }
    }
  }

  async connectAll(): Promise<void> {
    const errors: string[] = [];

    for (const [name, entry] of this.entries) {
      if (this.clients.has(name)) continue;
      const client = new McpClient(name, entry.config, this.reconnectOpts);
      try {
        await client.connect();
        this.clients.set(name, client);
      } catch (err) {
        errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`MCP connection errors:\n  ${errors.join("\n  ")}`);
    }
  }

  async connectOne(name: string): Promise<void> {
    if (this.clients.has(name)) return;
    const entry = this.entries.get(name);
    if (!entry) throw new Error(`MCP server "${name}" not registered`);

    const client = new McpClient(name, entry.config, this.reconnectOpts);
    await client.connect();
    this.clients.set(name, client);
  }

  async discoverTools(): Promise<McpRegisteredTool[]> {
    const all: McpRegisteredTool[] = [];

    for (const [name, client] of this.clients) {
      try {
        const tools = await client.listTools();
        for (const t of tools) {
          all.push({
            serverName: name,
            name: t.name,
            description: t.description ?? "",
            inputSchema: t.inputSchema,
          });
        }
      } catch {
        // skip failed tool discovery for individual servers
      }
    }

    return all;
  }

  /** Discover prompts from all connected MCP servers. */
  async discoverPrompts(): Promise<McpRegisteredPrompt[]> {
    const all: McpRegisteredPrompt[] = [];
    for (const [name, client] of this.clients) {
      try {
        const prompts = await client.listPrompts();
        for (const p of prompts) {
          all.push({
            serverName: name,
            name: p.name,
            description: p.description ?? "",
            arguments: p.arguments,
          });
        }
      } catch {
        // skip failed prompt discovery
      }
    }
    return all;
  }

  /** Discover resources from all connected MCP servers. */
  async discoverResources(): Promise<McpRegisteredResource[]> {
    const all: McpRegisteredResource[] = [];
    for (const [name, client] of this.clients) {
      try {
        const resources = await client.listResources();
        for (const r of resources) {
          all.push({
            serverName: name,
            uri: r.uri,
            name: r.name,
            description: r.description ?? "",
            mimeType: r.mimeType,
          });
        }
      } catch {
        // skip failed resource discovery
      }
    }
    return all;
  }

  async toToolDefinitions(): Promise<ToolDefinition[]> {
    const domains = await this.toDomainManifests();
    return domains.flatMap((d) => d.tools);
  }

  /**
   * Build one DomainManifest per connected server (id `mcp:<server>`), so the
   * agent core can filter MCP tools by agent `domains` and apply per-server
   * permission defaults. Tools are namespaced `mcp__<server>__<tool>`.
   */
  async toDomainManifests(): Promise<DomainManifest[]> {
    const mcpTools = await this.discoverTools();
    const byServer = new Map<string, { domainId: string; permissionDefaults?: ToolPermissionRule[]; tools: ToolDefinition[] }>();

    for (const mcpTool of mcpTools) {
      let entry = byServer.get(mcpTool.serverName);
      if (!entry) {
        const serverConfig = this.entries.get(mcpTool.serverName)?.config;
        const permission = serverConfig?.permission;
        entry = {
          domainId: mcpDomainId(mcpTool.serverName),
          ...(permission ? { permissionDefaults: [{ action: `mcp__${mcpTool.serverName}__*`, effect: permission }] } : {}),
          tools: [],
        };
        byServer.set(mcpTool.serverName, entry);
      }
      entry.tools.push(this.buildToolDefinition(mcpTool));
    }

    return [...byServer.values()].map((entry) => ({
      id: entry.domainId,
      tools: entry.tools,
      ...(entry.permissionDefaults ? { permissionDefaults: entry.permissionDefaults } : {}),
    }));
  }

  private buildToolDefinition(mcpTool: McpRegisteredTool): ToolDefinition {
    const rawSchema = mcpTool.inputSchema as Record<string, unknown> | undefined;
    const inputSchema: JsonSchema7Object | undefined =
      rawSchema?.type === "object" ? (rawSchema as unknown as JsonSchema7Object) : undefined;

    return {
      id: mcpToolId(mcpTool.serverName, mcpTool.name),
      description: `[${mcpTool.serverName}] ${mcpTool.description || mcpTool.name}`,
      risk: "external" as ToolRisk,
      inputSchema,
      execute: async (input: unknown, _ctx: ToolContext) => {
        const client = this.clients.get(mcpTool.serverName);
        if (!client) throw new Error(`MCP server "${mcpTool.serverName}" not connected`);
        return client.callTool(mcpTool.name, input as Record<string, unknown> | undefined);
      },
    };
  }

  /** Get tool definitions for a specific server (lazy connect + discover) */
  async getServerTools(serverName: string): Promise<ToolDefinition[]> {
    if (!this.clients.has(serverName)) {
      await this.connectOne(serverName);
    }
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`MCP server "${serverName}" not connected`);

    const tools = await client.listTools();
    return tools.map((t) => {
      const rawSchema = t.inputSchema as Record<string, unknown> | undefined;
      return {
        id: mcpToolId(serverName, t.name),
        description: `[${serverName}] ${t.description || t.name}`,
        risk: "external" as ToolRisk,
        inputSchema: rawSchema?.type === "object" ? (rawSchema as unknown as JsonSchema7Object) : undefined,
        execute: async (input: unknown) => client.callTool(t.name, input as Record<string, unknown> | undefined),
      };
    });
  }

  disconnectAll(): void {
    for (const [, client] of this.clients) {
      client.disconnect();
    }
    this.clients.clear();
  }

  disconnect(name: string): void {
    const client = this.clients.get(name);
    if (client) {
      client.disconnect();
      this.clients.delete(name);
    }
  }

  getConnectedServers(): string[] {
    const names: string[] = [];
    for (const [name, client] of this.clients) {
      if (client.isConnected) names.push(name);
    }
    return names;
  }

  getClient(name: string): McpClient | undefined {
    return this.clients.get(name);
  }

  /** Discover tools, prompts, and resources from all connected servers in one call. */
  async discoverAll(): Promise<{
    tools: McpRegisteredTool[];
    prompts: McpRegisteredPrompt[];
    resources: McpRegisteredResource[];
  }> {
    const [tools, prompts, resources] = await Promise.all([
      this.discoverTools(),
      this.discoverPrompts(),
      this.discoverResources(),
    ]);
    return { tools, prompts, resources };
  }

  /** Notify all connected MCP servers that the tool list has changed. */
  async notifyToolsChanged(): Promise<void> {
    const servers = this.getConnectedServers();
    const results = await Promise.allSettled(
      servers.map(async (name) => {
        const client = this.getClient(name);
        if (client?.isConnected) {
          await client.notifyToolsChanged();
        }
      }),
    );
    // Log failures but don't throw — best-effort notification
    for (const [i, result] of results.entries()) {
      if (result.status === "rejected") {
        console.error(`[MCP] Failed to notify ${servers[i]} of tool changes:`, result.reason);
      }
    }
  }
}

