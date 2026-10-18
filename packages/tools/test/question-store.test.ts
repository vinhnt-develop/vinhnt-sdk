import { describe, expect, it } from "vitest";
import { InMemoryQuestionStore } from "../src/question-store.js";
import type { QuestionRequest } from "../src/question-store.js";

function makeRequest(overrides: Partial<QuestionRequest> = {}): QuestionRequest {
  return {
    requestId: "req-1",
    runId: "run-1",
    sessionId: "sess-1",
    questions: [{ header: "H", question: "Which?" }],
    ...overrides,
  };
}

describe("InMemoryQuestionStore", () => {
  it("resolves a pending request with the user reply", async () => {
    const store = new InMemoryQuestionStore();
    const promise = store.awaitReply(makeRequest());
    store.resolveRequest("req-1", { action: "accept", answers: [{ header: "H", selected: ["a"] }] });
    await expect(promise).resolves.toEqual({ action: "accept", answers: [{ header: "H", selected: ["a"] }] });
  });

  it("tracks pending requests and exposes them by runId", async () => {
    const store = new InMemoryQuestionStore();
    void store.awaitReply(makeRequest({ requestId: "r1", runId: "run-1" }));
    void store.awaitReply(makeRequest({ requestId: "r2", runId: "run-2" }));
    expect(store.pendingRequests()).toHaveLength(2);
    expect(store.pendingRequests("run-1").map((r) => r.requestId)).toEqual(["r1"]);
    expect(store.getRequest("r2")?.runId).toBe("run-2");
  });

  it("resolveRequest is a no-op for an unknown requestId", () => {
    const store = new InMemoryQuestionStore();
    expect(() => store.resolveRequest("ghost", { action: "cancel" })).not.toThrow();
  });

  it("cancelRequest settles the waiter as cancel", async () => {
    const store = new InMemoryQuestionStore();
    const promise = store.awaitReply(makeRequest());
    store.cancelRequest("req-1");
    await expect(promise).resolves.toEqual({ action: "cancel" });
  });

  it("awaitReply rejects with AbortError when the signal aborts", async () => {
    const store = new InMemoryQuestionStore();
    const abort = new AbortController();
    const promise = store.awaitReply(makeRequest(), { signal: abort.signal });
    abort.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("awaitReply rejects with AbortError on timeout", async () => {
    const store = new InMemoryQuestionStore();
    const promise = store.awaitReply(makeRequest(), { timeoutMs: 5 });
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });
});
