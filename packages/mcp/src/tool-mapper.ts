/**
 * MCP Tool Mapper — converts MCP tools to vinhnt-sdk ToolDefinition format.
 *
 * This bridges the MCP tool model with the vinhnt-sdk tool model,
 * allowing MCP server tools to be used as native tools in the agent loop.
 */

import type { ToolDefinition } from "@vinhnt-sdk/tools";
import type { McpTool, CallToolResult } from "./types.js";
import type { McpConnection } from "./client.js";

/**
 * Derive the MCP domain from a server name.
 * Convention: `mcp__<server>__<tool>` → domain `"mcp:<server>"`
 */
export function mcpDomain(serverName: string): string {
  return `mcp:${serverName}`;
}

/**
 * Create a tool ID for an MCP tool.
 * Convention: `mcp__<server>__<tool>`
 */
export function mcpToolId(serverName: string, toolName: string): string {
  return `mcp__${serverName}__${toolName}`;
}

/**
 * Map an MCP tool to a vinhnt-sdk ToolDefinition.
 *
 * @param serverName - Name of the MCP server
 * @param mcpTool - The MCP tool definition
 * @param connection - The MCP connection to call the tool
 * @returns A ToolDefinition compatible with vinhnt-sdk
 */
export function mapMcpTool(
  serverName: string,
  mcpTool: McpTool,
  connection: McpConnection,
): ToolDefinition {
  const id = mcpToolId(serverName, mcpTool.name);

  return {
    id,
    name: mcpTool.name,
    description: mcpTool.description ?? `MCP tool: ${mcpTool.name}`,
    risk: "external",
    inputSchema: mcpTool.inputSchema as unknown as ToolDefinition["inputSchema"],
    async execute(args: unknown, ctx) {
      ctx?.metadata({ title: id, metadata: { server: serverName, mcp: true } });

      const result = await connection.callTool(mcpTool.name, args as Record<string, unknown>);

      if (result.isError) {
        const errorContent = result.content.find((c) => c.type === "text");
        throw new Error(errorContent?.type === "text" ? errorContent.text : `MCP tool ${mcpTool.name} failed`);
      }

      // Extract text content
      const textParts = result.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map((c) => c.text);

      return textParts.join("\n");
    },
  };
}

/**
 * Discover and map all tools from an MCP server.
 *
 * @param serverName - Name of the MCP server
 * @param connection - The MCP connection
 * @returns Array of ToolDefinitions
 */
export async function discoverMcpTools(
  serverName: string,
  connection: McpConnection,
): Promise<ToolDefinition[]> {
  const tools = await connection.listTools();
  return tools.map((tool) => mapMcpTool(serverName, tool, connection));
}
