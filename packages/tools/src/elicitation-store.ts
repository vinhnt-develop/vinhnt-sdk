import type {
  ElicitationMode,
  ElicitationRequestedSchema,
} from "@vinhnt-sdk/schema";

/** A pending elicitation the agent is awaiting a structured reply for. */
export interface ElicitationRequest {
  requestId: string;
  runId: string;
  sessionId: string;
  /** Human-readable prompt shown above the form. */
  message: string;
  /** `form` (default) renders a schema-driven form; `url` prompts to open a link. */
  mode: ElicitationMode;
  /** Target URL when `mode === "url"`. */
  url?: string;
  /** Flat form schema when `mode === "form"`. */
  requestedSchema?: ElicitationRequestedSchema;
  /** Epoch ms after which the request expires. */
  expiresAt?: number;
}

/** Terminal action for an elicitation reply. */
export type ElicitationAction = "accept" | "decline" | "cancel";

/** The user's (or system's) response to an {@link ElicitationRequest}. */
export interface ElicitationReply {
  action: ElicitationAction;
  /** Present only when `action === "accept"`. */
  content?: Record<string, unknown>;
}

/** Options controlling how long {@link ElicitationStore.awaitReply} waits. */
export interface AwaitElicitationOptions {
  /** Abort when the caller's run is cancelled; rejects with AbortError. */
  signal?: AbortSignal | undefined;
  /** Hard timeout in ms; rejects with AbortError when elapsed. */
  timeoutMs?: number | undefined;
}

/**
 * Store managing in-flight elicitation requests the agent is blocked on.
 *
 * Scoped per run so concurrent runs never cross-resolve. The SDK ships an
 * in-memory default; applications can inject a durable store (e.g. SQLite)
 * without forking the tool. Mirrors `QuestionStore`.
 */
export interface ElicitationStore {
  awaitReply(
    request: ElicitationRequest,
    opts?: AwaitElicitationOptions,
  ): Promise<ElicitationReply>;
  resolveRequest(requestId: string, reply: ElicitationReply): void;
  getRequest(requestId: string): ElicitationRequest | undefined;
  pendingRequests(runId?: string): readonly ElicitationRequest[];
  cancelRequest(requestId: string): void;
}

/** In-memory {@link ElicitationStore} implementation. */
export class InMemoryElicitationStore implements ElicitationStore {
  private readonly pending = new Map<string, (reply: ElicitationReply) => void>();
  private readonly requests: ElicitationRequest[] = [];

  awaitReply(
    request: ElicitationRequest,
    opts?: AwaitElicitationOptions,
  ): Promise<ElicitationReply> {
    this.requests.push(request);
    return new Promise<ElicitationReply>((resolve, reject) => {
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

  resolveRequest(requestId: string, reply: ElicitationReply): void {
    const resolve = this.pending.get(requestId);
    if (resolve) {
      this.pending.delete(requestId);
      resolve(reply);
    }
  }

  getRequest(requestId: string): ElicitationRequest | undefined {
    return this.requests.find((r) => r.requestId === requestId);
  }

  pendingRequests(runId?: string): readonly ElicitationRequest[] {
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
