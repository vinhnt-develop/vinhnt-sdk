/**
 * MCP SSE Transport — legacy HTTP + Server-Sent Events.
 *
 * 1. Client GETs config.url → SSE stream opens.
 * 2. Server sends `event: endpoint` with data = POST URL for messages.
 * 3. Client POSTs JSON-RPC messages to that endpoint.
 * 4. Responses/notifications arrive on the original SSE stream.
 *
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

export class SseTransport implements McpTransport {
  private readonly sseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;
  private postUrl: string | null = null;
  private closed = false;
  private readonly pending = new Map<number | string, PendingRequest>();
  private readonly handlers = new Set<(msg: JsonRpcResponse | JsonRpcNotification) => void>();
  private abort: AbortController | null = null;
  private sseReady: Promise<void>;
  private resolveSseReady!: () => void;
  private rejectSseReady!: (err: Error) => void;

  constructor(config: McpServerConfig) {
    if (!config.url) {
      throw new Error("sse transport requires config.url");
    }
    this.sseUrl = config.url;
    this.headers = { ...(config.headers ?? {}) };
    this.timeoutMs = config.timeoutMs ?? 30_000;

    this.sseReady = new Promise<void>((resolve, reject) => {
      this.resolveSseReady = resolve;
      this.rejectSseReady = reject;
    });
    // Avoid unhandled rejection if constructor-connect fails before first request
    this.sseReady.catch(() => undefined);

    this.connectSse();
  }

  async request(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (this.closed) {
      throw new Error("MCP transport closed");
    }

    // Wait for endpoint event from SSE stream
    await this.waitForEndpoint();

    // Capture postUrl to local variable to avoid race with close()
    const postUrl = this.postUrl;
    if (!postUrl || this.closed) {
      throw new Error("MCP transport closed");
    }

    const body = JSON.stringify(req);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...this.headers,
    };

    const res = await fetch(postUrl, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    // Response may arrive on POST body or on SSE stream — race both
    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("text/event-stream")) {
      return this.readSseResponseFromPost(res, req.id);
    }

    // Check if POST returned JSON directly
    const text = await res.text();
    if (text) {
      try {
        const parsed = JSON.parse(text) as JsonRpcResponse;
        if (parsed && typeof parsed === "object" && "id" in parsed && parsed.id === req.id) {
          return parsed;
        }
        // Might be an error envelope or unrelated — fall through to SSE wait if id mismatch
        if (parsed && typeof parsed === "object" && "id" in parsed && parsed.id !== undefined) {
          // Route mismatched response via handlers and continue waiting on SSE
          this.dispatch(parsed);
        }
      } catch {
        // Not JSON — fall through
      }
    }

    // Wait for response on the main SSE stream
    return this.waitForResponseOnSse(req.id);
  }

  notify(notification: JsonRpcNotification): void {
    if (this.closed || !this.postUrl) return;
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...this.headers,
    };
    void fetch(this.postUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(notification),
      signal: AbortSignal.timeout(this.timeoutMs),
    })
      .then((res) => res.text().catch(() => undefined))
      .catch(() => {
        // Best-effort
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

    this.abort?.abort();
    this.abort = null;

    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error("MCP transport closed"));
    }
    this.pending.clear();
    this.handlers.clear();
    this.rejectSseReady(new Error("MCP transport closed"));
    this.postUrl = null;
  }

  // ── Internal ──

  private connectSse(): void {
    this.abort = new AbortController();
    const headers: Record<string, string> = {
      accept: "text/event-stream",
      ...this.headers,
    };

    void fetch(this.sseUrl, {
      method: "GET",
      headers,
      signal: this.abort.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`MCP sse: GET ${this.sseUrl} failed with ${res.status}`);
        }
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("text/event-stream")) {
          throw new Error(`MCP sse: expected text/event-stream, got ${contentType}`);
        }
        this.readSseStream(res);
      })
      .catch((err: unknown) => {
        if (this.closed) return;
        const e = err instanceof Error ? err : new Error(String(err));
        this.rejectSseReady(e);
        // Fail all pending
        for (const [, p] of this.pending) {
          clearTimeout(p.timer);
          p.reject(e);
        }
        this.pending.clear();
      });
  }

  private async readSseStream(res: Response): Promise<void> {
    const reader = res.body?.getReader();
    if (!reader) {
      this.rejectSseReady(new Error("MCP sse: no response body"));
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          this.handleSseBlock(part);
        }
      }
      // Flush remaining
      if (buffer.trim()) {
        this.handleSseBlock(buffer);
      }
    } catch {
      if (!this.closed) {
        // Stream ended unexpectedly — reject pending
        for (const [, p] of this.pending) {
          clearTimeout(p.timer);
          p.reject(new Error("MCP sse: stream closed"));
        }
        this.pending.clear();
      }
    } finally {
      reader.releaseLock();
    }
  }

  private handleSseBlock(block: string): void {
    let event = "message";
    const dataLines: string[] = [];

    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (dataLines.length === 0) return;
    const data = dataLines.join("\n");
    if (!data) return;

    // endpoint event — provides POST URL
    if (event === "endpoint") {
      this.postUrl = data;
      this.resolveSseReady();
      return;
    }

    // message event — JSON-RPC message
    if (event !== "message" && event !== "") return;

    let parsed: JsonRpcResponse | JsonRpcNotification;
    try {
      parsed = JSON.parse(data) as JsonRpcResponse | JsonRpcNotification;
    } catch {
      return;
    }
    if (typeof parsed !== "object" || parsed === null || !("jsonrpc" in parsed)) return;

    // If it's a response with a pending id, resolve it
    if ("id" in parsed && parsed.id !== undefined && ("result" in parsed || "error" in parsed)) {
      const pending = this.pending.get(parsed.id);
      if (pending) {
        this.pending.delete(parsed.id);
        clearTimeout(pending.timer);
        pending.resolve(parsed as JsonRpcResponse);
        return;
      }
    }

    this.dispatch(parsed);
  }

  private async waitForEndpoint(): Promise<void> {
    if (this.postUrl) return;
    await this.sseReady;
  }

  private async waitForResponseOnSse(requestId: number | string): Promise<JsonRpcResponse> {
    return new Promise<JsonRpcResponse>((resolve, reject) => {
      // Check if response already arrived and was buffered — for simplicity, wait with timeout
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`MCP sse: request ${String(requestId)} timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      this.pending.set(requestId, {
        resolve,
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
        timer,
      });
    });
  }

  private async readSseResponseFromPost(res: Response, requestId: number | string): Promise<JsonRpcResponse> {
    const reader = res.body?.getReader();
    if (!reader) {
      return this.waitForResponseOnSse(requestId);
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const msg = this.parseJsonRpcFromSseBlock(part);
          if (msg && "id" in msg && msg.id === requestId) {
            reader.releaseLock();
            return msg as JsonRpcResponse;
          }
          if (msg) this.dispatch(msg);
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Fall back to main SSE stream wait
    return this.waitForResponseOnSse(requestId);
  }

  private parseJsonRpcFromSseBlock(block: string): JsonRpcResponse | JsonRpcNotification | null {
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
    if (event !== "message" && event !== "") return null;
    try {
      const parsed = JSON.parse(dataLines.join("\n")) as JsonRpcResponse | JsonRpcNotification;
      if (typeof parsed !== "object" || parsed === null || !("jsonrpc" in parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private dispatch(msg: JsonRpcResponse | JsonRpcNotification): void {
    for (const handler of this.handlers) {
      try {
        handler(msg);
      } catch {
        // Isolate handler errors
      }
    }
  }
}
