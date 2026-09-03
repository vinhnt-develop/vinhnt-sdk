import type { RunEvent, Session, Message, SessionStats } from "@vinhnt-sdk/schema";

export interface RunEventSnapshot {
  readonly runId: string;
  readonly sequence: number;
  readonly state: Record<string, unknown>;
  readonly occurredAt: string;
}

export type RunEventListener = (event: RunEvent) => void;

export type SessionUpdates = Partial<Pick<Session, "title" | "isActive" | "model" | "provider" | "cost" | "inputTokens" | "outputTokens" | "location" | "agentId">>;

/** Promotion state update for a pending input message (RV-21). */
export type MessageSeqUpdates = {
  admittedSeq?: number;
  promotedSeq?: number;
};

export interface RunEventStore {
  append(event: RunEvent): Promise<void>;
  appendTransactional?(event: RunEvent, sessionUpdate?: { sessionId: string; updates: SessionUpdates }): Promise<void>;
  exists(eventId: string): Promise<boolean>;
  list(runId: string, afterSequence?: number): Promise<readonly RunEvent[]>;
  /** List all run IDs that have persisted events (for active-run discovery on restart). */
  listRunIds(): Promise<string[]>;
  getNextSequence(aggregateId: string): Promise<number>;
  /**
   * Atomically allocate the next sequence for the aggregate and append the event
   * in a single operation, then return the assigned sequence.
   *
   * Implementations that cannot do this atomically should fall back to
   * `getNextSequence() + append()` for the returned value.
   */
  appendWithSequence?(event: RunEvent): Promise<number>;
  saveSnapshot(runId: string, state: Record<string, unknown>): Promise<void>;
  getSnapshot(runId: string): Promise<RunEventSnapshot | null>;
  getSnapshotAfterSequence(runId: string, sequence: number): Promise<RunEventSnapshot | null>;
  subscribe(listener: RunEventListener): () => void;
}

/** Options for adding a message to a session. */
export interface AddMessageOptions {
  role: string;
  content: string;
  toolCallId?: string;
  tokens?: { input: number; output: number; reasoning?: number };
  model?: string;
  /** Provider that generated this message (attribution). */
  provider?: string;
  cost?: number;
  admittedSeq?: number;
}

export interface SessionStore {
  createSession(title?: string, parentSessionId?: string): Promise<Session>;
  forkSession(sourceSessionId: string, title?: string): Promise<Session>;
  getSession(id: string): Promise<Session | null>;
  listSessions(limit?: number, offset?: number): Promise<readonly Session[]>;
  updateSession(id: string, updates: SessionUpdates): Promise<void>;
  deleteSession(id: string): Promise<void>;

  /**
   * Add a message to a session.
   *
   * @example Options object (preferred)
   * ```typescript
   * await store.addMessage(sessionId, {
   *   role: "user",
   *   content: "Hello",
   * });
   * ```
   *
   * @example Legacy positional params (deprecated)
   * ```typescript
   * await store.addMessage(sessionId, "user", "Hello");
   * ```
   */
  addMessage(sessionId: string, message: AddMessageOptions): Promise<Message>;
  /** @deprecated Use options object form: `addMessage(sessionId, { role, content, ... })` */
  addMessage(sessionId: string, role: string, content: string, toolCallId?: string, tokens?: { input: number; output: number; reasoning?: number }, model?: string, cost?: number, admittedSeq?: number): Promise<Message>;

  /**
   * Update message-level fields (e.g. mark a pending input as promoted on drain).
   * Optional so minimal stores can skip input-segment tracking.
   */
  updateMessage(sessionId: string, messageId: string, updates: MessageSeqUpdates): Promise<void>;
  listMessages(sessionId: string, options?: { limit?: number; offset?: number; role?: string }): Promise<readonly Message[]>;
  searchMessages(query: string, options?: { sessionId?: string; limit?: number }): Promise<readonly Message[]>;
  getSessionStats(): Promise<SessionStats>;
}
