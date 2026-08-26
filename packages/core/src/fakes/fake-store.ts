import type { RunEvent } from "@vinhnt-sdk/schema";
import type { RunEventListener, RunEventStore, RunEventSnapshot } from "@vinhnt-sdk/session";

export class FakeRunEventStore implements RunEventStore {
  private events: RunEvent[] = [];
  private snapshots = new Map<string, RunEventSnapshot[]>();
  private listeners = new Set<RunEventListener>();

  subscribe(listener: RunEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async exists(eventId: string): Promise<boolean> {
    return this.events.some((e) => e.id === eventId);
  }

  async append(event: RunEvent): Promise<void> {
    if (event.persist === false) {
      for (const fn of this.listeners) { try { fn(event); } catch { /* ignore */ } }
      return;
    }
    // Idempotent: skip if event already exists
    if (this.events.some((e) => e.id === event.id)) {
      return;
    }
    this.events.push(event);
    for (const fn of this.listeners) { try { fn(event); } catch { /* ignore */ } }
  }

  /** Atomic: allocate the next sequence and append in a single step (no interleaving). */
  async appendWithSequence(event: RunEvent): Promise<number> {
    if (event.persist === false) {
      for (const fn of this.listeners) { try { fn(event); } catch { /* ignore */ } }
      return 0;
    }
    if (this.events.some((e) => e.id === event.id)) {
      return this.events.find((e) => e.id === event.id)!.sequence;
    }
    const seq = this.events.filter((e) => e.runId === event.runId).reduce((m, e) => Math.max(m, e.sequence), 0) + 1;
    const runEvent = { ...event, sequence: seq } as RunEvent;
    this.events.push(runEvent);
    for (const fn of this.listeners) { try { fn(runEvent); } catch { /* ignore */ } }
    return seq;
  }

  async list(runId: string, afterSequence?: number): Promise<readonly RunEvent[]> {
    return this.events.filter(
      (e) => e.runId === runId && (afterSequence === undefined || e.sequence > afterSequence),
    );
  }

  async listRunIds(): Promise<string[]> {
    const ids = new Set<string>();
    for (const e of this.events) {
      if (e.persist !== false) ids.add(e.runId);
    }
    return [...ids];
  }

  async saveSnapshot(runId: string, state: Record<string, unknown>): Promise<void> {
    const maxSeq = this.events.filter((e) => e.runId === runId).reduce((m, e) => Math.max(m, e.sequence), 0);
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

  async getNextSequence(aggregateId: string): Promise<number> {
    const maxSeq = this.events.filter((e) => e.runId === aggregateId).reduce((m, e) => Math.max(m, e.sequence), 0);
    return maxSeq + 1;
  }
}
