import { describe, it, expect, vi } from "vitest";
import { InMemoryApprovalStore } from "../src/index.js";
import type { PermissionRequest, PermissionReply, RequestId, RunId } from "@vinhnt-sdk/schema";

const id = (s: string) => s as RequestId;
const runId = (s: string) => s as RunId;
const replyFor = (allowed: boolean): PermissionReply => (allowed ? "once" : "reject");

type RequestOverrides = Partial<PermissionRequest> & {
  toolId?: string;
  action?: string;
};

function makeRequest(overrides: RequestOverrides = {}): PermissionRequest {
  return {
    id: id("req-1"),
    runId: runId("run-1"),
    toolName: "read_file",
    resource: "example.sh",
    reason: "testing",
    prompt: "test prompt",
    occurredAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as unknown as PermissionRequest;
}

describe("InMemoryApprovalStore", () => {
  it("stores pending requests and resolves them", async () => {
    const store = new InMemoryApprovalStore();
    const promise = store.awaitReply(makeRequest());

    const reply: PermissionReply = replyFor(true);
    store.resolveRequest("req-1", reply);

    const result = await promise;
    expect(result).toBe("once");
  });

  it("tracks all requests", async () => {
    const store = new InMemoryApprovalStore();
    const p1 = store.awaitReply(makeRequest({ id: id("req-1") }));
    const p2 = store.awaitReply(makeRequest({ id: id("req-2") }));

    store.resolveRequest("req-1", replyFor(true));
    store.resolveRequest("req-2", replyFor(false));
    await Promise.all([p1, p2]);

    expect(store.requests).toHaveLength(2);
    expect(store.requests[0]!.id).toBe("req-1");
    expect(store.requests[1]!.id).toBe("req-2");
  });

  it("resolveRequest is no-op for unknown requestId", () => {
    const store = new InMemoryApprovalStore();
    expect(() => store.resolveRequest("ghost", replyFor(true))).not.toThrow();
  });

  it("cancelRequest settles the waiter with reject (no dangling promise)", async () => {
    const store = new InMemoryApprovalStore();
    const promise = store.awaitReply(makeRequest());
    store.cancelRequest("req-1");
    await expect(promise).resolves.toBe("reject");
    expect(store.pendingRequests("").length).toBeGreaterThanOrEqual(0);
  });

  it("awaitReply rejects with AbortError when the run signal aborts (RV-29)", async () => {
    const store = new InMemoryApprovalStore();
    const abort = new AbortController();
    const promise = store.awaitReply(makeRequest(), { signal: abort.signal });

    abort.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("awaitReply rejects with AbortError when already aborted before wait (RV-29)", async () => {
    const store = new InMemoryApprovalStore();
    const abort = new AbortController();
    abort.abort();
    const promise = store.awaitReply(makeRequest(), { signal: abort.signal });
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("awaitReply rejects with AbortError on timeout (RV-29)", async () => {
    const store = new InMemoryApprovalStore();
    const promise = store.awaitReply(makeRequest(), { timeoutMs: 5 });
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("cancelRequest is no-op for unknown requestId", () => {
    const store = new InMemoryApprovalStore();
    expect(() => store.cancelRequest("ghost")).not.toThrow();
  });

  it("getRequest returns stored request", () => {
    const store = new InMemoryApprovalStore();
    store.awaitReply(makeRequest());
    const req = store.getRequest("req-1");
    expect(req).toBeDefined();
    expect(req!.id).toBe("req-1");
  });

  it("getRequest returns undefined for unknown", () => {
    const store = new InMemoryApprovalStore();
    expect(store.getRequest("ghost")).toBeUndefined();
  });

  it("saveApproval stores persistent approval", () => {
    const store = new InMemoryApprovalStore();
    store.saveApproval({ resource: "*.ts", action: "edit", agentId: "agent-1" });
    expect(store.savedApprovals).toHaveLength(1);
  });

  it("checkApproval checks saved approvals without agentId", () => {
    const store = new InMemoryApprovalStore();
    store.saveApproval({ resource: "*.ts", action: "edit" });
    expect(store.checkApproval("*.ts", "edit")).toBe(true);
    expect(store.checkApproval("*.ts", "delete")).toBe(false);
  });

  it("checkApproval checks saved approvals with agentId", () => {
    const store = new InMemoryApprovalStore();
    store.saveApproval({ resource: "*.ts", action: "edit", agentId: "agent-1" });
    expect(store.checkApproval("*.ts", "edit", "agent-1")).toBe(true);
    expect(store.checkApproval("*.ts", "edit", "agent-2")).toBe(false);
  });

  it("checkApproval returns false when no matching saved approval", () => {
    const store = new InMemoryApprovalStore();
    expect(store.checkApproval("anything", "anything")).toBe(false);
  });

  it("handles multiple pending requests concurrently", async () => {
    const store = new InMemoryApprovalStore();
    const p1 = store.awaitReply(makeRequest({ id: id("r1"), toolId: "t1" }));
    const p2 = store.awaitReply(makeRequest({ id: id("r2"), toolId: "t2" }));

    store.resolveRequest("r1", replyFor(true));
    store.resolveRequest("r2", replyFor(false));

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe("once");
    expect(r2).toBe("reject");
  });
});
