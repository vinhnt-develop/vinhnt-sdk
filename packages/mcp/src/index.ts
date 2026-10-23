/**
 * @module mcp
 * MCP (Model Context Protocol) client/server for vinhnt-sdk.
 *
 * MCP 2026-07-28: Stateless by default, MRTR, resources/prompts deprecated.
 *
 * Capability Seam:
 *   Service Definition (McpClient, McpConnection)
 *     → Transport (stdio, SSE, Streamable HTTP)
 *       → Tool Mapper (MCP tools → vinhnt-sdk ToolDefinition)
 *         → Consumer (core kernel, agent loop)
 */

export { McpClient } from "./client.js";
export type { McpConnection } from "./client.js";

export { McpToolProvider } from "./mcp-provider.js";
export type { McpToolProviderConfig } from "./mcp-provider.js";

export {
  mapMcpTool,
  mapToolDefinitionToMcp,
  discoverMcpTools,
  filterMcpTools,
  searchMcpTools,
  createMcpSearchTool,
  capMcpOutput,
  mcpDomain,
  mcpToolId,
  DEFAULT_MCP_MAX_OUTPUT_BYTES,
  DEFAULT_MCP_SEARCH_LIMIT,
} from "./tool-mapper.js";
export type {
  McpOutputPolicy,
  DiscoverMcpToolsOptions,
  McpToolSearchResult,
} from "./tool-mapper.js";

export type {
  McpServerConfig,
  McpGovernanceConfig,
  McpTool,
  McpResource,
  McpTransportType,
  McpTransport,
  CallToolResult,
} from "./types.js";

export { McpServer, MCP_DEFAULT_PROTOCOL_VERSION } from "./server/mcp-server.js";
export type { McpServerOptions, McpToolExecutor } from "./server/mcp-server.js";

export { McpStdioServer } from "./server/stdio-server.js";
export type { McpStdioServerOptions } from "./server/stdio-server.js";

export {
  discoverAgentCard,
  A2A_AGENT_CARD_WELL_KNOWN_PATH,
} from "./a2a/discovery.js";
export type {
  AgentCardDocument,
  DiscoverAgentCardOptions,
} from "./a2a/discovery.js";

export {
  KNOWN_TASK_STATES,
  isKnownTaskState,
  isTerminalTaskState,
} from "./a2a/types.js";
export type {
  AgentCard,
  AgentInterface,
  AgentCapabilities,
  AgentSkill,
  AgentSecurityScheme,
  A2AProtocolBinding,
  TaskState,
} from "./a2a/types.js";
