/**
 * MCP Tool Mapper — converts MCP tools to vinhnt-sdk ToolDefinition format.
 *
 * This bridges the MCP tool model with the vinhnt-sdk tool model,
 * allowing MCP server tools to be used as native tools in the agent loop.
 *
 * Governance (additive):
 * - per-server allowlist/denylist before mapping
 * - text output cap with full-output file spill
 * - catalog search helper (synthetic `search_tools`) for large catalogs
 */

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolDefinition } from "@vinhnt-sdk/tools";
import type { McpTool, McpGovernanceConfig } from "./types.js";
import type { McpConnection } from "./client.js";

/** Default text output cap before spilling (64 KiB). */
export const DEFAULT_MCP_MAX_OUTPUT_BYTES = 64 * 1024;

/** Default number of search results returned by the synthetic search tool. */
export const DEFAULT_MCP_SEARCH_LIMIT = 20;

/** Output cap/spill policy for a mapped MCP tool. */
export interface McpOutputPolicy {
  readonly maxOutputBytes?: number;
  readonly spillDir?: string;
}

/** Options for {@link discoverMcpTools}. */
export interface DiscoverMcpToolsOptions extends McpOutputPolicy {
  readonly governance?: McpGovernanceConfig;
}

/** A catalog search hit. */
export interface McpToolSearchResult {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly server: string;
}

/**
 * Inverse mapper: SDK `ToolDefinition` → MCP `McpTool` for `tools/list`.
 *
 * Wire invariant (AGENTS.md §2b): provenance (`risk`, `metadata.source`,
 * icons, category) NEVER crosses the wire — only name/description/schema.
 */
export function mapToolDefinitionToMcp(tool: ToolDefinition): McpTool {
  return {
    name: tool.name !== undefined && tool.name.length > 0 ? tool.name : tool.id,
    ...(tool.description.length > 0 ? { description: tool.description } : {}),
    inputSchema: (tool.inputSchema ?? { type: "object" }) as Record<string, unknown>,
    ...(tool.annotations !== undefined
      ? { annotations: tool.annotations as unknown as Record<string, unknown> }
      : {}),
  };
}

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
 * Apply a per-server allowlist/denylist to raw MCP tool definitions.
 *
 * Matching is by the raw MCP tool name (not the namespaced SDK id).
 * An empty `allowedTools` array exposes no tools.
 */
export function filterMcpTools(
  tools: readonly McpTool[],
  governance?: McpGovernanceConfig,
): McpTool[] {
  const allowed = governance?.allowedTools;
  const denied = governance?.deniedTools;
  if (allowed === undefined && denied === undefined) return [...tools];

  return tools.filter((tool) => {
    if (allowed !== undefined && !allowed.includes(tool.name)) return false;
    if (denied !== undefined && denied.includes(tool.name)) return false;
    return true;
  });
}

function resolveMaxOutputBytes(policy?: McpOutputPolicy): number {
  const configured = policy?.maxOutputBytes ?? DEFAULT_MCP_MAX_OUTPUT_BYTES;
  return configured > 0 ? configured : Number.POSITIVE_INFINITY;
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "tool";
}

async function spillOutput(
  serverName: string,
  toolName: string,
  text: string,
  policy?: McpOutputPolicy,
): Promise<string> {
  const dir = policy?.spillDir ?? join(tmpdir(), "vinhnt-mcp-spill");
  await mkdir(dir, { recursive: true });
  const file = join(
    dir,
    `${safeFilePart(serverName)}-${safeFilePart(toolName)}-${Date.now()}-${randomUUID()}.txt`,
  );
  await writeFile(file, text, "utf8");
  return file;
}

/**
 * Cap a text tool result. When the output exceeds the cap, the full text is
 * spilled to a file and the model receives a head slice plus the file path.
 */
export async function capMcpOutput(
  serverName: string,
  toolName: string,
  text: string,
  policy?: McpOutputPolicy,
): Promise<string> {
  const maxBytes = resolveMaxOutputBytes(policy);
  if (!Number.isFinite(maxBytes)) return text;

  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes <= maxBytes) return text;

  let spillPath: string | undefined;
  try {
    spillPath = await spillOutput(serverName, toolName, text, policy);
  } catch {
    // Spilling is best-effort: never fail a tool call because disk is unavailable.
  }

  const head = Buffer.from(text, "utf8").subarray(0, maxBytes).toString("utf8");
  const notice = spillPath
    ? `\n\n[MCP output truncated: ${bytes} bytes; full output spilled to ${spillPath}]`
    : `\n\n[MCP output truncated: ${bytes} bytes; full output could not be spilled]`;
  return `${head}${notice}`;
}

/**
 * Search a mapped MCP catalog by name/description. Used by the synthetic
 * `mcp__<server>__search_tools` tool when the catalog is large.
 */
export function searchMcpTools(
  tools: readonly ToolDefinition[],
  query: string,
  limit = DEFAULT_MCP_SEARCH_LIMIT,
): McpToolSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return [];
  const tokens = normalized.split(/\s+/).filter(Boolean);

  return tools
    .map((tool) => {
      const name = tool.name ?? tool.id;
      const nameLower = name.toLowerCase();
      const descLower = tool.description.toLowerCase();
      let score = nameLower.includes(normalized) ? 4 : 0;
      if (descLower.includes(normalized)) score += 2;
      for (const token of tokens) {
        if (nameLower.includes(token)) score += 2;
        if (descLower.includes(token)) score += 1;
      }
      return {
        tool,
        score,
        result: {
          id: tool.id,
          name,
          description: tool.description,
          server: String(tool.metadata?.server ?? ""),
        } satisfies McpToolSearchResult,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.result.id.localeCompare(b.result.id))
    .slice(0, Math.max(1, limit))
    .map((entry) => entry.result);
}

/** Create the synthetic catalog-search tool for a large MCP catalog. */
export function createMcpSearchTool(
  serverName: string,
  tools: readonly ToolDefinition[],
): ToolDefinition<{ query: string; limit?: number }, { results: McpToolSearchResult[] }> {
  const id = mcpToolId(serverName, "search_tools");
  return {
    id,
    name: id,
    description: `Search the "${serverName}" MCP tool catalog by name or description. Use this when the catalog is large and the right tool is not obvious.`,
    risk: "read",
    tags: ["mcp", "search"],
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for MCP tool names/descriptions" },
        limit: { type: "number", description: `Maximum results (default ${DEFAULT_MCP_SEARCH_LIMIT})` },
      },
      required: ["query"],
    } as ToolDefinition["inputSchema"],
    metadata: { source: "mcp", server: serverName, synthetic: true },
    async execute(input) {
      const query = typeof input?.query === "string" ? input.query : "";
      const limit = typeof input?.limit === "number" ? input.limit : undefined;
      return { results: searchMcpTools(tools, query, limit) };
    },
  };
}

/**
 * Map an MCP tool to a vinhnt-sdk ToolDefinition.
 *
 * @param serverName - Name of the MCP server
 * @param mcpTool - The MCP tool definition
 * @param connection - The MCP connection to call the tool
 * @param policy - Optional output cap/spill policy
 * @returns A ToolDefinition compatible with vinhnt-sdk
 */
export function mapMcpTool(
  serverName: string,
  mcpTool: McpTool,
  connection: McpConnection,
  policy?: McpOutputPolicy,
): ToolDefinition {
  const id = mcpToolId(serverName, mcpTool.name);

  return {
    id,
    // Namespaced wire name (industry: mcp__server__tool) so model calls match dispatch.
    name: id,
    description: mcpTool.description ?? `MCP tool from server "${serverName}": ${mcpTool.name}`,
    risk: "external",
    inputSchema: mcpTool.inputSchema as unknown as ToolDefinition["inputSchema"],
    metadata: { source: "mcp", server: serverName, mcpName: mcpTool.name },
    ...(mcpTool.annotations
      ? { annotations: mcpTool.annotations as unknown as ToolDefinition["annotations"] }
      : {}),
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

      return capMcpOutput(serverName, mcpTool.name, textParts.join("\n"), policy);
    },
  };
}

/**
 * Discover and map all tools from an MCP server, applying governance.
 *
 * @param serverName - Name of the MCP server
 * @param connection - The MCP connection
 * @param options - Allowlist/denylist, output policy, and search threshold
 * @returns Array of ToolDefinitions
 */
export async function discoverMcpTools(
  serverName: string,
  connection: McpConnection,
  options?: DiscoverMcpToolsOptions,
): Promise<ToolDefinition[]> {
  const discovered = await connection.listTools();
  const filtered = filterMcpTools(discovered, options?.governance);

  const maxOutputBytes = options?.maxOutputBytes ?? options?.governance?.maxOutputBytes;
  const spillDir = options?.spillDir ?? options?.governance?.spillDir;
  const outputPolicy: McpOutputPolicy | undefined =
    maxOutputBytes === undefined && spillDir === undefined
      ? undefined
      : {
          ...(maxOutputBytes !== undefined ? { maxOutputBytes } : {}),
          ...(spillDir !== undefined ? { spillDir } : {}),
        };

  const mapped = filtered.map((tool) => mapMcpTool(serverName, tool, connection, outputPolicy));

  const threshold = options?.governance?.searchThreshold;
  if (threshold !== undefined && mapped.length >= threshold) {
    mapped.push(createMcpSearchTool(serverName, mapped));
  }
  return mapped;
}
