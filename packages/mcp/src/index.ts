/**
 * @module mcp
 * MCP (Model Context Protocol) client/server for vinhnt-sdk.
 *
 * Capability Seam:
 *   Service Definition (McpClient, McpConnection)
 *     → Transport (stdio, SSE, Streamable HTTP)
 *       → Tool Mapper (MCP tools → vinhnt-sdk ToolDefinition)
 *         → Consumer (core kernel, agent loop)
 */

export { McpClient } from "./client.js";
export type { McpConnection } from "./client.js";

export { mapMcpTool, discoverMcpTools, mcpDomain, mcpToolId } from "./tool-mapper.js";

export type {
  McpServerConfig,
  McpTool,
  McpResource,
  McpTransportType,
  McpTransport,
  CallToolResult,
  ListToolsResult,
  InitializeRequest,
  InitializeResult,
} from "./types.js";
