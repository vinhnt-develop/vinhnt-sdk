/**
 * MCP Client — Service Definition for connecting to MCP servers.
 *
 * MCP 2026-07-28 spec changes:
 * - Stateless by default (no session tracking)
 * - MRTR (Model-Relative Tool Registration) replaces server-initiated requests
 * - Sampling and Roots are deprecated (use tool calls instead)
 * - Resources and Prompts are now tools (unified interface)
 *
 * Capability Seam:
 *   Service Definition (this module) → Transport (stdio, SSE, HTTP) → Consumer (core kernel)
 */

import type { McpServerConfig, McpTool, CallToolResult, McpResource } from "./types.js";

/**
 * Result of connecting to an MCP server.
 */
export interface McpConnection {
  /** Server info from initialize handshake. */
  readonly serverInfo: { name: string; version: string };
  /** Server capabilities. */
  readonly capabilities: Record<string, unknown>;
  /** Protocol version negotiated. */
  readonly protocolVersion: string;
  /** List tools exposed by the server. */
  listTools(): Promise<McpTool[]>;
  /** Call a tool on the server. */
  callTool(name: string, args?: Record<string, unknown>): Promise<CallToolResult>;
  /** List resources exposed by the server (deprecated in 2026-07-28, prefer tools). */
  listResources(): Promise<McpResource[]>;
  /** Read a resource from the server (deprecated in 2026-07-28, prefer tools). */
  readResource(uri: string): Promise<string>;
  /** List prompts exposed by the server (deprecated in 2026-07-28, prefer tools). */
  listPrompts(): Promise<Array<{ name: string; description?: string; arguments?: unknown[] }>>;
  /** Get a prompt from the server (deprecated in 2026-07-28, prefer tools). */
  getPrompt(name: string, args?: Record<string, unknown>): Promise<string>;
  /** Disconnect from the server. */
  close(): Promise<void>;
}

/**
 * MCP Client — connects to MCP servers and provides tool/resource access.
 *
 * MCP 2026-07-28: Stateless by default, no session tracking.
 *
 * @example
 * ```ts
 * const client = new McpClient();
 * const conn = await client.connect({
 *   name: "my-server",
 *   command: "node",
 *   args: ["./server.js"],
 * });
 * const tools = await conn.listTools();
 * const result = await conn.callTool("read_file", { path: "/etc/passwd" });
 * await conn.close();
 * ```
 */
export class McpClient {
  private readonly connections = new Map<string, McpConnection>();

  /**
   * Connect to an MCP server.
   * @param config - Server configuration
   * @returns A connection handle
   */
  async connect(config: McpServerConfig): Promise<McpConnection> {
    const transport = await this.createTransport(config);
    const conn = await this.initialize(transport, config);
    this.connections.set(config.name, conn);
    return conn;
  }

  /**
   * Get an existing connection by server name.
   */
  getConnection(name: string): McpConnection | undefined {
    return this.connections.get(name);
  }

  /**
   * Close all connections.
   */
  async closeAll(): Promise<void> {
    for (const conn of this.connections.values()) {
      await conn.close();
    }
    this.connections.clear();
  }

  private async createTransport(config: McpServerConfig): Promise<import("./types.js").McpTransport> {
    const transportType = config.transport ?? "stdio";

    switch (transportType) {
      case "stdio": {
        const { StdioTransport } = await import("./transports/stdio.js");
        return new StdioTransport(config);
      }
      case "sse": {
        const { SseTransport } = await import("./transports/sse.js");
        return new SseTransport(config);
      }
      case "streamable-http": {
        const { StreamableHttpTransport } = await import("./transports/streamable-http.js");
        return new StreamableHttpTransport(config);
      }
      default:
        throw new Error(`Unsupported MCP transport: ${transportType}`);
    }
  }

  private async initialize(
    transport: import("./types.js").McpTransport,
    config: McpServerConfig,
  ): Promise<McpConnection> {
    const timeoutMs = config.timeoutMs ?? 30_000;
    const protocolVersion = config.protocolVersion ?? "2026-07-28";

    // Send initialize request (MCP 2026-07-28)
    const initResponse = await transport.request({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion,
        capabilities: {},
        clientInfo: { name: "vinhnt-sdk", version: "0.4.0" },
      },
    });

    if (initResponse.error) {
      throw new Error(`MCP initialize failed: ${initResponse.error.message}`);
    }

    const initResult = initResponse.result as {
      serverInfo: { name: string; version: string };
      capabilities: Record<string, unknown>;
      protocolVersion?: string;
    };

    // Send initialized notification
    transport.notify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });

    let requestId = 2;

    const request = async (method: string, params?: unknown): Promise<unknown> => {
      const response = await transport.request({
        jsonrpc: "2.0",
        id: requestId++,
        method,
        params,
      });
      if (response.error) {
        throw new Error(`MCP ${method} failed: ${response.error.message}`);
      }
      return response.result;
    };

    return {
      serverInfo: initResult.serverInfo,
      capabilities: initResult.capabilities,
      protocolVersion: initResult.protocolVersion ?? protocolVersion,

      async listTools(): Promise<McpTool[]> {
        const result = (await request("tools/list")) as { tools: McpTool[] };
        return result.tools ?? [];
      },

      async callTool(name: string, args?: Record<string, unknown>): Promise<CallToolResult> {
        return (await request("tools/call", { name, arguments: args })) as CallToolResult;
      },

      async listResources(): Promise<McpResource[]> {
        const result = (await request("resources/list")) as { resources: McpResource[] };
        return result.resources ?? [];
      },

      async readResource(uri: string): Promise<string> {
        const result = (await request("resources/read", { uri })) as {
          contents: Array<{ uri: string; mimeType?: string; text?: string }>;
        };
        return result.contents?.[0]?.text ?? "";
      },

      async listPrompts(): Promise<Array<{ name: string; description?: string; arguments?: unknown[] }>> {
        const result = (await request("prompts/list")) as { prompts: Array<{ name: string; description?: string; arguments?: unknown[] }> };
        return result.prompts ?? [];
      },

      async getPrompt(name: string, args?: Record<string, unknown>): Promise<string> {
        const result = (await request("prompts/get", { name, arguments: args })) as {
          messages: Array<{ role: string; content: string }>;
        };
        return result.messages?.[0]?.content ?? "";
      },

      async close(): Promise<void> {
        await transport.close();
      },
    };
  }
}
