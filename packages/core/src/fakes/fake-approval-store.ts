import type { PermissionRequest, PermissionReply, SavedApproval } from "@vinhnt-sdk/schema";
import type { ApprovalStore } from "@vinhnt-sdk/permission";

export class FakeApprovalStore implements ApprovalStore {
  /** Resolve all pending requests with this reply automatically */
  autoReply: PermissionReply | null = null;
  /** Queue of replies to return in order */
  private replyQueue: PermissionReply[] = [];
  /** Pending request resolvers */
  private pending = new Map<string, (reply: PermissionReply) => void>();
  readonly requests: PermissionRequest[] = [];
  readonly savedApprovals: SavedApproval[] = [];
  readonly savedRejections: SavedApproval[] = [];

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

  awaitReply(request: PermissionRequest): Promise<PermissionReply> {
    this.requests.push(request);

    if (this.replyQueue.length > 0) {
      return Promise.resolve(this.replyQueue.shift()!);
    }
    if (this.autoReply) {
      return Promise.resolve(this.autoReply);
    }
    // Return a promise that stays pending — resolve via resolveRequest
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

  /** Queue a reply for the next awaitReply call */
  queueReply(reply: PermissionReply): void {
    this.replyQueue.push(reply);
  }

  /** Resolve all pending requests with "reject" */
  rejectAll(): void {
    for (const [id, resolve] of this.pending) {
      this.pending.delete(id);
      resolve("reject");
    }
  }
}
