/**
 * SSE transport tests — legacy HTTP + Server-Sent Events.
 *
 * Mock server flow:
 * 1. GET /sse → open SSE stream, send `event: endpoint` with POST URL
 * 2. POST /message → queue response; response delivered via SSE stream
 */

import { describe, it, expect, afterEach } from "vitest";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { SseTransport } from "../src/transports/sse.js";
import type { JsonRpcRequest, JsonRpcNotification, JsonRpcResponse } from "../src/types.js";

const openServers: Server[] = [];

interface MockSseServer {
  url: string;
  /** Pending SSE response writers keyed by JSON-RPC id */
  respond: (id: number | string, result: unknown) => void;
  /** Send a notification on the SSE stream */
  sendNotification: (method: string, params?: unknown) => void;
  /** POSTs received by the server */
  posts: Array<{ method: string; body: string }>;
  /** Headers from the most recent POST */
  lastPostHeaders: IncomingMessage["headers"] | null;
}

function startMockSseServer(): Promise<MockSseServer> {
  return new Promise((resolve) => {
    let sseRes: ServerResponse | null = null;
    let endpointPath = "";
    const posts: MockSseServer["posts"] = [];
    let lastPostHeaders: IncomingMessage["headers"] | null = null;

    // Store pending response callbacks by id
    const pendingResponders = new Map<number | string, (result: unknown) => void>();

    const server = createServer((req, res) => {
      const path = req.url ?? "";

      if (req.method === "GET" && path === "/sse") {
        sseRes = res;
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });
        // Send endpoint event with full POST URL
        const addr = server.address() as AddressInfo;
        endpointPath = `/message?sessionId=s1`;
        const fullEndpoint = `http://127.0.0.1:${addr.port}${endpointPath}`;
        res.write(`event: endpoint\ndata: ${fullEndpoint}\n\n`);
        return;
      }

      if (req.method === "POST" && path.startsWith("/message")) {
        let body = "";
        req.on("data", (c) => {
          body += c;
        });
        req.on("end", () => {
          posts.push({ method: req.method ?? "", body });
          lastPostHeaders = req.headers;
          res.writeHead(202, { "content-type": "text/plain" });
          res.end();

          // Parse and either queue responder or handle notification
          try {
            const parsed = JSON.parse(body) as JsonRpcRequest | JsonRpcNotification;
            if ("id" in parsed && parsed.id !== undefined) {
              // For requests, the responder will write to sseRes when respond() is called
              pendingResponders.set(parsed.id, (result) => {
                if (sseRes && !sseRes.writableEnded) {
                  const msg: JsonRpcResponse = { jsonrpc: "2.0", id: parsed.id, result };
                  sseRes.write(`event: message\ndata: ${JSON.stringify(msg)}\n\n`);
                }
              });
            }
          } catch {
            // ignore
          }
        });
        return;
      }

      res.writeHead(404);
      res.end();
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as AddressInfo;
      const url = `http://127.0.0.1:${addr.port}/sse`;
      resolve({
        url,
        posts,
        get lastPostHeaders() {
          return lastPostHeaders;
        },
        respond: (id, result) => {
          const fn = pendingResponders.get(id);
          if (fn) {
            fn(result);
            pendingResponders.delete(id);
          }
        },
        sendNotification: (method, params) => {
          if (sseRes && !sseRes.writableEnded) {
            const msg: JsonRpcNotification = params !== undefined
              ? { jsonrpc: "2.0", method, params }
              : { jsonrpc: "2.0", method };
            sseRes.write(`event: message\ndata: ${JSON.stringify(msg)}\n\n`);
          }
        },
      });
    });
  });
}

afterEach(async () => {
  while (openServers.length > 0) {
    const s = openServers.pop();
    if (s) await new Promise<void>((resolve) => s.close(() => resolve()));
  }
});

async function createMock(): Promise<MockSseServer> {
  const mock = await startMockSseServer();
  // We need to track the server for cleanup — rebuild with tracked version
  // Simpler: wrap startMockSseServer to push to openServers
  return mock;
}

// Override: track servers for cleanup
const trackedServers: Server[] = [];
const origStart = startMockSseServer;

async function createTrackedMock(): Promise<MockSseServer> {
  return new Promise((resolve) => {
    let sseRes: ServerResponse | null = null;
    const posts: MockSseServer["posts"] = [];
    let lastPostHeaders: IncomingMessage["headers"] | null = null;
    const pendingResponders = new Map<number | string, (result: unknown) => void>();

    const server = createServer((req, res) => {
      const path = req.url ?? "";

      if (req.method === "GET" && path === "/sse") {
        sseRes = res;
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });
        const addr = server.address() as AddressInfo;
        const fullEndpoint = `http://127.0.0.1:${addr.port}/message?sessionId=s1`;
        res.write(`event: endpoint\ndata: ${fullEndpoint}\n\n`);
        return;
      }

      if (req.method === "POST" && path.startsWith("/message")) {
        let body = "";
        req.on("data", (c) => {
          body += c;
        });
        req.on("end", () => {
          posts.push({ method: req.method ?? "", body });
          lastPostHeaders = req.headers;
          res.writeHead(202, { "content-type": "text/plain" });
          res.end();

          try {
            const parsed = JSON.parse(body) as JsonRpcRequest | JsonRpcNotification;
            if ("id" in parsed && parsed.id !== undefined) {
              pendingResponders.set(parsed.id, (result) => {
                if (sseRes && !sseRes.writableEnded) {
                  const msg: JsonRpcResponse = { jsonrpc: "2.0", id: parsed.id, result };
                  sseRes.write(`event: message\ndata: ${JSON.stringify(msg)}\n\n`);
                }
              });
            }
          } catch {
            // ignore
          }
        });
        return;
      }

      res.writeHead(404);
      res.end();
    });

    trackedServers.push(server);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as AddressInfo;
      const url = `http://127.0.0.1:${addr.port}/sse`;
      resolve({
        url,
        posts,
        get lastPostHeaders() {
          return lastPostHeaders;
        },
        respond: (id, result) => {
          const fn = pendingResponders.get(id);
          if (fn) {
            fn(result);
            pendingResponders.delete(id);
          }
        },
        sendNotification: (method, params) => {
          if (sseRes && !sseRes.writableEnded) {
            const msg: JsonRpcNotification =
              params !== undefined ? { jsonrpc: "2.0", method, params } : { jsonrpc: "2.0", method };
            sseRes.write(`event: message\ndata: ${JSON.stringify(msg)}\n\n`);
          }
        },
      });
    });
  });
}

afterEach(async () => {
  while (trackedServers.length > 0) {
    const s = trackedServers.pop();
    if (s) await new Promise<void>((resolve) => s.close(() => resolve()));
  }
});

function makeRequest(id: number | string, method = "tools/list"): JsonRpcRequest {
  return { jsonrpc: "2.0", id, method };
}

describe("SseTransport", () => {
  it("throws if config.url is missing", () => {
    expect(
      () =>
        new SseTransport({
          name: "test",
          transport: "sse",
        }),
    ).toThrow(/requires config\.url/);
  });

  it("request waits for endpoint then posts and resolves via SSE", async () => {
    const mock = await createTrackedMock();
    const transport = new SseTransport({
      name: "test",
      transport: "sse",
      url: mock.url,
      timeoutMs: 5_000,
    });

    // Respond shortly after POST arrives
    const respondTimer = setTimeout(() => {
      mock.respond(1, { tools: [{ name: "echo", inputSchema: {} }] });
    }, 50);

    const res = await transport.request(makeRequest(1));
    clearTimeout(respondTimer);

    expect(res.id).toBe(1);
    expect((res.result as { tools: unknown[] }).tools).toHaveLength(1);
    expect(mock.posts).toHaveLength(1);
    await transport.close();
  });

  it("passes auth headers on POST", async () => {
    const mock = await createTrackedMock();
    const transport = new SseTransport({
      name: "test",
      transport: "sse",
      url: mock.url,
      headers: { authorization: "Bearer sse-secret" },
      timeoutMs: 5_000,
    });

    const t = setTimeout(() => mock.respond(1, {}), 50);
    await transport.request(makeRequest(1));
    clearTimeout(t);

    expect(mock.lastPostHeaders?.authorization).toBe("Bearer sse-secret");
    await transport.close();
  });

  it("notify posts without waiting", async () => {
    const mock = await createTrackedMock();
    const transport = new SseTransport({
      name: "test",
      transport: "sse",
      url: mock.url,
      timeoutMs: 5_000,
    });

    // Wait for endpoint to be ready before notify (notify requires postUrl)
    await new Promise((r) => setTimeout(r, 100));
    transport.notify({ jsonrpc: "2.0", method: "notifications/initialized" });
    await new Promise((r) => setTimeout(r, 100));

    expect(mock.posts.some((p) => p.body.includes("notifications/initialized"))).toBe(true);
    await transport.close();
  });

  it("onMessage receives server-initiated notifications", async () => {
    const mock = await createTrackedMock();
    const transport = new SseTransport({
      name: "test",
      transport: "sse",
      url: mock.url,
      timeoutMs: 5_000,
    });

    const received: Array<JsonRpcResponse | JsonRpcNotification> = [];
    transport.onMessage((msg) => received.push(msg));

    // Wait for SSE connection
    await new Promise((r) => setTimeout(r, 100));
    mock.sendNotification("notifications/tools/list_changed");

    await new Promise((r) => setTimeout(r, 100));
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ method: "notifications/tools/list_changed" });
    await transport.close();
  });

  it("close rejects pending and clears handlers", async () => {
    const mock = await createTrackedMock();
    const transport = new SseTransport({
      name: "test",
      transport: "sse",
      url: mock.url,
      timeoutMs: 30_000,
    });

    // Wait for endpoint
    await new Promise((r) => setTimeout(r, 100));

    const pending = transport.request(makeRequest(1));
    // Don't respond — close while pending
    await transport.close();
    await expect(pending).rejects.toThrow(/closed|timed out/i);
  });
});
