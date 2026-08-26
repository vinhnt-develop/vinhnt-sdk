/**
 * MCP (Model Context Protocol) types — compatible with the MCP specification.
 *
 * This module defines the wire-format types for MCP communication.
 * JSON-RPC base types are imported from @vinhnt-sdk/schema (single source of truth).
 */

import type { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from "@vinhnt-sdk/schema";

// ── Re-export JSON-RPC types for backward compatibility ──
export type { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from "@vinhnt-sdk/schema";

// ── MCP Initialization ──

export interface InitializeRequest {
  readonly protocolVersion: string;
  readonly capabilities: Record<string, unknown>;
  readonly clientInfo: { readonly name: string; readonly version: string };
}

export interface InitializeResult {
  readonly protocolVersion: string;
  readonly capabilities: {
    readonly tools?: { readonly listChanged?: boolean };
    readonly resources?: { readonly subscribe?: boolean; readonly listChanged?: boolean };
    readonly logging?: Record<string, unknown>;
  };
  readonly serverInfo: { readonly name: string; readonly version: string };
}

// ── MCP Tool ──

export interface McpTool {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: Record<string, unknown>;
  readonly annotations?: Record<string, unknown>;
}

export interface ListToolsResult {
  readonly tools: readonly McpTool[];
  readonly nextCursor?: string;
}

export interface CallToolResult {
  readonly content: ReadonlyArray<
    | { readonly type: "text"; readonly text: string }
    | { readonly type: "image"; readonly data: string; readonly mimeType: string }
    | { readonly type: "resource"; readonly resource: { readonly uri: string; readonly mimeType?: string; readonly text?: string } }
  >;
  readonly isError?: boolean;
}

// ── MCP Resource ──

export interface McpResource {
  readonly uri: string;
  readonly name: string;
  readonly description?: string;
  readonly mimeType?: string;
}

export interface ReadResourceResult {
  readonly contents: ReadonlyArray<{ readonly uri: string; readonly mimeType?: string; readonly text?: string }>;
}

// ── MCP Transport ──

export type McpTransportType = "stdio" | "sse" | "streamable-http";

export interface McpTransport {
  request(req: JsonRpcRequest): Promise<JsonRpcResponse>;
  notify(notification: JsonRpcNotification): void;
  onMessage(handler: (msg: JsonRpcResponse | JsonRpcNotification) => void): () => void;
  close(): Promise<void>;
}

// ── MCP Server Config ──

export interface McpServerConfig {
  readonly name: string;
  readonly transport: "stdio" | "sse" | "streamable-http";
  readonly command?: string;
  readonly args?: string[];
  readonly env?: Record<string, string>;
  readonly url?: string;
  readonly headers?: Record<string, string>;
  readonly timeoutMs?: number;
  readonly metadata?: Record<string, unknown>;
}
