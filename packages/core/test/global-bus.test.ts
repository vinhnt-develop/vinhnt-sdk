import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GlobalEventBus, getGlobalEventBus } from "../src/event-bus/global-bus.js";
import { defineEvent } from "@vinhnt-sdk/schema";

const TestEvent = defineEvent({
  type: "global.test.event",
  description: "A global test event",
});

const DurableEvent = defineEvent({
  type: "global.test.durable",
  description: "A durable test event",
  durable: { version: 1, aggregate: "globalAgg" },
});

const OtherEvent = defineEvent({
  type: "global.test.other",
  description: "Another test event",
});

describe("GlobalEventBus", () => {
  let bus: GlobalEventBus;

  beforeEach(() => {
    bus = new GlobalEventBus();
  });

  afterEach(() => {
    bus.reset();
  });

  it("publishes and subscribes to a specific event", () => {
    const received: unknown[] = [];
    bus.subscribe(TestEvent, (e) => received.push(e.data));

    bus.publish(TestEvent, { hello: "world" });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ hello: "world" });
  });

  it("does not deliver to other event subscribers", () => {
    const received: unknown[] = [];
    bus.subscribe(TestEvent, (e) => received.push(e.data));

    bus.publish(OtherEvent, {});

    expect(received).toHaveLength(0);
  });

  it("subscribeAll receives all events", () => {
    const received: unknown[] = [];
    bus.subscribeAll((e) => received.push(e));

    bus.publish(TestEvent, { a: 1 });
    bus.publish(OtherEvent, { b: 2 });

    expect(received).toHaveLength(2);
  });

  it("unsubscribe stops receiving events", () => {
    const received: unknown[] = [];
    const unsub = bus.subscribe(TestEvent, (e) => received.push(e));

    unsub();
    bus.publish(TestEvent, {});

    expect(received).toHaveLength(0);
  });

  it("stores and replays durable events", async () => {
    bus.publish(DurableEvent, { seq: 1 }, { aggregateId: "agg-g1" });
    bus.publish(DurableEvent, { seq: 2 }, { aggregateId: "agg-g1" });

    const replayed: unknown[] = [];
    for await (const ev of bus.durable(DurableEvent, "agg-g1")) {
      replayed.push(ev.data);
    }

    expect(replayed).toHaveLength(2);
    expect(replayed[0]).toEqual({ seq: 1 });
    expect(replayed[1]).toEqual({ seq: 2 });
  });

  it("durable respects after sequence", async () => {
    bus.publish(DurableEvent, { seq: 1 }, { aggregateId: "agg-g2" });
    bus.publish(DurableEvent, { seq: 2 }, { aggregateId: "agg-g2" });
    bus.publish(DurableEvent, { seq: 3 }, { aggregateId: "agg-g2" });

    const replayed: unknown[] = [];
    for await (const ev of bus.durable(DurableEvent, "agg-g2", 1)) {
      replayed.push(ev.data);
    }

    expect(replayed).toHaveLength(1);
    expect(replayed[0]).toEqual({ seq: 3 });
  });

  it("separates durable events by aggregateId", async () => {
    bus.publish(DurableEvent, { seq: 1 }, { aggregateId: "a1" });
    bus.publish(DurableEvent, { seq: 1 }, { aggregateId: "b1" });

    const aEvents: unknown[] = [];
    for await (const ev of bus.durable(DurableEvent, "a1")) {
      aEvents.push(ev.data);
    }
    expect(aEvents).toHaveLength(1);
  });

  it("project runs synchronously on publish", () => {
    const projected: unknown[] = [];
    bus.project(TestEvent, (e) => projected.push(e.data));

    bus.publish(TestEvent, { value: 42 });

    expect(projected).toHaveLength(1);
    expect(projected[0]).toEqual({ value: 42 });
  });

  it("getGlobalEventBus returns singleton", () => {
    const a = getGlobalEventBus();
    const b = getGlobalEventBus();
    expect(a).toBe(b);
    a.reset();
  });

  it("setRedisAdapter wires Redis messages into local bus", () => {
    type MessageHandler = (channel: string, message: string) => void;
    let registeredHandler: MessageHandler | null = null;
    let subscribedChannel = "";

    const fakeRedis: {
      publish: (channel: string, message: string) => Promise<void>;
      on: (event: string, handler: MessageHandler) => void;
      subscribe: (channel: string) => void;
    } = {
      publish: async () => {},
      on: (_event, handler) => {
        registeredHandler = handler;
      },
      subscribe: (channel) => {
        subscribedChannel = channel;
      },
    };

    bus.setRedisAdapter(fakeRedis);

    expect(subscribedChannel).toBe("vnt:events");
    expect(registeredHandler).toBeTruthy();

    const received: unknown[] = [];
    bus.subscribe(TestEvent, (e) => received.push(e.data));

    // Simulate Redis message arriving
    const redisEvent = JSON.stringify({
      type: "global.test.event",
      id: "redis-1",
      occurredAt: new Date().toISOString(),
      traceId: "t1",
      aggregateId: "",
      sequence: 0,
      data: { from: "redis" },
    });
    registeredHandler!("vnt:events", redisEvent);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ from: "redis" });
  });

  it("ignores non-vnt Redis messages", () => {
    type MessageHandler = (channel: string, message: string) => void;
    let registeredHandler: MessageHandler | null = null;

    const fakeRedis = {
      publish: async () => {},
      on: (_event: string, handler: MessageHandler) => {
        registeredHandler = handler;
      },
      subscribe: () => {},
    };

    bus.setRedisAdapter(fakeRedis);

    const received: unknown[] = [];
    bus.subscribe(TestEvent, (e) => received.push(e));

    // Simulate non-vnt channel message
    registeredHandler!("other:channel", JSON.stringify({ type: "global.test.event", data: {} }));

    expect(received).toHaveLength(0);
  });

  it("publishes to Redis adapter when set", async () => {
    let publishedMessage = "";

    const fakeRedis = {
      publish: async (_channel: string, message: string) => {
        publishedMessage = message;
      },
      on: () => {},
      subscribe: () => {},
    };

    bus.setRedisAdapter(fakeRedis);
    bus.publish(TestEvent, { synced: true }, { traceId: "t2" });

    const parsed = JSON.parse(publishedMessage);
    expect(parsed.type).toBe("global.test.event");
    expect(parsed.data).toEqual({ synced: true });
    expect(parsed.traceId).toBe("t2");
  });
});
