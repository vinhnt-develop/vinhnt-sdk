/**
 * Streamable HTTP transport tests — MCP 2026-07-28.
 *
 * Uses a mock HTTP server (node:http) to exercise:
 * - JSON response path
 * - SSE response path
 * - Session id capture (Mcp-Session-Id)
 * - notify fire-and-forget
 * - auth header passthrough
 * - close rejects pending + DELETE session
 */

import { describe, it, expect, afterEach } from "vitest";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { StreamableHttpTransport } from "../src/transports/streamable-http.js";
import type { JsonRpcRequest, JsonRpcNotification, JsonRpcResponse } from "../src/types.js";

type Handler = (req: IncomingMessage, res: ServerResponse, body: string) => void;

function startServer(handler: Handler): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        handler(req, res, body);
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${addr.port}/mcp` });
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

const openServers: Server[] = [];

async function withServer(handler: Handler): Promise<string> {
  const { server, url } = await startServer(handler);
  openServers.push(server);
  return url;
}

afterEach(async () => {
  while (openServers.length > 0) {
    const s = openServers.pop();
    if (s) await closeServer(s);
  }
});

function makeRequest(id: number | string, method = "tools/list"): JsonRpcRequest {
  return { jsonrpc: "2.0", id, method };
}

describe("StreamableHttpTransport", () => {
  it("throws if config.url is missing", () => {
    expect(
      () =>
        new StreamableHttpTransport({
          name: "test",
          transport: "streamable-http",
        }),
    ).toThrow(/requires config\.url/);
  });

  it("request returns JSON response", async () => {
    const url = await withServer((req, res, body) => {
      expect(req.method).toBe("POST");
      expect(req.headers["content-type"]).toBe("application/json");
      expect(req.headers.accept).toContain("text/event-stream");
      const parsed = JSON.parse(body) as JsonRpcRequest;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: parsed.id,
          result: { tools: [{ name: "echo", inputSchema: { type: "object" } }] },
        }),
      );
    });

    const transport = new StreamableHttpTransport({
      name: "test",
      transport: "streamable-http",
      url,
    });

    const res = await transport.request(makeRequest(1));
    expect(res.id).toBe(1);
    expect((res.result as { tools: unknown[] }).tools).toHaveLength(1);
    await transport.close();
  });

  it("request parses SSE response stream", async () => {
    const url = await withServer((req, res, body) => {
      const parsed = JSON.parse(body) as JsonRpcRequest;
      res.setHeader("content-type", "text/event-stream");
      res.setHeader("cache-control", "no-cache");
      // First send a notification, then the response
      res.write(
        `event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", method: "notifications/progress", params: { progress: 50 } })}\n\n`,
      );
      res.write(
        `event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: parsed.id, result: { ok: true } })}\n\n`,
      );
      res.end();
    });

    const transport = new StreamableHttpTransport({
      name: "test",
      transport: "streamable-http",
      url,
    });

    const received: Array<JsonRpcResponse | JsonRpcNotification> = [];
    transport.onMessage((msg) => received.push(msg));

    const res = await transport.request(makeRequest(7));
    expect(res.id).toBe(7);
    expect(res.result).toEqual({ ok: true });
    // The notification should have been dispatched to handlers
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ method: "notifications/progress" });
    await transport.close();
  });

  it("captures Mcp-Session-Id and sends it on subsequent requests", async () => {
    let first = true;
    const url = await withServer((req, res, body) => {
      if (req.method === "DELETE") {
        res.statusCode = 204;
        res.end();
        return;
      }
      const parsed = JSON.parse(body) as JsonRpcRequest;
      if (first) {
        first = false;
        res.setHeader("mcp-session-id", "sess-abc");
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ jsonrpc: "2.0", id: parsed.id, result: {} }));
      } else {
        expect(req.headers["mcp-session-id"]).toBe("sess-abc");
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ jsonrpc: "2.0", id: parsed.id, result: { second: true } }));
      }
    });

    const transport = new StreamableHttpTransport({
      name: "test",
      transport: "streamable-http",
      url,
    });

    await transport.request(makeRequest(1));
    const res2 = await transport.request(makeRequest(2));
    expect(res2.result).toEqual({ second: true });
    await transport.close();
  });

  it("passes auth headers through", async () => {
    const url = await withServer((req, res, body) => {
      expect(req.headers.authorization).toBe("Bearer secret-token");
      const parsed = JSON.parse(body) as JsonRpcRequest;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ jsonrpc: "2.0", id: parsed.id, result: {} }));
    });

    const transport = new StreamableHttpTransport({
      name: "test",
      transport: "streamable-http",
      url,
      headers: { authorization: "Bearer secret-token" },
    });

    await transport.request(makeRequest(1));
    await transport.close();
  });

  it("notify posts without waiting for response", async () => {
    let notified = false;
    const url = await withServer((req, res, body) => {
      const parsed = JSON.parse(body) as JsonRpcNotification;
      if (parsed.method === "notifications/initialized") {
        notified = true;
        res.statusCode = 202;
        res.end();
        return;
      }
      const req2 = parsed as unknown as JsonRpcRequest;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ jsonrpc: "2.0", id: req2.id, result: {} }));
    });

    const transport = new StreamableHttpTransport({
      name: "test",
      transport: "streamable-http",
      url,
    });

    transport.notify({ jsonrpc: "2.0", method: "notifications/initialized" });
    // Give fire-and-forget a moment
    await new Promise((r) => setTimeout(r, 100));
    expect(notified).toBe(true);
    await transport.close();
  });

  it("close rejects pending and clears state", async () => {
    // Server that never responds (hangs) for POST
    const url = await withServer((_req, res) => {
      // Never end — keep connection open
      res.setHeader("content-type", "application/json");
      // Intentionally do not end
    });

    const transport = new StreamableHttpTransport({
      name: "test",
      transport: "streamable-http",
      url,
      timeoutMs: 60_000,
    });

    const pending = transport.request(makeRequest(1));
    // Close while pending
    await transport.close();
    await expect(pending).rejects.toThrow(/closed|timeout/i);
  });

  it("throws on id mismatch", async () => {
    const url = await withServer((req, res) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ jsonrpc: "2.0", id: 999, result: {} }));
    });

    const transport = new StreamableHttpTransport({
      name: "test",
      transport: "streamable-http",
      url,
    });

    await expect(transport.request(makeRequest(1))).rejects.toThrow(/does not match/);
    await transport.close();
  });
});
