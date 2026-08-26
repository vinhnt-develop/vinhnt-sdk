import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "../src/index.js";
import { defineEvent, type EventDefinition, type TypedEvent } from "../src/index.js";

const TestEvent = defineEvent({
  type: "test.event",
  description: "A test event",
});

const DurableEvent = defineEvent({
  type: "test.durable",
  description: "A durable test event",
  durable: { version: 1, aggregate: "testAgg" },
}) as EventDefinition<unknown> & { durable: NonNullable<EventDefinition["durable"]> };

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

  describe("streamWithReplay", () => {
    it("replays durable events then streams live events", async () => {
      // Publish some durable events first
      bus.publish(DurableEvent, { seq: 1 }, { aggregateId: "agg-replay" });
      bus.publish(DurableEvent, { seq: 2 }, { aggregateId: "agg-replay" });

      const received: TypedEvent[] = [];
      const controller = new AbortController();

      // Start streaming
      const streamPromise = (async () => {
        for await (const ev of bus.streamWithReplay(DurableEvent, "agg-replay", undefined, controller.signal)) {
          received.push(ev);
        }
      })();

      // Wait for replay to complete
      await new Promise(r => setTimeout(r, 100));

      // Should have replayed 2 events
      expect(received).toHaveLength(2);
      expect(received[0]?.data).toEqual({ seq: 1 });
      expect(received[1]?.data).toEqual({ seq: 2 });

      // Now publish a live event
      bus.publish(DurableEvent, { seq: 3 }, { aggregateId: "agg-replay" });
      await new Promise(r => setTimeout(r, 100));

      // Should now have 3 events
      expect(received).toHaveLength(3);
      expect(received[2]?.data).toEqual({ seq: 3 });

      // Clean up
      controller.abort();
      await streamPromise;
    });

    it("respects after sequence parameter", async () => {
      // Publish durable events
      bus.publish(DurableEvent, { seq: 1 }, { aggregateId: "agg-after" });
      bus.publish(DurableEvent, { seq: 2 }, { aggregateId: "agg-after" });
      bus.publish(DurableEvent, { seq: 3 }, { aggregateId: "agg-after" });

      const received: TypedEvent[] = [];
      const controller = new AbortController();

      // Start streaming from sequence 1
      const streamPromise = (async () => {
        for await (const ev of bus.streamWithReplay(DurableEvent, "agg-after", 1, controller.signal)) {
          received.push(ev);
        }
      })();

      await new Promise(r => setTimeout(r, 100));

      // Should only have events after sequence 1
      expect(received).toHaveLength(1);
      expect(received[0]?.data).toEqual({ seq: 3 });

      controller.abort();
      await streamPromise;
    });

    it("stops on abort signal", async () => {
      bus.publish(DurableEvent, { seq: 1 }, { aggregateId: "agg-abort" });

      const received: TypedEvent[] = [];
      const controller = new AbortController();

      const streamPromise = (async () => {
        for await (const ev of bus.streamWithReplay(DurableEvent, "agg-abort", undefined, controller.signal)) {
          received.push(ev);
        }
      })();

      await new Promise(r => setTimeout(r, 100));
      expect(received).toHaveLength(1);

      // Abort
      controller.abort();
      await new Promise(r => setTimeout(r, 100));

      // Publish more events after abort
      bus.publish(DurableEvent, { seq: 2 }, { aggregateId: "agg-abort" });
      await new Promise(r => setTimeout(r, 100));

      // Should still only have 1 event
      expect(received).toHaveLength(1);

      await streamPromise;
    });
  });
});