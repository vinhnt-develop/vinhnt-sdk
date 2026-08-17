import type { RunEvent, Session, Message, SessionStats, SessionId, MessageId } from "@vinhnt-sdk/schema";
import type { RunEventStore, RunEventSnapshot, SessionStore, SessionUpdates } from "./store.js";

const nullSessionId = "null-session" as SessionId;
const nullForkSessionId = "null-session-fork" as SessionId;
const nullMessageId = "null-message" as MessageId;

/** No-op {@link RunEventStore} used for testing. */
export class NullRunEventStore implements RunEventStore {
  private listeners = new Set<(event: RunEvent) => void>();
  private events: RunEvent[] = [];

  async append(event: RunEvent): Promise<void> {
    if (event.persist === false) return;
    this.events.push(event);
    for (const listener of this.listeners) listener(event);
  }

  async appendWithSequence(event: RunEvent): Promise<number> {
    if (event.persist === false) return 0;
    const seq = await this.getNextSequence(event.runId);
    await this.append({ ...event, sequence: seq } as RunEvent);
    return seq;
  }

  async list(_runId: string, _afterSequence?: number): Promise<readonly RunEvent[]> {
    return [];
  }

  async saveSnapshot(_runId: string, _state: Record<string, unknown>): Promise<void> {}

  async getSnapshot(_runId: string): Promise<RunEventSnapshot | null> {
    return null;
  }

  async getSnapshotAfterSequence(_runId: string, _sequence: number): Promise<RunEventSnapshot | null> {
    return null;
  }

  async getNextSequence(_aggregateId: string): Promise<number> {
    return 1;
  }

  subscribe(listener: (event: RunEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** No-op {@link SessionStore} used for testing. */
export class NullSessionStore implements SessionStore {
  async createSession(_title?: string, _parentSessionId?: string): Promise<Session> {
    return {
      id: nullSessionId,
      title: _title ?? "New Session",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };
  }

  async forkSession(_sourceSessionId: string, _title?: string): Promise<Session> {
    return {
      id: nullForkSessionId,
      title: _title ?? "New Session",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };
  }

  async getSession(_id: string): Promise<Session | null> {
    return null;
  }

  async listSessions(_limit?: number, _offset?: number): Promise<readonly Session[]> {
    return [];
  }

  async updateSession(_id: string, _updates: SessionUpdates): Promise<void> {}

  async deleteSession(_id: string): Promise<void> {}

  async addMessage(_sessionId: string, _role: string, _content: string, _toolCallId?: string, _tokens?: { input: number; output: number; reasoning?: number }, _model?: string, _cost?: number): Promise<Message> {
    return {
      id: nullMessageId,
      sessionId: _sessionId as SessionId,
      role: _role as Message["role"],
      content: _content,
      createdAt: new Date().toISOString(),
    };
  }

  async listMessages(_sessionId: string): Promise<readonly Message[]> {
    return [];
  }

  async searchMessages(_query: string, _limit?: number): Promise<readonly Message[]> {
    return [];
  }

  async getSessionStats(): Promise<SessionStats> {
    return { totalSessions: 0, totalMessages: 0, totalCost: 0, totalInputTokens: 0, totalOutputTokens: 0, sessionsByDate: [], costByModel: [] };
  }
}
