import type { PermissionRequest, PermissionReply, SavedApproval } from "@vinhnt-sdk/schema";
import type { PermissionRule } from "./permission.js";

/** Persistence contract for remembered allow/deny rules scoped per run. */
export interface PermissionStore {
  addSavedRule(runId: string, action: string, resource: string): Promise<void>;
  removeSavedRule(runId: string, action: string, resource: string): Promise<void>;
  listSavedRules(runId: string): Promise<readonly PermissionRule[]>;
}

/** Store managing in-flight approval requests and saved allow/reject decisions. */
export interface ApprovalStore {
  awaitReply(request: PermissionRequest): Promise<PermissionReply>;
  resolveRequest(requestId: string, reply: PermissionReply): void;
  getRequest(requestId: string): PermissionRequest | undefined;
  pendingRequests(runId?: string): readonly PermissionRequest[];
  cancelRequest(requestId: string): void;
  saveApproval(approval: SavedApproval): void;
  checkApproval(resource: string, action: string, agentId?: string): boolean;
  saveRejection(resource: string, action: string, agentId?: string): void;
  checkRejection(resource: string, action: string, agentId?: string): boolean;
}

/** In-memory {@link ApprovalStore} implementation. */
export class InMemoryApprovalStore implements ApprovalStore {
  private pending = new Map<string, (reply: PermissionReply) => void>();
  readonly requests: PermissionRequest[] = [];
  readonly savedApprovals: SavedApproval[] = [];
  readonly savedRejections: SavedApproval[] = [];

  awaitReply(request: PermissionRequest): Promise<PermissionReply> {
    this.requests.push(request);
    return new Promise((resolve) => {
      this.pending.set(request.id, resolve);
    });
  }

  resolveRequest(requestId: string, reply: PermissionReply): void {
    const resolve = this.pending.get(requestId);
    if (resolve) {
      this.pending.delete(requestId);
      resolve(reply);
    }
  }

  getRequest(requestId: string): PermissionRequest | undefined {
    return this.requests.find((r) => r.id === requestId);
  }

  cancelRequest(requestId: string): void {
    this.pending.delete(requestId);
  }

  pendingRequests(runId?: string): readonly PermissionRequest[] {
    if (runId) return this.requests.filter((r) => r.runId === runId);
    return [...this.requests];
  }

  saveApproval(approval: SavedApproval): void {
    this.savedApprovals.push(approval);
  }

  checkApproval(resource: string, action: string, agentId?: string): boolean {
    return this.savedApprovals.some(
      (a) => a.resource === resource && a.action === action && (!a.agentId || a.agentId === agentId),
    );
  }

  saveRejection(resource: string, action: string, agentId?: string): void {
    this.savedRejections.push({ resource, action, agentId });
  }

  checkRejection(resource: string, action: string, agentId?: string): boolean {
    return this.savedRejections.some(
      (r) => r.resource === resource && r.action === action && (!r.agentId || r.agentId === agentId),
    );
  }
}