import type { PlanApprovalStep } from "@vinhnt-sdk/schema";

/** A plan the agent presented to the user and is awaiting a decision on. */
export interface PlanApprovalRequest {
  requestId: string;
  runId: string;
  sessionId: string;
  /** Ordered plan steps. */
  steps: readonly PlanApprovalStep[];
  /** Optional short plan title. */
  title?: string;
  /** Optional rationale for the plan. */
  explanation?: string;
  /** Epoch ms after which the request expires. */
  expiresAt?: number;
}

/** Terminal decision for a plan review. */
export type PlanDecision = "approve" | "request_changes" | "cancel";

/** The user's (or system's) decision on a {@link PlanApprovalRequest}. */
export interface PlanApprovalReply {
  decision: PlanDecision;
  /** Feedback, typically present when `decision === "request_changes"`. */
  feedback?: string;
}

/** Options controlling how long {@link PlanApprovalStore.awaitReply} waits. */
export interface AwaitPlanOptions {
  /** Abort when the caller's run is cancelled; rejects with AbortError. */
  signal?: AbortSignal | undefined;
  /** Hard timeout in ms; rejects with AbortError when elapsed. */
  timeoutMs?: number | undefined;
}

/**
 * Store managing in-flight plan reviews the agent is blocked on.
 *
 * Scoped per run so concurrent runs never cross-resolve. The SDK ships an
 * in-memory default; applications can inject a durable store (e.g. SQLite)
 * without forking the tool. Mirrors `QuestionStore` from this package.
 */
export interface PlanApprovalStore {
  awaitReply(request: PlanApprovalRequest, opts?: AwaitPlanOptions): Promise<PlanApprovalReply>;
  resolveRequest(requestId: string, reply: PlanApprovalReply): void;
  getRequest(requestId: string): PlanApprovalRequest | undefined;
  pendingRequests(runId?: string): readonly PlanApprovalRequest[];
  cancelRequest(requestId: string): void;
}

/** In-memory {@link PlanApprovalStore} implementation. */
export class InMemoryPlanApprovalStore implements PlanApprovalStore {
  private readonly pending = new Map<string, (reply: PlanApprovalReply) => void>();
  private readonly requests: PlanApprovalRequest[] = [];

  awaitReply(request: PlanApprovalRequest, opts?: AwaitPlanOptions): Promise<PlanApprovalReply> {
    this.requests.push(request);
    return new Promise<PlanApprovalReply>((resolve, reject) => {
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
        this.pending.delete(request.requestId);
        fn();
      };
      const onAbort = () => settle(() => reject(new DOMException("Aborted", "AbortError")));

      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) {
        onAbort();
        return;
      }
      if (timeoutMs !== undefined) timer = setTimeout(onAbort, timeoutMs);

      this.pending.set(request.requestId, (reply) => settle(() => resolve(reply)));
    });
  }

  resolveRequest(requestId: string, reply: PlanApprovalReply): void {
    const resolve = this.pending.get(requestId);
    if (resolve) {
      this.pending.delete(requestId);
      resolve(reply);
    }
  }

  getRequest(requestId: string): PlanApprovalRequest | undefined {
    return this.requests.find((r) => r.requestId === requestId);
  }

  pendingRequests(runId?: string): readonly PlanApprovalRequest[] {
    if (runId) return this.requests.filter((r) => r.runId === runId);
    return [...this.requests];
  }

  cancelRequest(requestId: string): void {
    const resolve = this.pending.get(requestId);
    if (resolve) {
      this.pending.delete(requestId);
      // Settle the waiter as "cancel" instead of leaking a dangling promise.
      resolve({ decision: "cancel" });
    }
  }
}
