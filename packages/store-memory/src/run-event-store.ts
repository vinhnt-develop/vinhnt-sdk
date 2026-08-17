import type {
  RunEvent,
  RunEventListener,
  RunEventStore,
  RunEventSnapshot,
  SessionUpdates,
  SessionStore,
} from "@vinhnt-sdk/schema";

/**
 * In-memory implementation of {@link RunEventStore}.
 *
 * Events are idempotent by id, listeners are notified synchronously, and
 * `persist: false` events are broadcast without being stored.
 */
export class InMemoryRunEventStore implements RunEventStore {
  private events: RunEvent[] = [];
  private snapshots = new Map<string, RunEventSnapshot[]>();
  private listeners = new Set<RunEventListener>();

  /** Optional session store used by {@link appendTransactional}. */
  private readonly sessionStore?: SessionStore;

  constructor(sessionStore?: SessionStore) {
    this.sessionStore = sessionStore;
  }

  subscribe(listener: RunEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: RunEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Listener errors must not break the event pipeline
      }
    }
  }

  async exists(eventId: string): Promise<boolean> {
    return this.events.some((e) => e.id === eventId);
  }

  async getNextSequence(aggregateId: string): Promise<number> {
    const max = this.events
      .filter((e) => e.runId === aggregateId)
      .reduce((m, e) => Math.max(m, e.sequence), 0);
    return max + 1;
  }

  async append(event: RunEvent): Promise<void> {
    if (event.persist === false) {
      this.notify(event);
      return;
    }
    if (this.events.some((e) => e.id === event.id)) {
      return;
    }
    this.events.push(event);
    this.notify(event);
  }

  /** Allocate the next sequence for the aggregate and append atomically. */
  async appendWithSequence(event: RunEvent): Promise<number> {
    if (event.persist === false) {
      this.notify(event);
      return 0;
    }
    const existing = this.events.find((e) => e.id === event.id);
    if (existing) {
      return existing.sequence;
    }
    const seq = await this.getNextSequence(event.runId);
    const runEvent = { ...event, sequence: seq } as RunEvent;
    this.events.push(runEvent);
    this.notify(runEvent);
    return seq;
  }

  async appendTransactional(
    event: RunEvent,
    sessionUpdate?: { sessionId: string; updates: SessionUpdates },
  ): Promise<void> {
    if (sessionUpdate && this.sessionStore) {
      await this.sessionStore.updateSession(sessionUpdate.sessionId, sessionUpdate.updates);
    }
    await this.append(event);
  }

  async list(runId: string, afterSequence?: number): Promise<readonly RunEvent[]> {
    return this.events.filter(
      (e) =>
        e.runId === runId &&
        (afterSequence === undefined || e.sequence > afterSequence),
    );
  }

  async saveSnapshot(runId: string, state: Record<string, unknown>): Promise<void> {
    const maxSeq = this.events
      .filter((e) => e.runId === runId)
      .reduce((m, e) => Math.max(m, e.sequence), 0);
    const list = this.snapshots.get(runId) ?? [];
    list.push({ runId, sequence: maxSeq, state, occurredAt: new Date().toISOString() });
    this.snapshots.set(runId, list);
  }

  async getSnapshot(runId: string): Promise<RunEventSnapshot | null> {
    const list = this.snapshots.get(runId);
    if (!list?.length) return null;
    return list[list.length - 1] ?? null;
  }

  async getSnapshotAfterSequence(runId: string, sequence: number): Promise<RunEventSnapshot | null> {
    const list = this.snapshots.get(runId);
    if (!list?.length) return null;
    const sorted = [...list].sort((a, b) => b.sequence - a.sequence);
    return sorted.find((s) => s.sequence <= sequence) ?? null;
  }
}
