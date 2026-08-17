import type {
  Session,
  Message,
  SessionStats,
  SessionId,
  MessageId,
  SessionStore,
  SessionUpdates,
} from "@vinhnt-sdk/schema";

/**
 * In-memory implementation of {@link SessionStore}.
 *
 * Forking deep-copies the source session's messages with fresh message ids.
 * `searchMessages` does a case-insensitive substring match over message content.
 */
export class InMemorySessionStore implements SessionStore {
  private sessions = new Map<SessionId, Session>();
  private messages = new Map<SessionId, Message[]>();

  async createSession(title = "New Session", parentSessionId?: string): Promise<Session> {
    const id = crypto.randomUUID() as SessionId;
    const now = new Date().toISOString();
    const session: Session = {
      id,
      title,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      ...(parentSessionId ? { parentSessionId: parentSessionId as SessionId } : {}),
    };
    this.sessions.set(id, session);
    return session;
  }

  async forkSession(sourceSessionId: string, title?: string): Promise<Session> {
    const source = await this.getSession(sourceSessionId);
    if (!source) throw new Error(`Source session not found: ${sourceSessionId}`);

    const id = crypto.randomUUID() as SessionId;
    const now = new Date().toISOString();
    const session: Session = {
      id,
      title: title ?? `Fork of ${source.title}`,
      createdAt: now,
      updatedAt: now,
      parentSessionId: sourceSessionId as SessionId,
      isActive: true,
    };
    this.sessions.set(id, session);

    const sourceMessages = this.messages.get(sourceSessionId as SessionId) ?? [];
    const forked = sourceMessages.map((msg) => ({
      ...msg,
      id: crypto.randomUUID() as MessageId,
      sessionId: id,
    }));
    this.messages.set(id, forked);

    return session;
  }

  async getSession(id: string): Promise<Session | null> {
    return this.sessions.get(id as SessionId) ?? null;
  }

  async listSessions(limit = 50, offset = 0): Promise<readonly Session[]> {
    return [...this.sessions.values()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))
      .slice(offset, offset + limit);
  }

  async updateSession(id: string, updates: SessionUpdates): Promise<void> {
    const session = this.sessions.get(id as SessionId);
    if (!session) return;
    this.sessions.set(id as SessionId, {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id as SessionId);
    this.messages.delete(id as SessionId);
  }

  async addMessage(
    sessionId: string,
    role: string,
    content: string,
    toolCallId?: string,
    tokens?: { input: number; output: number; reasoning?: number },
    model?: string,
    cost?: number,
  ): Promise<Message> {
    const session = this.sessions.get(sessionId as SessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const message: Message = {
      id: crypto.randomUUID() as MessageId,
      sessionId: sessionId as SessionId,
      role,
      content,
      createdAt: new Date().toISOString(),
      ...(toolCallId ? { toolCallId: toolCallId as Message["toolCallId"] } : {}),
      ...(tokens ? { tokens } : {}),
      ...(model ? { model } : {}),
      ...(cost !== undefined ? { cost } : {}),
    };
    const list = this.messages.get(sessionId as SessionId) ?? [];
    list.push(message);
    this.messages.set(sessionId as SessionId, list);
    await this.updateSession(sessionId, {});
    return message;
  }

  async listMessages(sessionId: string): Promise<readonly Message[]> {
    return this.messages.get(sessionId as SessionId) ?? [];
  }

  async searchMessages(query: string, limit = 20): Promise<readonly Message[]> {
    const needle = query.toLowerCase();
    const matches: Message[] = [];
    for (const list of this.messages.values()) {
      for (const msg of list) {
        if (msg.content.toLowerCase().includes(needle)) {
          matches.push(msg);
        }
      }
    }
    return matches
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async getSessionStats(): Promise<SessionStats> {
    const allSessions = [...this.sessions.values()];
    const allMessages = [...this.messages.values()].flat();

    const byDate = new Map<string, number>();
    for (const s of allSessions) {
      const date = s.createdAt.slice(0, 10);
      byDate.set(date, (byDate.get(date) ?? 0) + 1);
    }

    const byModel = new Map<string, number>();
    for (const s of allSessions) {
      if (s.cost === undefined || s.cost <= 0) continue;
      const model = s.model ?? "unknown";
      byModel.set(model, (byModel.get(model) ?? 0) + s.cost);
    }

    return {
      totalSessions: allSessions.length,
      totalMessages: allMessages.length,
      totalCost: allSessions.reduce((sum, s) => sum + (s.cost ?? 0), 0),
      totalInputTokens: allSessions.reduce((sum, s) => sum + (s.inputTokens ?? 0), 0),
      totalOutputTokens: allSessions.reduce((sum, s) => sum + (s.outputTokens ?? 0), 0),
      sessionsByDate: [...byDate.entries()]
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      costByModel: [...byModel.entries()]
        .map(([model, cost]) => ({ model, cost }))
        .sort((a, b) => b.cost - a.cost),
    };
  }
}
