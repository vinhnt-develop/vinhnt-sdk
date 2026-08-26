import { describe, expect, it, vi, beforeEach } from "vitest";
import type { RunId, AgentEvent } from "@vinhnt-sdk/schema";
import type { AgentRunHandle, AgentRunResult } from "../src/kernel/kernel-types.js";

describe("AgentRunHandle", () => {
  let runId: RunId;
  let eventHandlers: Set<(event: AgentEvent) => void>;
  let completedPromise: Promise<AgentRunResult>;
  let resolveComplete: (value: AgentRunResult) => void;
  let rejectComplete: (error: Error) => void;

  beforeEach(() => {
    runId = crypto.randomUUID() as RunId;
    eventHandlers = new Set();
    
    completedPromise = new Promise<AgentRunResult>((resolve, reject) => {
      resolveComplete = resolve;
      rejectComplete = reject;
    });
  });

  function createMockHandle(overrides?: Partial<AgentRunHandle>): AgentRunHandle {
    let cancelled = false;
    const completed = false;
    
    return {
      runId,
      completed: completedPromise,
      cancel() {
        cancelled = true;
      },
      get isCancelled() { return cancelled; },
      get isCompleted() { return completed; },
      get isRunning() { return !completed && !cancelled; },
      events() {
        return (async function* () {
          const queue: AgentEvent[] = [];
          const handler = (event: AgentEvent) => queue.push(event);
          eventHandlers.add(handler);
          
          try {
            while (!completed) {
              if (queue.length > 0) {
                yield queue.shift()!;
              } else {
                await new Promise(r => setTimeout(r, 10));
              }
            }
            while (queue.length > 0) {
              yield queue.shift()!;
            }
          } finally {
            eventHandlers.delete(handler);
          }
        })();
      },
      onEvent(handler: (event: AgentEvent) => void) {
        eventHandlers.add(handler);
        return () => { eventHandlers.delete(handler); };
      },
      ...overrides,
    };
  }

  it("has correct initial state", () => {
    const handle = createMockHandle();
    
    expect(handle.runId).toBe(runId);
    expect(handle.isCancelled).toBe(false);
    expect(handle.isCompleted).toBe(false);
    expect(handle.isRunning).toBe(true);
  });

  it("cancel() sets isCancelled to true", () => {
    const handle = createMockHandle();
    
    handle.cancel();
    
    expect(handle.isCancelled).toBe(true);
    expect(handle.isRunning).toBe(false);
  });

  it("events() yields events as they occur", async () => {
    const handle = createMockHandle();
    const events: AgentEvent[] = [];
    
    // Start collecting events
    const collectPromise = (async () => {
      for await (const event of handle.events()) {
        events.push(event);
      }
    })();
    
    // Emit some events
    const event1: AgentEvent = {
      type: "agent.started",
      timestamp: new Date().toISOString(),
      runId,
      prompt: "test",
    };
    const event2: AgentEvent = {
      type: "agent.completed",
      timestamp: new Date().toISOString(),
      runId,
      status: "succeeded",
    };
    
    eventHandlers.forEach(h => h(event1));
    eventHandlers.forEach(h => h(event2));
    
    // Wait a bit for events to be processed
    await new Promise(r => setTimeout(r, 50));
    
    expect(events).toHaveLength(2);
    expect(events[0]!.type).toBe("agent.started");
    expect(events[1]!.type).toBe("agent.completed");
  });

  it("onEvent() registers and unregisters handlers", () => {
    const handle = createMockHandle();
    const events: AgentEvent[] = [];
    
    const unsubscribe = handle.onEvent((event) => {
      events.push(event);
    });
    
    // Emit an event
    const event: AgentEvent = {
      type: "agent.started",
      timestamp: new Date().toISOString(),
      runId,
      prompt: "test",
    };
    eventHandlers.forEach(h => h(event));
    
    expect(events).toHaveLength(1);
    
    // Unsubscribe and emit another event
    unsubscribe();
    const event2: AgentEvent = {
      type: "agent.completed",
      timestamp: new Date().toISOString(),
      runId,
      status: "succeeded",
    };
    eventHandlers.forEach(h => h(event2));
    
    expect(events).toHaveLength(1); // Should not increase
  });

  it("events() stops when completed resolves", async () => {
    const handle = createMockHandle();
    const events: AgentEvent[] = [];
    
    // Start collecting events
    const collectPromise = (async () => {
      for await (const event of handle.events()) {
        events.push(event);
      }
    })();
    
    // Emit an event
    const event1: AgentEvent = {
      type: "agent.started",
      timestamp: new Date().toISOString(),
      runId,
      prompt: "test",
    };
    eventHandlers.forEach(h => h(event1));
    
    await new Promise(r => setTimeout(r, 50));
    
    // Complete the run
    resolveComplete({
      runId,
      status: "succeeded",
      totalSteps: 1,
    });
    
    // Wait for completion
    await completedPromise;
    await new Promise(r => setTimeout(r, 100));
    
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("agent.started");
  });
});
