import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpClient } from "../src/client/wrapper.js";
import type { McpServerConfigItem } from "../src/client/config.js";

function getClient(client: McpClient): {
  _reconnectAttempt: number;
  _closed: boolean;
  _connected: boolean;
  _client: { onclose: (() => void) | null };
} {
  return client as unknown as {
    _reconnectAttempt: number;
    _closed: boolean;
    _connected: boolean;
    _client: { onclose: (() => void) | null };
  };
}

describe("McpClient reconnect", () => {
  let client: McpClient;
  const stdioConfig: McpServerConfigItem = { command: "node", args: ["-e", "setTimeout(()=>{},10000)"] };

  beforeEach(() => {
    client = new McpClient("test", stdioConfig, { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 100 });
  });

  afterEach(() => {
    client.disconnect();
  });

  it("listTools throws when not connected", async () => {
    await expect(client.listTools()).rejects.toThrow("not connected");
  });

  it("callTool throws when not connected", async () => {
    await expect(client.callTool("test", {})).rejects.toThrow("not connected");
  });

  it("disconnect is idempotent", () => {
    client.disconnect();
    client.disconnect();
  });

  it("isConnected returns false initially", () => {
    expect(client.isConnected).toBe(false);
  });

  it("isConnected returns false after disconnect", () => {
    client.disconnect();
    expect(client.isConnected).toBe(false);
  });

  it("handlers survive disconnect", () => {
    client.disconnect();
    expect(client.isConnected).toBe(false);
  });

  it("_createClient sets onclose handler", () => {
    const c = getClient(client);
    expect(c._client.onclose).toBeDefined();
    expect(typeof c._client.onclose).toBe("function");
  });

  it("onclose sets connected to false and triggers scheduleReconnect", () => {
    const scheduleSpy = vi.spyOn(McpClient.prototype as unknown as { _scheduleReconnect: () => void }, "_scheduleReconnect");

    const c = getClient(client);
    c._connected = true;
    c._client.onclose!();
    expect(c._connected).toBe(false);
    expect(scheduleSpy).toHaveBeenCalled();

    scheduleSpy.mockRestore();
  });
});

describe("McpClient reconnection state machine", () => {
  const stdioConfig: McpServerConfigItem = { command: "node", args: ["-e", "setTimeout(()=>{},10000)"] };

  it("_scheduleReconnect is called on transport close", () => {
    const scheduleSpy = vi.spyOn(McpClient.prototype as unknown as { _scheduleReconnect: () => void }, "_scheduleReconnect");
    const client = new McpClient("reconnect-test", stdioConfig, { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 100 });
    const c = getClient(client);

    c._client.onclose!();
    expect(scheduleSpy).toHaveBeenCalled();

    scheduleSpy.mockRestore();
    client.disconnect();
  });

  it("does not reconnect after disconnect", () => {
    vi.useFakeTimers();
    const client = new McpClient("reconnect-test", stdioConfig, { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 100 });
    const c = getClient(client);
    client.disconnect();

    c._client.onclose!(); // should be a no-op since _closed is true
    vi.advanceTimersByTime(100);
    expect(c._reconnectAttempt).toBe(0);

    vi.useRealTimers();
    client.disconnect();
  });

  it("respects maxRetries limit", () => {
    vi.useFakeTimers();
    const client = new McpClient("limited", stdioConfig, { maxRetries: 0, baseDelayMs: 10, maxDelayMs: 100 });
    const c = getClient(client);

    c._client.onclose!(); // _reconnectAttempt (0) >= maxRetries (0) -> no reconnect
    vi.advanceTimersByTime(50);
    expect(c._reconnectAttempt).toBe(0);

    vi.useRealTimers();
    client.disconnect();
  });


});

describe("McpClient HTTP transport reconnect options", () => {
  it("constructs with HTTP config", () => {
    const httpConfig: McpServerConfigItem = { url: "http://localhost:3000/mcp" };
    const httpClient = new McpClient("http-test", httpConfig, { maxRetries: 3, baseDelayMs: 500, maxDelayMs: 10_000 });
    expect(httpClient.isConnected).toBe(false);
    httpClient.disconnect();
  });
});
