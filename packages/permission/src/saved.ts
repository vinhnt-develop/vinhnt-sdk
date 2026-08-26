import type { PermissionRequest, PermissionReply, SavedApproval } from "@vinhnt-sdk/schema";
import type { PermissionRule } from "./permission.js";
import { wildcardMatch } from "@vinhnt-sdk/schema";

/** Persistence contract for remembered allow/deny rules scoped per run. */
export interface PermissionStore {
  addSavedRule(runId: string, action: string, resource: string): Promise<void>;
  removeSavedRule(runId: string, action: string, resource: string): Promise<void>;
  listSavedRules(runId: string): Promise<readonly PermissionRule[]>;
}

/** Options controlling how long {@link ApprovalStore.awaitReply} waits. */
export interface AwaitReplyOptions {
  /** Abort when the caller's run is cancelled; rejects with AbortError. */
  signal?: AbortSignal | undefined;
  /** Hard timeout in ms; rejects with AbortError when elapsed. */
  timeoutMs?: number | undefined;
}

/** Store managing in-flight approval requests and saved allow/reject decisions. */
export interface ApprovalStore {
  awaitReply(request: PermissionRequest, opts?: AwaitReplyOptions): Promise<PermissionReply>;
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

  awaitReply(request: PermissionRequest, opts?: AwaitReplyOptions): Promise<PermissionReply> {
    this.requests.push(request);
    return new Promise<PermissionReply>((resolve, reject) => {
      const { signal, timeoutMs } = opts ?? {};
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        if (timer !== undefined) clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      };
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        this.pending.delete(request.id);
        fn();
      };
      const onAbort = () => settle(() => reject(new DOMException("Aborted", "AbortError")));

      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) {
        onAbort();
        return;
      }
      if (timeoutMs !== undefined) timer = setTimeout(onAbort, timeoutMs);

      this.pending.set(request.id, (reply: PermissionReply) => settle(() => resolve(reply)));
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
    const resolve = this.pending.get(requestId);
    if (resolve) {
      this.pending.delete(requestId);
      // Settle the waiter as a rejection instead of leaking a dangling promise
      // (previously the awaited call hung forever after cancel).
      resolve("reject");
    }
  }

  pendingRequests(runId?: string): readonly PermissionRequest[] {
    if (runId) return this.requests.filter((r) => r.runId === runId);
    return [...this.requests];
  }

  saveApproval(approval: SavedApproval): void {
    this.savedApprovals.push(approval);
  }

  /**
   * Check whether a saved approval covers `resource`. A saved approval matches
   * when its `action` and agent scope agree AND its `resource` glob-matches the
   * requested resource (e.g. `tool.read_file(src/*)` covers `tool.read_file(src/a.ts)`).
   */
  checkApproval(resource: string, action: string, agentId?: string): boolean {
    return this.savedApprovals.some(
      (a) => a.action === action && (!a.agentId || a.agentId === agentId) && wildcardMatch(a.resource, resource),
    );
  }

  saveRejection(resource: string, action: string, agentId?: string): void {
    this.savedRejections.push({ resource, action, ...(agentId !== undefined ? { agentId } : {}) });
  }

  /**
   * Check whether a saved rejection covers `resource`. A saved rejection matches
   * when its `action` and agent scope agree AND its `resource` glob-matches the
   * requested resource (e.g. `tool.write_file(src/*)` covers `tool.write_file(src/a.ts)`).
   */
  checkRejection(resource: string, action: string, agentId?: string): boolean {
    return this.savedRejections.some(
      (r) => r.action === action && (!r.agentId || r.agentId === agentId) && wildcardMatch(r.resource, resource),
    );
  }
}