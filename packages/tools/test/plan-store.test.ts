import { describe, expect, it } from "vitest";
import { InMemoryPlanApprovalStore } from "../src/plan-store.js";
import type { PlanApprovalRequest } from "../src/plan-store.js";

function makeRequest(overrides: Partial<PlanApprovalRequest> = {}): PlanApprovalRequest {
  return {
    requestId: "req-1",
    runId: "run-1",
    sessionId: "sess-1",
    steps: [{ text: "do a thing" }],
    ...overrides,
  };
}

describe("InMemoryPlanApprovalStore", () => {
  it("resolves a pending request with the user decision", async () => {
    const store = new InMemoryPlanApprovalStore();
    const promise = store.awaitReply(makeRequest());
    store.resolveRequest("req-1", { decision: "approve" });
    await expect(promise).resolves.toEqual({ decision: "approve" });
  });

  it("carries feedback on request_changes", async () => {
    const store = new InMemoryPlanApprovalStore();
    const promise = store.awaitReply(makeRequest());
    store.resolveRequest("req-1", { decision: "request_changes", feedback: "too big" });
    await expect(promise).resolves.toEqual({ decision: "request_changes", feedback: "too big" });
  });

  it("tracks pending requests and exposes them by runId", async () => {
    const store = new InMemoryPlanApprovalStore();
    void store.awaitReply(makeRequest({ requestId: "r1", runId: "run-1" }));
    void store.awaitReply(makeRequest({ requestId: "r2", runId: "run-2" }));
    expect(store.pendingRequests()).toHaveLength(2);
    expect(store.pendingRequests("run-1").map((r) => r.requestId)).toEqual(["r1"]);
    expect(store.getRequest("r2")?.runId).toBe("run-2");
  });

  it("resolveRequest is a no-op for an unknown requestId", () => {
    const store = new InMemoryPlanApprovalStore();
    expect(() => store.resolveRequest("ghost", { decision: "cancel" })).not.toThrow();
  });

  it("cancelRequest settles the waiter as cancel", async () => {
    const store = new InMemoryPlanApprovalStore();
    const promise = store.awaitReply(makeRequest());
    store.cancelRequest("req-1");
    await expect(promise).resolves.toEqual({ decision: "cancel" });
  });

  it("awaitReply rejects with AbortError when the signal aborts", async () => {
    const store = new InMemoryPlanApprovalStore();
    const abort = new AbortController();
    const promise = store.awaitReply(makeRequest(), { signal: abort.signal });
    abort.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("awaitReply rejects with AbortError on timeout", async () => {
    const store = new InMemoryPlanApprovalStore();
    const promise = store.awaitReply(makeRequest(), { timeoutMs: 5 });
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });
});
