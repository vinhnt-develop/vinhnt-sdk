import { eq, desc, sql, asc } from "drizzle-orm";
import type { Session, Message, SessionStats, SessionId, MessageId, AgentId, WorkspaceId, ToolCallId } from "@vinhnt-sdk/schema";
import type { SessionStore, SessionUpdates } from "@vinhnt-sdk/schema";
import { PgSessionTable, PgMessageTable } from "./schema.js";
import type { PgDb } from "./migration.js";

/**
 * PostgreSQL-backed {@link SessionStore} via Drizzle ORM.
 *
 * Message search uses a case-insensitive `ILIKE` scan over message content.
 * Expects the schema to be created via {@link pushPgSchema} beforehand.
 */
/** Postgres-backed {@link SessionStore}. */
export class DrizzlePgSessionStore implements SessionStore {
  private readonly db: PgDb;

  constructor(db: PgDb) {
    this.db = db;
  }

  async createSession(title = "New Session", parentSessionId?: string): Promise<Session> {
    const id = crypto.randomUUID() as SessionId;
    const now = new Date();
    await this.db.insert(PgSessionTable).values({
      id,
      title,
      createdAt: now,
      updatedAt: now,
      ...(parentSessionId ? { parentSessionId: parentSessionId as SessionId } : {}),
    });
    return sessionFromRow({
      id,
      title,
      createdAt: now,
      updatedAt: now,
      parentSessionId,
      isActive: true,
    });
  }

  async forkSession(sourceSessionId: string, title?: string): Promise<Session> {
    const source = await this.getSession(sourceSessionId);
    if (!source) throw new Error(`Source session not found: ${sourceSessionId}`);

    const id = crypto.randomUUID() as SessionId;
    const now = new Date();
    const forkTitle = title ?? `Fork of ${source.title}`;
    await this.db.insert(PgSessionTable).values({
      id,
      title: forkTitle,
      parentSessionId: sourceSessionId as SessionId,
      createdAt: now,
      updatedAt: now,
    });

    const messages = await this.listMessages(sourceSessionId);
    for (const msg of messages) {
      await this.db.insert(PgMessageTable).values({
        id: crypto.randomUUID() as MessageId,
        sessionId: id,
        role: msg.role,
        content: msg.content,
        createdAt: new Date(msg.createdAt),
        ...(msg.toolCallId ? { toolCallId: msg.toolCallId } : {}),
        ...(msg.tokens ? { tokensInput: msg.tokens.input, tokensOutput: msg.tokens.output, tokensReasoning: msg.tokens.reasoning } : {}),
        ...(msg.model ? { model: msg.model } : {}),
        ...(msg.cost !== undefined ? { cost: msg.cost } : {}),
      });
    }

    return {
      id,
      title: forkTitle,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      parentSessionId: sourceSessionId as SessionId,
      isActive: true,
    };
  }

  async getSession(id: string): Promise<Session | null> {
    const rows = await this.db
      .select()
      .from(PgSessionTable)
      .where(eq(PgSessionTable.id, id as SessionId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return sessionFromRow(row);
  }

  async listSessions(limit = 50, offset = 0): Promise<readonly Session[]> {
    const rows = await this.db
      .select()
      .from(PgSessionTable)
      .orderBy(desc(PgSessionTable.updatedAt), asc(PgSessionTable.id))
      .limit(limit)
      .offset(offset);
    return rows.map(sessionFromRow);
  }

  async updateSession(id: string, updates: SessionUpdates): Promise<void> {
    const vals: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (updates.title !== undefined) vals.title = updates.title;
    if (updates.isActive !== undefined) vals.isActive = updates.isActive;
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
    await this.db
      .update(PgSessionTable)
      .set(vals)
      .where(eq(PgSessionTable.id, id as SessionId));
  }

  async deleteSession(id: string): Promise<void> {
    await this.db
      .delete(PgSessionTable)
      .where(eq(PgSessionTable.id, id as SessionId));
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
    const id = crypto.randomUUID() as MessageId;
    const createdAt = new Date();
    await this.db.insert(PgMessageTable).values({
      id,
      sessionId: sessionId as SessionId,
      role,
      content,
      createdAt,
      ...(toolCallId ? { toolCallId: toolCallId as ToolCallId } : {}),
      ...(tokens ? { tokensInput: tokens.input, tokensOutput: tokens.output, tokensReasoning: tokens.reasoning } : {}),
      ...(model ? { model } : {}),
      ...(cost !== undefined ? { cost } : {}),
    });
    await this.updateSession(sessionId, {});
    return {
      id, sessionId: sessionId as SessionId, role, content, createdAt: createdAt.toISOString(),
      ...(toolCallId ? { toolCallId: toolCallId as ToolCallId } : {}),
      ...(tokens ? { tokens } : {}),
      ...(model ? { model } : {}),
      ...(cost !== undefined ? { cost } : {}),
    };
  }

  async listMessages(sessionId: string): Promise<readonly Message[]> {
    const rows = await this.db
      .select()
      .from(PgMessageTable)
      .where(eq(PgMessageTable.sessionId, sessionId as SessionId))
      .orderBy(PgMessageTable.createdAt);
    return rows.map(messageFromRow);
  }

  async searchMessages(query: string, limit = 20): Promise<readonly Message[]> {
    const rows = await this.db
      .select()
      .from(PgMessageTable)
      .where(sql`content ILIKE ${`%${query.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`}`)
      .orderBy(PgMessageTable.createdAt)
      .limit(limit);
    return rows.map(messageFromRow);
  }

  async getSessionStats(): Promise<SessionStats> {
    const agg = await this.db.execute(sql`
      SELECT
        COUNT(DISTINCT s.id) AS total_sessions,
        (SELECT COUNT(*) FROM messages) AS total_messages,
        COALESCE(SUM(s.cost), 0) AS total_cost,
        COALESCE(SUM(s.input_tokens), 0) AS total_input_tokens,
        COALESCE(SUM(s.output_tokens), 0) AS total_output_tokens
      FROM sessions s
    `);
    const a = agg.rows[0] as Record<string, unknown> | undefined;

    const byDate = await this.db.execute(sql`
      SELECT DATE(s.created_at) AS date, COUNT(*) AS count
      FROM sessions s
      GROUP BY date
      ORDER BY date ASC
    `);

    const byModel = await this.db.execute(sql`
      SELECT COALESCE(s.model, 'unknown') AS model, COALESCE(SUM(s.cost), 0) AS cost
      FROM sessions s
      WHERE s.cost IS NOT NULL AND s.cost > 0
      GROUP BY model
      ORDER BY cost DESC
    `);

    return {
      totalSessions: Number(a?.total_sessions ?? 0),
      totalMessages: Number(a?.total_messages ?? 0),
      totalCost: Number(a?.total_cost ?? 0),
      totalInputTokens: Number(a?.total_input_tokens ?? 0),
      totalOutputTokens: Number(a?.total_output_tokens ?? 0),
      sessionsByDate: byDate.rows.map((r) => {
        const row = r as Record<string, unknown>;
        return { date: String(row.date), count: Number(row.count) };
      }),
      costByModel: byModel.rows.map((r) => {
        const row = r as Record<string, unknown>;
        return { model: String(row.model), cost: Number(row.cost) };
      }),
    };
  }
}

function sessionFromRow(row: Record<string, unknown>): Session {
  return {
    id: row.id as SessionId,
    title: row.title as string,
    createdAt: toIso(row.createdAt as Date | string),
    updatedAt: toIso(row.updatedAt as Date | string),
    ...(row.parentSessionId ? { parentSessionId: row.parentSessionId as SessionId } : {}),
    ...(row.agentId ? { agentId: row.agentId as AgentId } : {}),
    ...(row.model ? { model: row.model as string } : {}),
    ...(typeof row.cost === "number" ? { cost: row.cost } : {}),
    ...(typeof row.inputTokens === "number" ? { inputTokens: row.inputTokens } : {}),
    ...(typeof row.outputTokens === "number" ? { outputTokens: row.outputTokens } : {}),
    ...(row.locationDirectory
      ? { location: { directory: row.locationDirectory as string, ...(row.locationWorkspaceId ? { workspaceId: row.locationWorkspaceId as WorkspaceId } : {}) } }
      : {}),
    isActive: Boolean(row.isActive),
  };
}

function messageFromRow(row: Record<string, unknown>): Message {
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
    createdAt: toIso(row.createdAt as Date | string),
    ...(row.toolCallId ? { toolCallId: row.toolCallId as ToolCallId } : {}),
    ...(tokens ? { tokens } : {}),
    ...(row.model ? { model: row.model as string } : {}),
    ...(typeof row.cost === "number" ? { cost: row.cost } : {}),
  };
}

function toIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}