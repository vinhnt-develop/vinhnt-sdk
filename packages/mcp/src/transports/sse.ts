/**
 * MCP SSE Transport — communicates with MCP servers over Server-Sent Events.
 * Placeholder — full implementation requires HTTP client with SSE support.
 */

import type { McpTransport, McpServerConfig, JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from "../types.js";

export class SseTransport implements McpTransport {
  constructor(_config: McpServerConfig) {
    throw new Error("SSE transport not yet implemented — use stdio or contribute an implementation");
  }

  async request(_req: JsonRpcRequest): Promise<JsonRpcResponse> {
    throw new Error("SSE transport not yet implemented");
  }

  notify(_notification: JsonRpcNotification): void {
    throw new Error("SSE transport not yet implemented");
  }

  onMessage(_handler: (msg: JsonRpcResponse | JsonRpcNotification) => void): () => void {
    return () => {};
  }

  async close(): Promise<void> {}
}
