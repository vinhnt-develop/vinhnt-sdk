import type { EventBus, Unsubscribe } from "@vinhnt-sdk/agent-core";
import { type McpClientPool } from "./pool.js";

const NOTIFICATION_METHOD = "vnt/event";

export class McpEventBridge {
  private pool: McpClientPool;
  private bus: EventBus;
  private unsub: Unsubscribe | null = null;

  constructor(pool: McpClientPool, bus: EventBus) {
    this.pool = pool;
    this.bus = bus;
  }

  start(): void {
    if (this.unsub) return;
    this.unsub = this.bus.subscribeAll((event) => {
      const servers = this.pool.getConnectedServers();
      for (const name of servers) {
        const client = this.pool.getClient(name);
        if (!client?.isConnected) continue;
        client.sendNotification(NOTIFICATION_METHOD, {
          id: event.id,
          type: event.type,
          occurredAt: event.occurredAt,
          traceId: event.traceId,
          aggregateId: event.aggregateId,
          data: event.data,
        }).catch((err) => console.error(`[McpEventBridge] Failed to send to "${name}":`, err));
      }
    });
  }

  stop(): void {
    this.unsub?.();
    this.unsub = null;
  }
}
