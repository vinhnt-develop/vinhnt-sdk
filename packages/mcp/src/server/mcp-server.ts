import type { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from "@vinhnt-sdk/schema";
import type { ToolDefinition, ToolContext } from "@vinhnt-sdk/tools";
import { mapToolDefinitionToMcp } from "../tool-mapper.js";
import type { InitializeResult, ListToolsResult, CallToolResult } from "../types.js";

/** MCP protocol version this server speaks (2026-07-28 stateless revision). */
export const MCP_DEFAULT_PROTOCOL_VERSION = "2026-07-28";

const JSONRPC_METHOD_NOT_FOUND = -32601;
const JSONRPC_INVALID_PARAMS = -32602;
const JSONRPC_INTERNAL_ERROR = -32603;

export type McpToolExecutor = (tool: ToolDefinition, args: Record<string, unknown>) => Promise<unknown>;

export interface McpServerOptions {
  readonly name: string;
  readonly version?: string;
  readonly protocolVersion?: string;
  readonly tools: readonly ToolDefinition[];
  /**
   * How `tools/call` executes a tool. Defaults to `tool.execute(args, ctx)`
   * with a minimal server-side context (no approval UI — `ctx.ask` fails
   * closed to "reject"). Apps with tools that need workspace/sandbox/ask
   * inject their own executor (the SDK never invents those for you).
   */
  readonly executeTool?: McpToolExecutor;
}

class McpRpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = "McpRpcError";
  }
}

/** Minimal fail-closed ToolContext for the default executor (no approval UI). */
function createServerToolContext(): ToolContext {
  return {
    sessionId: "mcp-server",
    runId: "mcp-server",
    agentId: "mcp-server",
    agentName: "MCP Server",
    signal: new AbortController().signal,
    env: {},
    async ask() {
      return "reject";
    },
    metadata() {},
    setCompensation() {},
  };
}

function toCallToolResult(output: unknown): CallToolResult {
  if (output === undefined || output === null) return { content: [] };
  if (typeof output === "string") return { content: [{ type: "text", text: output }] };
  if (typeof output === "object" && Array.isArray((output as CallToolResult).content)) {
    return output as CallToolResult;
  }
  return { content: [{ type: "text", text: JSON.stringify(output) }] };
}

/**
 * Stateless MCP server (2026-07-28): a pure `dispatch()` method table over
 * `initialize`/`ping`/`tools/list`/`tools/call` plus notification handling.
 * No session map, no notifications stream — load-balancer friendly; wire it
 * to any transport (stdio below, HTTP in your app).
 */
export class McpServer {
  private readonly tools: readonly ToolDefinition[];
  private readonly executeTool: McpToolExecutor;

  constructor(private readonly options: McpServerOptions) {
    this.tools = options.tools;
    this.executeTool =
      options.executeTool ??
      (async (tool, args) => tool.execute(args, createServerToolContext()));
  }

  /** Handle a JSON-RPC request; never throws (handler errors → error responses). */
  async dispatch(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    try {
      const result = await this.handle(request.method, request.params);
      return { jsonrpc: "2.0", id: request.id, result };
    } catch (error) {
      if (error instanceof McpRpcError) {
        return { jsonrpc: "2.0", id: request.id, error: { code: error.code, message: error.message } };
      }
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: JSONRPC_INTERNAL_ERROR, message: error instanceof Error ? error.message : "Internal error" },
      };
    }
  }

  /** Handle a JSON-RPC notification (`notifications/initialized`, …) — unknown ones are ignored. */
  async handleNotification(_notification: JsonRpcNotification): Promise<void> {
    // Stateless server: nothing to track per-session; accepted and dropped.
  }

  private async handle(method: string, params: unknown): Promise<unknown> {
    switch (method) {
      case "initialize": {
        const result: InitializeResult = {
          protocolVersion: this.options.protocolVersion ?? MCP_DEFAULT_PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: this.options.name, version: this.options.version ?? "0.1.0" },
        };
        return result;
      }
      case "ping":
        return {};
      case "tools/list": {
        const result: ListToolsResult = { tools: this.tools.map(mapToolDefinitionToMcp) };
        return result;
      }
      case "tools/call":
        return this.callTool(params);
      default:
        throw new McpRpcError(JSONRPC_METHOD_NOT_FOUND, `Method not found: ${method}`);
    }
  }

  private async callTool(params: unknown): Promise<CallToolResult> {
    const call = (params ?? {}) as { name?: unknown; arguments?: unknown };
    const name = typeof call.name === "string" ? call.name : undefined;
    if (name === undefined) throw new McpRpcError(JSONRPC_INVALID_PARAMS, "tools/call requires params.name");
    const tool = this.tools.find((t) => (t.name !== undefined && t.name.length > 0 ? t.name : t.id) === name);
    if (tool === undefined) throw new McpRpcError(JSONRPC_INVALID_PARAMS, `Unknown tool: ${name}`);
    const args = (call.arguments ?? {}) as Record<string, unknown>;
    try {
      return toCallToolResult(await this.executeTool(tool, args));
    } catch (error) {
      // Tool execution failures are RESULTS (isError), not protocol errors.
      return {
        content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  }
}
