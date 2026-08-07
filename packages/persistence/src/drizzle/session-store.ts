import { eq, sql, desc } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { Session, Message, SessionStats, SessionId, MessageId, ToolCallId, AgentId, WorkspaceId } from "@vinhnt-sdk/schema";
import type { SessionStore, SessionUpdates } from "@vinhnt-sdk/agent-core";
import { SessionTable, MessageTable } from "./schema.js";
import { createDb, pushSchema } from "./migration.js";

export class DrizzleSessionStore implements SessionStore {
  private readonly db: BetterSQLite3Database;

  constructor(dbPath: string) {
    this.db = createDb(dbPath);
    pushSchema(this.db);
    this.ensureFts();
  }

  private ensureFts(): void {
    try {
      this.db.run(sql`
        CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
          content, role UNINDEXED, session_id UNINDEXED,
          content='messages', content_rowid='rowid',
          tokenize='unicode61'
        );
      `);
    } catch {
      // FTS5 may not be available in all SQLite builds
    }
  }

  async forkSession(sourceSessionId: string, title?: string): Promise<Session> {
    const source = await this.getSession(sourceSessionId);
    if (!source) throw new Error(`Source session not found: ${sourceSessionId}`);

    const id = crypto.randomUUID() as SessionId;
    const now = new Date().toISOString();
    this.db.insert(SessionTable).values({
      id,
      title: title ?? `Fork of ${source.title}`,
      parentSessionId: sourceSessionId as SessionId,
    }).run();

    const messages = await this.listMessages(sourceSessionId);
    for (const msg of messages) {
      const vals: Record<string, unknown> = {
        id: crypto.randomUUID() as MessageId,
        sessionId: id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      };
      if (msg.toolCallId) vals.toolCallId = msg.toolCallId;
      if (msg.tokens) {
        vals.tokensInput = msg.tokens.input;
        vals.tokensOutput = msg.tokens.output;
        if (msg.tokens.reasoning !== undefined) vals.tokensReasoning = msg.tokens.reasoning;
      }
      if (msg.model) vals.model = msg.model;
      if (msg.cost !== undefined) vals.cost = msg.cost;
      this.db.insert(MessageTable).values(vals as any).run();
    }

    return {
      id,
      title: title ?? `Fork of ${source.title}`,
      createdAt: now,
      updatedAt: now,
      parentSessionId: sourceSessionId as SessionId,
      isActive: true,
    };
  }

  async createSession(title = "New Session", parentSessionId?: string): Promise<Session> {
    const id = crypto.randomUUID() as SessionId;
    this.db.insert(SessionTable).values({
      id,
      title,
      ...(parentSessionId ? { parentSessionId: parentSessionId as SessionId } : {}),
    }).run();
    return {
      id,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(parentSessionId ? { parentSessionId: parentSessionId as SessionId } : {}),
      isActive: true,
    };
  }

  async getSession(id: string): Promise<Session | null> {
    const row = this.db
      .select()
      .from(SessionTable)
      .where(eq(SessionTable.id, id as SessionId))
      .get();
    if (!row) return null;
    return rowToSession(row);
  }

  async listSessions(limit = 50, offset = 0): Promise<readonly Session[]> {
    const rows = this.db
      .select()
      .from(SessionTable)
      .orderBy(desc(SessionTable.time_updated))
      .limit(limit)
      .offset(offset)
      .all();
    return rows.map(rowToSession);
  }

  async updateSession(id: string, updates: SessionUpdates): Promise<void> {
    const vals: Record<string, unknown> = {
      time_updated: Date.now(),
    };
    if (updates.title !== undefined) vals.title = updates.title;
    if (updates.isActive !== undefined) vals.isActive = updates.isActive ? 1 : 0;
    if (updates.model !== undefined) vals.model = updates.model;
    if (updates.cost !== undefined) vals.cost = updates.cost;
    if (updates.inputTokens !== undefined) vals.inputTokens = updates.inputTokens;
    if (updates.outputTokens !== undefined) vals.outputTokens = updates.outputTokens;
    if (updates.agentId !== undefined) vals.agentId = updates.agentId;
    if (updates.location !== undefined) {
      vals.locationDirectory = updates.location.directory;
      if (updates.location.workspaceId !== undefined) {
        vals.locationWorkspaceId = updates.location.workspaceId as string;
      }
    }
    this.db
      .update(SessionTable)
      .set(vals)
      .where(eq(SessionTable.id, id as SessionId))
      .run();
  }

  async deleteSession(id: string): Promise<void> {
    this.db
      .delete(SessionTable)
      .where(eq(SessionTable.id, id as SessionId))
      .run();
  }

  async addMessage(sessionId: string, role: string, content: string, toolCallId?: string, tokens?: { input: number; output: number; reasoning?: number }, model?: string, cost?: number): Promise<Message> {
    const id = crypto.randomUUID() as MessageId;
    const createdAt = new Date().toISOString();
    const vals: Record<string, unknown> = {
      id,
      sessionId: sessionId as SessionId,
      role,
      content,
      createdAt,
    };
    if (toolCallId) vals.toolCallId = toolCallId as ToolCallId;
    if (tokens) {
      vals.tokensInput = tokens.input;
      vals.tokensOutput = tokens.output;
      if (tokens.reasoning !== undefined) vals.tokensReasoning = tokens.reasoning;
    }
    if (model) vals.model = model;
    if (cost !== undefined) vals.cost = cost;
    this.db.insert(MessageTable).values(vals as any).run();
    try {
      this.db.run(sql`
        INSERT INTO messages_fts (rowid, content, role, session_id)
        VALUES (last_insert_rowid(), ${content}, ${role}, ${sessionId})
      `);
    } catch {
      // FTS may not be available
    }
    await this.updateSession(sessionId, {});
    return {
      id, sessionId: sessionId as SessionId, role, content, createdAt,
      ...(toolCallId ? { toolCallId: toolCallId as ToolCallId } : {}),
      ...(tokens ? { tokens } : {}),
      ...(model ? { model } : {}),
      ...(cost !== undefined ? { cost } : {}),
    };
  }

  async listMessages(sessionId: string): Promise<readonly Message[]> {
    const rows = this.db
      .select()
      .from(MessageTable)
      .where(eq(MessageTable.sessionId, sessionId as SessionId))
      .orderBy(MessageTable.createdAt)
      .all();
    return rows.map(rowToMessage);
  }

  async searchMessages(query: string, limit = 20): Promise<readonly Message[]> {
    try {
      const sanitized = query.replace(/['"]/g, "");
      const terms = sanitized.split(/\s+/).filter(Boolean).map((t) => `"${t}"`).join(" OR ");
      if (!terms) return [];
      const rows = this.db.all<Record<string, unknown>>(
        sql`
          SELECT m.id, m.session_id AS sessionId, m.role, m.content, m.tool_call_id AS toolCallId,
                 m.tokens_input AS tokensInput, m.tokens_output AS tokensOutput, m.tokens_reasoning AS tokensReasoning,
                 m.model, m.cost, m.created_at AS createdAt
          FROM messages m
          JOIN messages_fts f ON m.rowid = f.rowid
          WHERE messages_fts MATCH ${terms}
          ORDER BY rank
          LIMIT ${limit}
        `,
      );
      return rows.map(rowToMessage);
    } catch {
      return [];
    }
  }

  async getSessionStats(): Promise<SessionStats> {
    const agg = this.db.get<{
      totalSessions: number;
      totalMessages: number;
      totalCost: number;
      totalInputTokens: number;
      totalOutputTokens: number;
    }>(sql`
      SELECT
        COUNT(DISTINCT s.id) AS totalSessions,
        (SELECT COUNT(*) FROM messages) AS totalMessages,
        COALESCE(SUM(s.cost), 0) AS totalCost,
        COALESCE(SUM(s.input_tokens), 0) AS totalInputTokens,
        COALESCE(SUM(s.output_tokens), 0) AS totalOutputTokens
      FROM sessions s
    `) ?? { totalSessions: 0, totalMessages: 0, totalCost: 0, totalInputTokens: 0, totalOutputTokens: 0 };

    const sessionsByDate = this.db.all<{ date: string; count: number }>(sql`
      SELECT DATE(time_created / 1000, 'unixepoch') AS date, COUNT(*) AS count
      FROM sessions
      GROUP BY date
      ORDER BY date ASC
    `);

    const costByModel = this.db.all<{ model: string; cost: number }>(sql`
      SELECT COALESCE(model, 'unknown') AS model, COALESCE(SUM(cost), 0) AS cost
      FROM sessions
      WHERE cost IS NOT NULL AND cost > 0
      GROUP BY model
      ORDER BY cost DESC
    `);

    return {
      totalSessions: agg.totalSessions ?? 0,
      totalMessages: agg.totalMessages ?? 0,
      totalCost: agg.totalCost ?? 0,
      totalInputTokens: agg.totalInputTokens ?? 0,
      totalOutputTokens: agg.totalOutputTokens ?? 0,
      sessionsByDate,
      costByModel,
    };
  }
}

function rowToSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as SessionId,
    title: row.title as string,
    createdAt: new Date((row as { time_created: number }).time_created).toISOString(),
    updatedAt: new Date((row as { time_updated: number }).time_updated).toISOString(),
    ...(row.parentSessionId ? { parentSessionId: row.parentSessionId as SessionId } : {}),
    ...(row.agentId ? { agentId: row.agentId as AgentId } : {}),
    ...(row.model ? { model: row.model as string } : {}),
    ...(typeof row.cost === "number" ? { cost: row.cost as number } : {}),
    ...(typeof row.inputTokens === "number" ? { inputTokens: row.inputTokens as number } : {}),
    ...(typeof row.outputTokens === "number" ? { outputTokens: row.outputTokens as number } : {}),
    ...(row.locationDirectory
      ? { location: { directory: row.locationDirectory as string, ...(row.locationWorkspaceId ? { workspaceId: row.locationWorkspaceId as WorkspaceId } : {}) } }
      : {}),
    isActive: (row.isActive as number) === 1,
  };
}

function rowToMessage(row: Record<string, unknown>): Message {
  const ti = row.tokensInput as number | undefined;
  const to = row.tokensOutput as number | undefined;
  const tr = row.tokensReasoning as number | undefined;
  const tokens = typeof ti === "number" && typeof to === "number"
    ? { input: ti, output: to, ...(typeof tr === "number" ? { reasoning: tr } : {}) }
    : undefined;
  return {
    id: row.id as MessageId,
    sessionId: row.sessionId as SessionId,
    role: row.role as string,
    content: row.content as string,
    createdAt: row.createdAt as string,
    ...(row.toolCallId ? { toolCallId: row.toolCallId as ToolCallId } : {}),
    ...(tokens ? { tokens } : {}),
    ...(row.model ? { model: row.model as string } : {}),
    ...(typeof row.cost === "number" ? { cost: row.cost as number } : {}),
  };
}
