import { describe, it, expect, vi } from "vitest";
import { InMemoryApprovalStore } from "../src/permission/saved.js";
import type { PermissionRequest, PermissionReply } from "@vinhnt-sdk/core";

function makeRequest(overrides: Partial<PermissionRequest> = {}): PermissionRequest {
  return {
    id: "req-1",
    toolId: "tool-1",
    action: "bash.run",
    resource: "example.sh",
    reason: "testing",
    ...overrides,
  } as PermissionRequest;
}

describe("InMemoryApprovalStore", () => {
  it("stores pending requests and resolves them", async () => {
    const store = new InMemoryApprovalStore();
    const promise = store.awaitReply(makeRequest());

    const reply: PermissionReply = { allowed: true } as PermissionReply;
    store.resolveRequest("req-1", reply);

    const result = await promise;
    expect(result.allowed).toBe(true);
  });

  it("tracks all requests", async () => {
    const store = new InMemoryApprovalStore();
    const p1 = store.awaitReply(makeRequest({ id: "req-1" }));
    const p2 = store.awaitReply(makeRequest({ id: "req-2" }));

    store.resolveRequest("req-1", { allowed: true } as PermissionReply);
    store.resolveRequest("req-2", { allowed: false } as PermissionReply);
    await Promise.all([p1, p2]);

    expect(store.requests).toHaveLength(2);
    expect(store.requests[0]!.id).toBe("req-1");
    expect(store.requests[1]!.id).toBe("req-2");
  });

  it("resolveRequest is no-op for unknown requestId", () => {
    const store = new InMemoryApprovalStore();
    expect(() => store.resolveRequest("ghost", { allowed: true } as PermissionReply)).not.toThrow();
  });

  it("cancelRequest removes pending entry", async () => {
    const store = new InMemoryApprovalStore();
    const promise = store.awaitReply(makeRequest());
    store.cancelRequest("req-1");
    // Promise will never resolve (no leak)
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
    expect(req!.toolId).toBe("tool-1");
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
    const p1 = store.awaitReply(makeRequest({ id: "r1", toolId: "t1" }));
    const p2 = store.awaitReply(makeRequest({ id: "r2", toolId: "t2" }));

    store.resolveRequest("r1", { allowed: true } as PermissionReply);
    store.resolveRequest("r2", { allowed: false } as PermissionReply);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(false);
  });
});
