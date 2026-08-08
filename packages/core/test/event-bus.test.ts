import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "../src/event-bus/in-memory-bus.js";
import { defineEvent, type EventDefinition, type TypedEvent } from "@vinhnt-sdk/schema";

const TestEvent = defineEvent({
  type: "test.event",
  description: "A test event",
});

const DurableEvent = defineEvent({
  type: "test.durable",
  description: "A durable test event",
  durable: { version: 1, aggregate: "testAgg" },
});

const OtherEvent = defineEvent({
  type: "test.other",
  description: "Another test event",
});

describe("InMemoryEventBus", () => {
  let bus: InMemoryEventBus;

  beforeEach(() => {
    bus = new InMemoryEventBus();
  });

  it("publishes and subscribes to a specific event", () => {
    const received: TypedEvent[] = [];
    bus.subscribe(TestEvent, (e) => received.push(e));

    bus.publish(TestEvent, { hello: "world" });

    expect(received).toHaveLength(1);
    expect(received[0]?.type).toBe("test.event");
    expect(received[0]?.data).toEqual({ hello: "world" });
  });

  it("does not deliver to other event subscribers", () => {
    const received: TypedEvent[] = [];
    bus.subscribe(TestEvent, (e) => received.push(e));

    bus.publish(OtherEvent, {});

    expect(received).toHaveLength(0);
  });

  it("subscribeAll receives all events", () => {
    const received: TypedEvent[] = [];
    bus.subscribeAll((e) => received.push(e));

    bus.publish(TestEvent, { a: 1 });
    bus.publish(OtherEvent, { b: 2 });

    expect(received).toHaveLength(2);
  });

  it("unsubscribe stops receiving events", () => {
    const received: TypedEvent[] = [];
    const unsub = bus.subscribe(TestEvent, (e) => received.push(e));

    unsub();
    bus.publish(TestEvent, {});

    expect(received).toHaveLength(0);
  });

  it("stores and replays durable events", async () => {
    bus.publish(DurableEvent, { seq: 1 }, { aggregateId: "agg-1" });
    bus.publish(DurableEvent, { seq: 2 }, { aggregateId: "agg-1" });

    const replayed: TypedEvent[] = [];
    for await (const ev of bus.durable(DurableEvent, "agg-1")) {
      replayed.push(ev);
    }

    expect(replayed).toHaveLength(2);
    expect(replayed[0]?.data).toEqual({ seq: 1 });
    expect(replayed[1]?.data).toEqual({ seq: 2 });
  });

  it("durable respects after sequence", async () => {
    bus.publish(DurableEvent, { seq: 1 }, { aggregateId: "agg-2" });
    bus.publish(DurableEvent, { seq: 2 }, { aggregateId: "agg-2" });
    bus.publish(DurableEvent, { seq: 3 }, { aggregateId: "agg-2" });

    const replayed: TypedEvent[] = [];
    for await (const ev of bus.durable(DurableEvent, "agg-2", 1)) {
      replayed.push(ev);
    }

    expect(replayed).toHaveLength(1);
    expect(replayed[0]?.data).toEqual({ seq: 3 });
  });

  it("separates durable events by aggregateId", async () => {
    bus.publish(DurableEvent, { seq: 1 }, { aggregateId: "a" });
    bus.publish(DurableEvent, { seq: 1 }, { aggregateId: "b" });

    const aEvents: TypedEvent[] = [];
    for await (const ev of bus.durable(DurableEvent, "a")) {
      aEvents.push(ev);
    }
    expect(aEvents).toHaveLength(1);
  });

  it("project runs synchronously on publish", () => {
    const projected: TypedEvent[] = [];
    bus.project(TestEvent, (e) => projected.push(e));

    bus.publish(TestEvent, { value: 42 });

    expect(projected).toHaveLength(1);
    expect(projected[0]?.data).toEqual({ value: 42 });
  });

  it("unsubscribe from project stops receiving", () => {
    const projected: TypedEvent[] = [];
    const unsub = bus.project(TestEvent, (e) => projected.push(e));

    unsub();
    bus.publish(TestEvent, {});

    expect(projected).toHaveLength(0);
  });
});
