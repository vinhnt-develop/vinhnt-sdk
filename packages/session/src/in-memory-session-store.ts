import type { Message, RunEvent, RunEventListener, Session, SessionStats, SessionId, MessageId } from "@vinhnt-sdk/schema";
import { ValidationError } from "@vinhnt-sdk/schema";
import type { RunEventStore, RunEventSnapshot, SessionStore, SessionUpdates, AddMessageOptions } from "./store.js";

/**
 * In-memory {@link SessionStore} reference implementation (G4.1).
 *
 * Fully functional (unlike {@link NullSessionStore}) so tests, prototypes and
 * `forkSessionHistory` exercise real message storage without a database —
 * the hand-rolled partial store fakes in durable-reload tests collapse into
 * this one. Mirrors the sqlite store's semantics: `forkSession` links a child
 * session but does NOT copy messages (use `forkSessionHistory` for that).
 */
export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, Session>();
  private readonly messages = new Map<string, Message[]>();
  private idCounter = 0;

  private nextId(prefix: "ses" | "msg"): string {
    this.idCounter += 1;
    return `${prefix}_${Date.now().toString(36)}_${this.idCounter.toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
  }

  private touch(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) session.updatedAt = new Date().toISOString();
  }

  async createSession(title?: string, parentSessionId?: string): Promise<Session> {
    const now = new Date().toISOString();
    const session: Session = {
      id: this.nextId("ses") as SessionId,
      title: title ?? "New Session",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      ...(parentSessionId !== undefined ? { parentSessionId: parentSessionId as SessionId } : {}),
    };
    this.sessions.set(session.id, session);
    this.messages.set(session.id, []);
    return session;
  }

  /** Link-only fork (SessionStore contract) — copy messages via `forkSessionHistory`. */
  async forkSession(sourceSessionId: string, title?: string): Promise<Session> {
    const source = await this.getSession(sourceSessionId);
    if (!source) throw new ValidationError(`Source session not found: ${sourceSessionId}`);
    return this.createSession(title ?? `Fork of ${source.title}`, sourceSessionId);
  }

  async getSession(id: string): Promise<Session | null> {
    return this.sessions.get(id) ?? null;
  }

  async listSessions(limit?: number, offset?: number): Promise<readonly Session[]> {
    const sorted = [...this.sessions.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    const start = offset !== undefined && offset > 0 ? offset : 0;
    const end = limit !== undefined && limit > 0 ? start + limit : undefined;
    return sorted.slice(start, end);
  }

  async updateSession(id: string, updates: SessionUpdates): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) return;
    Object.assign(session, updates);
    session.updatedAt = new Date().toISOString();
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
    this.messages.delete(id);
  }

  /** Dual signature: options object (preferred) or legacy positional params. */
  async addMessage(
    sessionId: string,
    roleOrMessage: string | AddMessageOptions,
    content?: string,
    toolCallId?: string,
    tokens?: { input: number; output: number; reasoning?: number },
    model?: string,
    cost?: number,
    admittedSeq?: number,
  ): Promise<Message> {
    const opts: AddMessageOptions = typeof roleOrMessage === "string"
      ? {
          role: roleOrMessage,
          content: content ?? "",
          ...(toolCallId ? { toolCallId } : {}),
          ...(tokens ? { tokens } : {}),
          ...(model ? { model } : {}),
          ...(cost !== undefined ? { cost } : {}),
          ...(admittedSeq !== undefined ? { admittedSeq } : {}),
        }
      : roleOrMessage;

    const row: Message = {
      id: this.nextId("msg") as MessageId,
      sessionId: sessionId as SessionId,
      role: opts.role,
      content: opts.content,
      createdAt: new Date().toISOString(),
      ...(opts.toolCallId ? { toolCallId: opts.toolCallId } : {}),
      ...(opts.toolCalls && opts.toolCalls.length > 0 ? { toolCalls: [...opts.toolCalls] } : {}),
      ...(opts.contentBlocks && opts.contentBlocks.length > 0 ? { contentBlocks: [...opts.contentBlocks] } : {}),
      ...(opts.tokens ? { tokens: opts.tokens } : {}),
      ...(opts.model ? { model: opts.model } : {}),
      ...(opts.provider ? { provider: opts.provider } : {}),
      ...(opts.cost !== undefined ? { cost: opts.cost } : {}),
      ...(opts.admittedSeq !== undefined ? { admittedSeq: opts.admittedSeq } : {}),
    };

    let rows = this.messages.get(sessionId);
    if (!rows) {
      rows = [];
      this.messages.set(sessionId, rows);
    }
    rows.push(row);
    this.touch(sessionId);
    return row;
  }

  async updateMessage(sessionId: string, messageId: string, updates: { admittedSeq?: number; promotedSeq?: number }): Promise<void> {
    const rows = this.messages.get(sessionId);
    if (!rows) return;
    const row = rows.find((r) => r.id === messageId);
    if (!row) return;
    if (updates.admittedSeq !== undefined) row.admittedSeq = updates.admittedSeq;
    if (updates.promotedSeq !== undefined) row.promotedSeq = updates.promotedSeq;
    this.touch(sessionId);
  }

  async listMessages(sessionId: string, options?: { limit?: number; offset?: number; role?: string }): Promise<readonly Message[]> {
    let rows = this.messages.get(sessionId) ?? [];
    if (options?.role !== undefined) rows = rows.filter((r) => r.role === options.role);
    const start = options?.offset !== undefined && options.offset > 0 ? options.offset : 0;
    const end = options?.limit !== undefined && options.limit > 0 ? start + options.limit : undefined;
    return rows.slice(start, end);
  }

  async searchMessages(query: string, options?: { sessionId?: string; limit?: number }): Promise<readonly Message[]> {
    const needle = query.toLowerCase();
    const limit = options?.limit !== undefined && options.limit > 0 ? options.limit : 100;
    const sessionIds = options?.sessionId !== undefined ? [options.sessionId] : [...this.messages.keys()];
    const hits: Message[] = [];
    for (const sessionId of sessionIds) {
      for (const row of this.messages.get(sessionId) ?? []) {
        if (row.content.toLowerCase().includes(needle)) hits.push(row);
      }
    }
    return hits.slice(0, limit);
  }

  async getSessionStats(): Promise<SessionStats> {
    const sessions = [...this.sessions.values()];
    let totalMessages = 0;
    for (const rows of this.messages.values()) totalMessages += rows.length;

    const sessionsByDate = new Map<string, number>();
    const costByModel = new Map<string, number>();
    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    for (const session of sessions) {
      const date = session.createdAt.slice(0, 10);
      sessionsByDate.set(date, (sessionsByDate.get(date) ?? 0) + 1);
      const cost = session.cost ?? 0;
      totalCost += cost;
      totalInputTokens += session.inputTokens ?? 0;
      totalOutputTokens += session.outputTokens ?? 0;
      if (session.model) costByModel.set(session.model, (costByModel.get(session.model) ?? 0) + cost);
    }

    return {
      totalSessions: sessions.length,
      totalCost,
      totalInputTokens,
      totalOutputTokens,
      totalMessages,
      sessionsByDate: [...sessionsByDate.entries()].map(([date, count]) => ({ date, count })),
      costByModel: [...costByModel.entries()].map(([model, cost]) => ({ model, cost })),
    };
  }
}

/**
 * Minimal in-memory {@link RunEventStore} that actually serves `list()` —
 * unlike {@link NullRunEventStore} (whose `list()` returns `[]` and therefore
 * cannot drive replay). Snapshots are stored per runId.
 */
export class InMemoryRunEventStore implements RunEventStore {
  private readonly eventsByRun = new Map<string, RunEventSnapshotState>();
  private readonly snapshots = new Map<string, RunEventSnapshot>();
  private readonly listeners = new Set<RunEventListener>();

  private bucket(runId: string): { events: RunEvent[]; nextSequence: number } {
    let bucket = this.eventsByRun.get(runId);
    if (!bucket) {
      bucket = { events: [], nextSequence: 0 };
      this.eventsByRun.set(runId, bucket);
    }
    return bucket;
  }

  async append(event: RunEvent): Promise<void> {
    if (event.persist === false) return;
    this.bucket(event.runId).events.push(event);
    for (const listener of this.listeners) listener(event);
  }

  async appendWithSequence(event: RunEvent): Promise<number> {
    const bucket = this.bucket(event.runId);
    const sequence = bucket.nextSequence;
    bucket.nextSequence = sequence + 1;
    await this.append({ ...event, sequence } as RunEvent);
    return sequence;
  }

  async exists(eventId: string): Promise<boolean> {
    for (const bucket of this.eventsByRun.values()) {
      if (bucket.events.some((e) => e.id === eventId)) return true;
    }
    return false;
  }

  async list(runId: string, afterSequence?: number): Promise<readonly RunEvent[]> {
    const events = this.bucket(runId).events;
    return afterSequence === undefined ? [...events] : events.filter((e) => e.sequence > afterSequence);
  }

  async listRunIds(): Promise<string[]> {
    return [...this.eventsByRun.keys()].filter((runId) => this.bucket(runId).events.length > 0);
  }

  async getNextSequence(aggregateId: string): Promise<number> {
    return this.bucket(aggregateId).nextSequence;
  }

  async saveSnapshot(runId: string, state: Record<string, unknown>): Promise<void> {
    const bucket = this.bucket(runId);
    this.snapshots.set(runId, {
      runId,
      sequence: Math.max(0, bucket.nextSequence - 1),
      state,
      occurredAt: new Date().toISOString(),
    });
  }

  async getSnapshot(runId: string): Promise<RunEventSnapshot | null> {
    return this.snapshots.get(runId) ?? null;
  }

  async getSnapshotAfterSequence(runId: string, sequence: number): Promise<RunEventSnapshot | null> {
    const snapshot = this.snapshots.get(runId);
    return snapshot && snapshot.sequence > sequence ? snapshot : null;
  }

  subscribe(listener: RunEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

interface RunEventSnapshotState {
  readonly events: RunEvent[];
  nextSequence: number;
}
