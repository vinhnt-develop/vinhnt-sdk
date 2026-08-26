/**
 * MCP Client — Service Definition for connecting to MCP servers.
 *
 * This is the "Service Definition" in the capability seam pattern.
 * Transport implementations (stdio, SSE, Streamable HTTP) provide
 * the actual connection.
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
  /** List tools exposed by the server. */
  listTools(): Promise<McpTool[]>;
  /** Call a tool on the server. */
  callTool(name: string, args?: Record<string, unknown>): Promise<CallToolResult>;
  /** List resources exposed by the server. */
  listResources(): Promise<McpResource[]>;
  /** Read a resource from the server. */
  readResource(uri: string): Promise<string>;
  /** Disconnect from the server. */
  close(): Promise<void>;
}

/**
 * MCP Client — connects to MCP servers and provides tool/resource access.
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

    // Send initialize request
    const initResponse = await transport.request({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "vinhnt-sdk", version: "0.1.3" },
      },
    });

    if (initResponse.error) {
      throw new Error(`MCP initialize failed: ${initResponse.error.message}`);
    }

    const initResult = initResponse.result as {
      serverInfo: { name: string; version: string };
      capabilities: Record<string, unknown>;
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

      async close(): Promise<void> {
        await transport.close();
      },
    };
  }
}
