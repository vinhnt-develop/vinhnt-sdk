import { randomUUID } from "node:crypto";
import type { ApprovalRequest } from "@vinhnt-sdk/schema";

export interface ApprovalHandler {
  requestApproval(req: Omit<ApprovalRequest, "id" | "requestedAt" | "status">): Promise<ApprovalRequest>;
  approve(id: string, resolvedBy?: string): Promise<ApprovalRequest | undefined>;
  reject(id: string, resolvedBy?: string): Promise<ApprovalRequest | undefined>;
  listPending(): ApprovalRequest[];
  getRequest(id: string): ApprovalRequest | undefined;
}

export class WriteApprovalQueue implements ApprovalHandler {
  private requests: ApprovalRequest[] = [];

  async requestApproval(
    req: Omit<ApprovalRequest, "id" | "requestedAt" | "status">,
  ): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      ...req,
      id: randomUUID(),
      requestedAt: new Date().toISOString(),
      status: "pending",
    };
    this.requests.push(request);
    return request;
  }

  async approve(id: string, resolvedBy?: string): Promise<ApprovalRequest | undefined> {
    const idx = this.requests.findIndex((r) => r.id === id && r.status === "pending");
    if (idx === -1) return undefined;
    const req: ApprovalRequest = {
      ...this.requests[idx]!,
      status: "approved",
      resolvedAt: new Date().toISOString(),
      ...(resolvedBy ? { resolvedBy } : {}),
    };
    this.requests[idx] = req;
    return req;
  }

  async reject(id: string, resolvedBy?: string): Promise<ApprovalRequest | undefined> {
    const idx = this.requests.findIndex((r) => r.id === id && r.status === "pending");
    if (idx === -1) return undefined;
    const req: ApprovalRequest = {
      ...this.requests[idx]!,
      status: "rejected",
      resolvedAt: new Date().toISOString(),
      ...(resolvedBy ? { resolvedBy } : {}),
    };
    this.requests[idx] = req;
    return req;
  }

  listPending(): ApprovalRequest[] {
    return this.requests.filter((r) => r.status === "pending");
  }

  getRequest(id: string): ApprovalRequest | undefined {
    return this.requests.find((r) => r.id === id);
  }

  /** Mark expired requests — returns count expired */
  expirePending(): number {
    const now = Date.now();
    let count = 0;
    for (let i = 0; i < this.requests.length; i++) {
      const r = this.requests[i]!;
      if (r.status === "pending" && r.expiresAt && new Date(r.expiresAt).getTime() <= now) {
        this.requests[i] = { ...r, status: "expired", resolvedAt: new Date().toISOString() };
        count++;
      }
    }
    return count;
  }
}
