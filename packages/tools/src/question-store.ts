import type { QuestionItem, QuestionAnswer } from "@vinhnt-sdk/schema";

/** A pending question batch the agent is awaiting an answer for. */
export interface QuestionRequest {
  requestId: string;
  runId: string;
  sessionId: string;
  questions: readonly QuestionItem[];
  /** Offer an "Other" free-text option even when options are predefined. */
  allowCustom?: boolean;
  /** Epoch ms after which the question expires. */
  expiresAt?: number;
}

/** Terminal action for a question reply. */
export type QuestionAction = "accept" | "decline" | "cancel";

/** The user's (or system's) answer to a {@link QuestionRequest}. */
export interface QuestionReply {
  action: QuestionAction;
  /** Present only when `action === "accept"`. */
  answers?: readonly QuestionAnswer[];
}

/** Options controlling how long {@link QuestionStore.awaitReply} waits. */
export interface AwaitQuestionOptions {
  /** Abort when the caller's run is cancelled; rejects with AbortError. */
  signal?: AbortSignal | undefined;
  /** Hard timeout in ms; rejects with AbortError when elapsed. */
  timeoutMs?: number | undefined;
}

/**
 * Store managing in-flight questions the agent is blocked on.
 *
 * Scoped per run so concurrent runs never cross-resolve. The SDK ships an
 * in-memory default; applications can inject a durable store (e.g. SQLite)
 * without forking the tool. Mirrors `ApprovalStore` from `@vinhnt-sdk/permission`.
 */
export interface QuestionStore {
  awaitReply(request: QuestionRequest, opts?: AwaitQuestionOptions): Promise<QuestionReply>;
  resolveRequest(requestId: string, reply: QuestionReply): void;
  getRequest(requestId: string): QuestionRequest | undefined;
  pendingRequests(runId?: string): readonly QuestionRequest[];
  cancelRequest(requestId: string): void;
}

/** In-memory {@link QuestionStore} implementation. */
export class InMemoryQuestionStore implements QuestionStore {
  private readonly pending = new Map<string, (reply: QuestionReply) => void>();
  private readonly requests: QuestionRequest[] = [];

  awaitReply(request: QuestionRequest, opts?: AwaitQuestionOptions): Promise<QuestionReply> {
    this.requests.push(request);
    return new Promise<QuestionReply>((resolve, reject) => {
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

  resolveRequest(requestId: string, reply: QuestionReply): void {
    const resolve = this.pending.get(requestId);
    if (resolve) {
      this.pending.delete(requestId);
      resolve(reply);
    }
  }

  getRequest(requestId: string): QuestionRequest | undefined {
    return this.requests.find((r) => r.requestId === requestId);
  }

  pendingRequests(runId?: string): readonly QuestionRequest[] {
    if (runId) return this.requests.filter((r) => r.runId === runId);
    return [...this.requests];
  }

  cancelRequest(requestId: string): void {
    const resolve = this.pending.get(requestId);
    if (resolve) {
      this.pending.delete(requestId);
      // Settle the waiter as "cancel" instead of leaking a dangling promise.
      resolve({ action: "cancel" });
    }
  }
}
