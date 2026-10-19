import { describe, expect, it } from "vitest";
import { InMemoryElicitationStore } from "../src/elicitation-store.js";
import type { ElicitationRequest } from "../src/elicitation-store.js";

function makeRequest(overrides: Partial<ElicitationRequest> = {}): ElicitationRequest {
  return {
    requestId: "req-1",
    runId: "run-1",
    sessionId: "sess-1",
    message: "Please provide details",
    mode: "form",
    requestedSchema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
    ...overrides,
  };
}

describe("InMemoryElicitationStore", () => {
  it("resolves a pending request with the user reply", async () => {
    const store = new InMemoryElicitationStore();
    const promise = store.awaitReply(makeRequest());
    store.resolveRequest("req-1", { action: "accept", content: { name: "Ada" } });
    await expect(promise).resolves.toEqual({ action: "accept", content: { name: "Ada" } });
  });

  it("tracks pending requests and exposes them by runId", async () => {
    const store = new InMemoryElicitationStore();
    void store.awaitReply(makeRequest({ requestId: "r1", runId: "run-1" }));
    void store.awaitReply(makeRequest({ requestId: "r2", runId: "run-2" }));
    expect(store.pendingRequests()).toHaveLength(2);
    expect(store.pendingRequests("run-1").map((r) => r.requestId)).toEqual(["r1"]);
    expect(store.getRequest("r2")?.runId).toBe("run-2");
  });

  it("resolveRequest is a no-op for an unknown requestId", () => {
    const store = new InMemoryElicitationStore();
    expect(() => store.resolveRequest("ghost", { action: "cancel" })).not.toThrow();
  });

  it("cancelRequest settles the waiter as cancel", async () => {
    const store = new InMemoryElicitationStore();
    const promise = store.awaitReply(makeRequest());
    store.cancelRequest("req-1");
    await expect(promise).resolves.toEqual({ action: "cancel" });
  });

  it("awaitReply rejects with AbortError when the signal aborts", async () => {
    const store = new InMemoryElicitationStore();
    const abort = new AbortController();
    const promise = store.awaitReply(makeRequest(), { signal: abort.signal });
    abort.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("awaitReply rejects with AbortError on timeout", async () => {
    const store = new InMemoryElicitationStore();
    const promise = store.awaitReply(makeRequest(), { timeoutMs: 5 });
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });
});
