/**
 * JSON-RPC 2.0 types — shared between MCP and LSP packages.
 *
 * These are the wire-format types for JSON-RPC communication.
 */

/** JSON-RPC 2.0 base message. */
export interface JsonRpcMessage {
  readonly jsonrpc: "2.0";
}

/** JSON-RPC 2.0 request. */
export interface JsonRpcRequest extends JsonRpcMessage {
  readonly id: number | string;
  readonly method: string;
  readonly params?: unknown;
}

/** JSON-RPC 2.0 response. */
export interface JsonRpcResponse extends JsonRpcMessage {
  readonly id: number | string;
  readonly result?: unknown;
  readonly error?: JsonRpcError;
}

/** JSON-RPC 2.0 error object. */
export interface JsonRpcError {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

/** JSON-RPC 2.0 notification (request without id). */
export interface JsonRpcNotification extends JsonRpcMessage {
  readonly method: string;
  readonly params?: unknown;
}
