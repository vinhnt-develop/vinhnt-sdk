import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { InMemoryEventBus } from "@vinhnt-sdk/core";
import { McpClientPool, McpEventBridge } from "../src/client/index.js";
import { defineEvent } from "@vinhnt-sdk/schema";

const TestEvent = defineEvent({
  type: "mcp-bridge.test",
  description: "Bridge test event",
});

describe("McpEventBridge", () => {
  let bus: InMemoryEventBus;
  let pool: McpClientPool;
  let bridge: McpEventBridge;

  beforeEach(() => {
    bus = new InMemoryEventBus();
    pool = new McpClientPool();
    bridge = new McpEventBridge(pool, bus);
  });

  afterEach(() => {
    bridge.stop();
    pool.disconnectAll();
  });

  it("starts and stops without error", () => {
    bridge.start();
    bridge.stop();
  });

  it("does not throw when no servers connected", () => {
    bridge.start();
    bus.publish(TestEvent, { hello: "world" });
  });

  it("start is idempotent", () => {
    bridge.start();
    bridge.start();
    bridge.stop();
  });

  it("delivers events to connected MCP servers via sendNotification", async () => {
    // Register a server entry and manually inject into pool's client map
    const notifications: Array<{ method: string; params: unknown }> = [];
    const fakeClient = {
      name: "fake-server",
      isConnected: true,
      disconnect: () => {},
      sendNotification: async (method: string, params: unknown) => {
        notifications.push({ method, params });
      },
    };

    // Access pool's internal clients Map for testing
    const clientsMap = (pool as unknown as { clients: Map<string, typeof fakeClient> }).clients;
    clientsMap.set("fake-server", fakeClient);

    bridge.start();
    bus.publish(TestEvent, { hello: "world" }, { aggregateId: "agg-1", traceId: "trace-1" });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.method).toBe("vnt/event");
    const params = notifications[0]?.params as Record<string, unknown>;
    expect(params?.type).toBe("mcp-bridge.test");
    expect(params?.data).toEqual({ hello: "world" });
    expect(params?.aggregateId).toBe("agg-1");
    expect(params?.traceId).toBe("trace-1");
    expect(params?.id).toBeTypeOf("string");
  });

  it("skips disconnected servers", async () => {
    const notifications: Array<{ method: string; params: unknown }> = [];
    const clientsMap = (pool as unknown as { clients: Map<string, unknown> }).clients;

    clientsMap.set("connected", {
      isConnected: true,
      disconnect: () => {},
      sendNotification: async (method: string, params: unknown) => {
        notifications.push({ method, params });
      },
    });
    clientsMap.set("disconnected", {
      isConnected: false,
      disconnect: () => {},
      sendNotification: async () => {
        throw new Error("Should not be called");
      },
    });

    bridge.start();
    bus.publish(TestEvent, { only: "connected" });

    expect(notifications).toHaveLength(1);
  });

  it("survives sendNotification rejection", async () => {
    const clientsMap = (pool as unknown as { clients: Map<string, unknown> }).clients;
    clientsMap.set("failing", {
      isConnected: true,
      disconnect: () => {},
      sendNotification: async () => {
        throw new Error("Network error");
      },
    });

    bridge.start();
    bus.publish(TestEvent, { should: "not crash" });
  });
});
