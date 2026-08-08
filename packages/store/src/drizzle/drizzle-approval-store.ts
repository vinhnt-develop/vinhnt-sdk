import type { ApprovalStore } from "@vinhnt-sdk/core";
import { InMemoryApprovalStore } from "@vinhnt-sdk/core";
import type { PermissionRequest, PermissionReply, SavedApproval } from "@vinhnt-sdk/schema";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { DrizzleSavedApprovalStore } from "./saved-approval-store.js";

export class DrizzleApprovalStore implements ApprovalStore {
  private readonly memory: InMemoryApprovalStore;
  private readonly dbStore: DrizzleSavedApprovalStore;

  constructor(db: BetterSQLite3Database) {
    this.memory = new InMemoryApprovalStore();
    this.dbStore = new DrizzleSavedApprovalStore(db);
  }

  async init(): Promise<void> {
    const [approvals, rejections] = await Promise.all([
      this.dbStore.loadAll(),
      this.dbStore.loadAllRejections(),
    ]);
    for (const a of approvals) {
      this.memory.saveApproval(a);
    }
    for (const r of rejections) {
      this.memory.saveRejection(r.resource, r.action, r.agentId);
    }
  }

  awaitReply(request: PermissionRequest): Promise<PermissionReply> {
    return this.memory.awaitReply(request);
  }

  resolveRequest(requestId: string, reply: PermissionReply): void {
    this.memory.resolveRequest(requestId, reply);
  }

  getRequest(requestId: string): PermissionRequest | undefined {
    return this.memory.getRequest(requestId);
  }

  pendingRequests(runId?: string): readonly PermissionRequest[] {
    return this.memory.pendingRequests(runId);
  }

  cancelRequest(requestId: string): void {
    this.memory.cancelRequest(requestId);
  }

  saveApproval(approval: SavedApproval): void {
    this.memory.saveApproval(approval);
    this.dbStore.saveApproval(approval).catch(() => {});
  }

  checkApproval(resource: string, action: string, agentId?: string): boolean {
    return this.memory.checkApproval(resource, action, agentId);
  }

  saveRejection(resource: string, action: string, agentId?: string): void {
    this.memory.saveRejection(resource, action, agentId);
    this.dbStore.saveRejection(resource, action, agentId).catch(() => {});
  }

  checkRejection(resource: string, action: string, agentId?: string): boolean {
    return this.memory.checkRejection(resource, action, agentId);
  }
}
