import type { RunEvent, Session, Message, SessionStats } from "@vinhnt-sdk/schema";

export interface RunEventSnapshot {
  readonly runId: string;
  readonly sequence: number;
  readonly state: Record<string, unknown>;
  readonly occurredAt: string;
}

export type RunEventListener = (event: RunEvent) => void;

export type SessionUpdates = Partial<Pick<Session, "title" | "isActive" | "model" | "cost" | "inputTokens" | "outputTokens" | "location" | "agentId">>;

export interface RunEventStore {
  append(event: RunEvent): Promise<void>;
  appendTransactional?(event: RunEvent, sessionUpdate?: { sessionId: string; updates: SessionUpdates }): Promise<void>;
  exists?(eventId: string): Promise<boolean>;
  list(runId: string, afterSequence?: number): Promise<readonly RunEvent[]>;
  getNextSequence(aggregateId: string): Promise<number>;
  saveSnapshot(runId: string, state: Record<string, unknown>): Promise<void>;
  getSnapshot(runId: string): Promise<RunEventSnapshot | null>;
  getSnapshotAfterSequence(runId: string, sequence: number): Promise<RunEventSnapshot | null>;
  subscribe(listener: RunEventListener): () => void;
}

export interface SessionStore {
  createSession(title?: string, parentSessionId?: string): Promise<Session>;
  forkSession(sourceSessionId: string, title?: string): Promise<Session>;
  getSession(id: string): Promise<Session | null>;
  listSessions(limit?: number, offset?: number): Promise<readonly Session[]>;
  updateSession(id: string, updates: SessionUpdates): Promise<void>;
  deleteSession(id: string): Promise<void>;
  addMessage(sessionId: string, role: string, content: string, toolCallId?: string, tokens?: { input: number; output: number; reasoning?: number }, model?: string, cost?: number): Promise<Message>;
  listMessages(sessionId: string): Promise<readonly Message[]>;
  searchMessages(query: string, limit?: number): Promise<readonly Message[]>;
  getSessionStats(): Promise<SessionStats>;
}
