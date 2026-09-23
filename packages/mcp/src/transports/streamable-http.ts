/**
 * MCP Streamable HTTP Transport — MCP 2026-07-28.
 *
 * POST JSON-RPC messages to a single MCP endpoint.
 * Response may be application/json (single response) or text/event-stream (SSE).
 * Session managed via Mcp-Session-Id header when server provides one.
 * Auth headers passthrough from config.headers.
 */

import type {
  McpTransport,
  McpServerConfig,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification,
} from "../types.js";

interface PendingRequest {
  resolve: (res: JsonRpcResponse) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class StreamableHttpTransport implements McpTransport {
  private readonly url: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;
  private sessionId: string | null = null;
  private closed = false;
  private readonly pending = new Map<number | string, PendingRequest>();
  private readonly handlers = new Set<(msg: JsonRpcResponse | JsonRpcNotification) => void>();
  private getStreamAbort: AbortController | null = null;

  constructor(config: McpServerConfig) {
    if (!config.url) {
      throw new Error("streamable-http transport requires config.url");
    }
    this.url = config.url;
    this.headers = { ...(config.headers ?? {}) };
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  async request(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (this.closed) {
      throw new Error("MCP transport closed");
    }

    // Track pending so close() can reject it
    let trackedResolve!: (res: JsonRpcResponse) => void;
    let trackedReject!: (err: Error) => void;
    const trackedPromise = new Promise<JsonRpcResponse>((resolve, reject) => {
      trackedResolve = resolve;
      trackedReject = reject;
    });
    const timer = setTimeout(() => {
      this.pending.delete(req.id);
      trackedReject(new Error(`MCP streamable-http: request ${req.method} timed out after ${this.timeoutMs}ms`));
    }, this.timeoutMs);
    this.pending.set(req.id, { resolve: trackedResolve, reject: trackedReject, timer });

    // Run fetch in background so close() can reject trackedPromise immediately
    void (async () => {
      try {
        const body = JSON.stringify(req);
        const headers: Record<string, string> = {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          ...this.headers,
        };
        if (this.sessionId) {
          headers["mcp-session-id"] = this.sessionId;
        }

        const res = await fetch(this.url, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        // Capture session id if server returns one
        const sid = res.headers.get("mcp-session-id");
        if (sid) {
          this.sessionId = sid;
        }

        if (res.status === 202 || res.status === 204) {
          throw new Error(`MCP streamable-http: unexpected ${res.status} for request ${req.method}`);
        }

        const contentType = res.headers.get("content-type") ?? "";

        if (contentType.includes("text/event-stream")) {
          const result = await this.readSseResponse(res, req.id);
          this.pending.delete(req.id);
          clearTimeout(timer);
          trackedResolve(result);
          return;
        }

        // application/json (or other) — single JSON body
        const text = await res.text();
        if (!text) {
          throw new Error(`MCP streamable-http: empty response for ${req.method}`);
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error(`MCP streamable-http: invalid JSON response for ${req.method}`);
        }
        const result = this.validateResponse(parsed, req.id);
        this.pending.delete(req.id);
        clearTimeout(timer);
        trackedResolve(result);
      } catch (err) {
        this.pending.delete(req.id);
        clearTimeout(timer);
        trackedReject(err instanceof Error ? err : new Error(String(err)));
      }
    })();

    return trackedPromise;
  }

  notify(notification: JsonRpcNotification): void {
    if (this.closed) return;
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...this.headers,
    };
    if (this.sessionId) {
      headers["mcp-session-id"] = this.sessionId;
    }
    // Fire-and-forget — interface is sync void
    void fetch(this.url, {
      method: "POST",
      headers,
      body: JSON.stringify(notification),
      signal: AbortSignal.timeout(this.timeoutMs),
    })
      .then((res) => {
        const sid = res.headers.get("mcp-session-id");
        if (sid) this.sessionId = sid;
        // Drain body to free socket
        return res.text().catch(() => undefined);
      })
      .catch(() => {
        // Notifications are best-effort
      });
  }

  onMessage(handler: (msg: JsonRpcResponse | JsonRpcNotification) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;

    // Abort any open GET SSE stream
    this.getStreamAbort?.abort();
    this.getStreamAbort = null;

    // Reject all pending requests
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error("MCP transport closed"));
    }
    this.pending.clear();
    this.handlers.clear();

    // DELETE session if we have one
    if (this.sessionId) {
      try {
        const headers: Record<string, string> = { ...this.headers, "mcp-session-id": this.sessionId };
        await fetch(this.url, {
          method: "DELETE",
          headers,
          signal: AbortSignal.timeout(5_000),
        });
      } catch {
        // Best-effort session cleanup
      }
      this.sessionId = null;
    }
  }

  /**
   * Read an SSE response stream until the matching JSON-RPC response arrives.
   */
  private async readSseResponse(res: Response, requestId: number | string): Promise<JsonRpcResponse> {
    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error("MCP streamable-http: no response body for SSE");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events separated by blank lines
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const msg = this.parseSseEvent(part);
          if (!msg) continue;

          // Check if this is the response for our request
          if ("id" in msg && msg.id !== undefined) {
            if (msg.id === requestId) {
              return msg as JsonRpcResponse;
            }
            // Response for a different id — route via handlers (shouldn't normally happen for POST response)
            this.dispatch(msg);
          } else {
            // Notification from server
            this.dispatch(msg);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    throw new Error(`MCP streamable-http: SSE stream ended without response for id ${String(requestId)}`);
  }

  /**
   * Parse a single SSE event block into a JSON-RPC message.
   * Returns null if not parseable or not a JSON-RPC message.
   */
  private parseSseEvent(block: string): JsonRpcResponse | JsonRpcNotification | null {
    let event = "message";
    const dataLines: string[] = [];

    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (dataLines.length === 0) return null;
    const data = dataLines.join("\n");
    if (!data) return null;

    try {
      const parsed = JSON.parse(data) as JsonRpcResponse | JsonRpcNotification;
      if (typeof parsed !== "object" || parsed === null || !("jsonrpc" in parsed)) {
        return null;
      }
      // Skip non-JSON-RPC SSE events (e.g., ping)
      if (event !== "message" && event !== "") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private validateResponse(parsed: unknown, requestId: number | string): JsonRpcResponse {
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("MCP streamable-http: response is not an object");
    }
    const msg = parsed as JsonRpcResponse;
    if (msg.id !== requestId) {
      throw new Error(
        `MCP streamable-http: response id ${String(msg.id)} does not match request id ${String(requestId)}`,
      );
    }
    return msg;
  }

  private dispatch(msg: JsonRpcResponse | JsonRpcNotification): void {
    for (const handler of this.handlers) {
      try {
        handler(msg);
      } catch {
        // Handler errors are isolated
      }
    }
  }
}
