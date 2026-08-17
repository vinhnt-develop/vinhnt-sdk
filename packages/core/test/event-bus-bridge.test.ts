import { describe, it, expect, vi } from "vitest";
import { EventBusBridge } from "../src/event-bus/bridge.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { RunStarted, StepStarted, ConfigChanged } from "@vinhnt-sdk/event";

describe("EventBusBridge", () => {
  it("publishes to internal bus", async () => {
    const store = new FakeRunEventStore();
    const bridge = new EventBusBridge(store);
    const handler = vi.fn();
    bridge.subscribe(RunStarted, handler);

    bridge.publish(RunStarted, { prompt: "hello" }, { aggregateId: "run-1" });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ data: { prompt: "hello" } }));
  });

  it("persists durable events to store with correct sequence", async () => {
    const store = new FakeRunEventStore();
    const bridge = new EventBusBridge(store);

    bridge.publish(RunStarted, { prompt: "a" }, { aggregateId: "run-1" });
    await new Promise((r) => setTimeout(r, 20)); // wait for persist before next publish
    bridge.publish(StepStarted, { stepType: "tool" }, { aggregateId: "run-1" });
    await new Promise((r) => setTimeout(r, 50));

    const events = await store.list("run-1");
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("run.started");
    expect(events[0].sequence).toBe(1);
    expect(events[1].type).toBe("step.started");
    expect(events[1].sequence).toBe(2);
  });

  it("does not persist non-durable events", async () => {
    const store = new FakeRunEventStore();
    const bridge = new EventBusBridge(store);

    bridge.publish(ConfigChanged, { key: "theme" }, { aggregateId: "run-1" });
    await new Promise((r) => setTimeout(r, 50));

    const events = await store.list("run-1");
    expect(events).toHaveLength(0);
  });

  it("does not persist events without aggregateId", async () => {
    const store = new FakeRunEventStore();
    const bridge = new EventBusBridge(store);

    bridge.publish(RunStarted, { prompt: "test" });
    await new Promise((r) => setTimeout(r, 50));

    const events = await store.list("run-1");
    expect(events).toHaveLength(0);
  });

  it("assigns monotonically increasing sequences per aggregate", async () => {
    const store = new FakeRunEventStore();
    const bridge = new EventBusBridge(store);

    // Publish sequentially to avoid race on getNextSequence
    for (let i = 0; i < 5; i++) {
      bridge.publish(StepStarted, { stepType: `step-${i}` }, { aggregateId: "run-1" });
      await new Promise((r) => setTimeout(r, 20));
    }
    await new Promise((r) => setTimeout(r, 50));

    const events = await store.list("run-1");
    expect(events).toHaveLength(5);
    const seqs = events.map((e) => e.sequence);
    expect(seqs).toEqual([1, 2, 3, 4, 5]);
  });

  it("sequences are independent per aggregate", async () => {
    const store = new FakeRunEventStore();
    const bridge = new EventBusBridge(store);

    bridge.publish(RunStarted, { prompt: "a" }, { aggregateId: "run-1" });
    await new Promise((r) => setTimeout(r, 20));
    bridge.publish(RunStarted, { prompt: "b" }, { aggregateId: "run-2" });
    await new Promise((r) => setTimeout(r, 20));
    bridge.publish(StepStarted, { stepType: "tool" }, { aggregateId: "run-1" });
    await new Promise((r) => setTimeout(r, 50));

    const ev1 = await store.list("run-1");
    const ev2 = await store.list("run-2");
    expect(ev1.map((e) => e.sequence)).toEqual([1, 2]);
    expect(ev2.map((e) => e.sequence)).toEqual([1]);
  });
});

describe("EventBusBridge.durable()", () => {
  it("replays stored events then live events", async () => {
    const store = new FakeRunEventStore();
    const bridge = new EventBusBridge(store);

    // Pre-populate store
    await store.append({
      id: "ev-1", runId: "run-1", sequence: 1, type: "run.started",
      occurredAt: new Date().toISOString(), traceId: "t-1" as any,
      data: { prompt: "stored" },
    });

    const gen = bridge.durable(RunStarted, "run-1");
    const results: any[] = [];
    for await (const ev of gen) {
      results.push(ev);
      if (results.length >= 1) break; // break after stored event
    }

    expect(results).toHaveLength(1);
    expect(results[0].data).toEqual({ prompt: "stored" });
  });

  it("replays events after a given sequence", async () => {
    const store = new FakeRunEventStore();
    const bridge = new EventBusBridge(store);

    await store.append({
      id: "ev-1", runId: "run-1", sequence: 1, type: "run.started",
      occurredAt: new Date().toISOString(), traceId: "t-1" as any,
      data: { prompt: "old" },
    });
    await store.append({
      id: "ev-2", runId: "run-1", sequence: 2, type: "run.started",
      occurredAt: new Date().toISOString(), traceId: "t-2" as any,
      data: { prompt: "new" },
    });

    const gen = bridge.durable(RunStarted, "run-1", 1);
    const results: any[] = [];
    for await (const ev of gen) {
      results.push(ev);
      if (results.length >= 1) break;
    }

    expect(results).toHaveLength(1);
    expect(results[0].data).toEqual({ prompt: "new" });
  });
});
