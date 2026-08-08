import { eq, sql, desc } from "drizzle-orm";
import type { Session, Message, SessionStats, SessionId, MessageId, ToolCallId, AgentId, WorkspaceId } from "@vinhnt-sdk/schema";
import type { SessionStore, SessionUpdates } from "@vinhnt-sdk/core";
import { PgSessionTable, PgMessageTable } from "./pg-schema.js";
import { PgStoreBase } from "./pg-base.js";

export class DrizzlePgSessionStore extends PgStoreBase implements SessionStore {

  async forkSession(sourceSessionId: string, title?: string): Promise<Session> {
    const source = await this.getSession(sourceSessionId);
    if (!source) throw new Error(`Source session not found: ${sourceSessionId}`);

    const id = crypto.randomUUID() as SessionId;
    const now = new Date().toISOString();
    await this.db.insert(PgSessionTable).values({
      id,
      title: title ?? `Fork of ${source.title}`,
      parentSessionId: sourceSessionId as SessionId,
      timeCreated: new Date(),
      timeUpdated: new Date(),
    });

    const messages = await this.listMessages(sourceSessionId);
    for (const msg of messages) {
      await this.db.insert(PgMessageTable).values({
        id: crypto.randomUUID() as MessageId,
        sessionId: id,
        role: msg.role,
        content: msg.content,
        createdAt: new Date(msg.createdAt),
        ...(msg.toolCallId ? { toolCallId: msg.toolCallId as ToolCallId } : {}),
        ...(msg.tokens ? {
          tokensInput: msg.tokens.input,
          tokensOutput: msg.tokens.output,
          ...(msg.tokens.reasoning !== undefined ? { tokensReasoning: msg.tokens.reasoning } : {}),
        } : {}),
        ...(msg.model ? { model: msg.model } : {}),
        ...(msg.cost !== undefined ? { cost: msg.cost } : {}),
      });
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
    await this.db.insert(PgSessionTable).values({
      id,
      title,
      ...(parentSessionId ? { parentSessionId: parentSessionId as SessionId } : {}),
      timeCreated: new Date(),
      timeUpdated: new Date(),
    });
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
    const rows = await this.db
      .select()
      .from(PgSessionTable)
      .where(eq(PgSessionTable.id, id as SessionId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return rowToSession(row);
  }

  async listSessions(limit = 50, offset = 0): Promise<readonly Session[]> {
    const rows = await this.db
      .select()
      .from(PgSessionTable)
      .orderBy(desc(PgSessionTable.timeUpdated))
      .limit(limit)
      .offset(offset);
    return rows.map(rowToSession);
  }

  async updateSession(id: string, updates: SessionUpdates): Promise<void> {
    const vals: Record<string, unknown> = {
      timeUpdated: new Date(),
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

  async addMessage(sessionId: string, role: string, content: string, toolCallId?: string, tokens?: { input: number; output: number; reasoning?: number }, model?: string, cost?: number): Promise<Message> {
    const id = crypto.randomUUID() as MessageId;
    const createdAt = new Date();
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
    await this.db.insert(PgMessageTable).values(vals as any);
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
    return rows.map(rowToMessage);
  }

  async searchMessages(query: string, limit = 20): Promise<readonly Message[]> {
    try {
      const sanitized = query.replace(/['"]/g, "").replace(/[^\w\s]/g, "");
      const terms = sanitized.split(/\s+/).filter(Boolean);
      if (terms.length === 0) return [];
      const tsquery = terms.map((t) => `${t}:*`).join(" & ");
      const result = await this.db.execute(
        sql`
          SELECT m.id, m.session_id AS sessionId, m.role, m.content, m.tool_call_id AS toolCallId,
                 m.tokens_input AS tokensInput, m.tokens_output AS tokensOutput, m.tokens_reasoning AS tokensReasoning,
                 m.model, m.cost, m.created_at AS createdAt
          FROM messages m
          WHERE to_tsvector('english', m.content) @@ to_tsquery('english', ${tsquery})
          ORDER BY ts_rank(to_tsvector('english', m.content), to_tsquery('english', ${tsquery})) DESC
          LIMIT ${limit}
        `,
      );
      return result.rows.map(rowToMessage);
    } catch {
      return [];
    }
  }

  async getSessionStats(): Promise<SessionStats> {
    const agg = (await this.db.execute(sql`
      SELECT
        COUNT(DISTINCT s.id) AS "totalSessions",
        (SELECT COUNT(*) FROM messages) AS "totalMessages",
        COALESCE(SUM(s.cost), 0) AS "totalCost",
        COALESCE(SUM(s.input_tokens), 0) AS "totalInputTokens",
        COALESCE(SUM(s.output_tokens), 0) AS "totalOutputTokens"
      FROM sessions s
    `)).rows[0] as { totalSessions: number; totalMessages: number; totalCost: number; totalInputTokens: number; totalOutputTokens: number } | undefined;

    const sessionsByDate = (await this.db.execute(sql`
      SELECT DATE(time_created) AS date, COUNT(*) AS count
      FROM sessions
      GROUP BY DATE(time_created)
      ORDER BY date ASC
    `)).rows as { date: string; count: number }[];

    const costByModel = (await this.db.execute(sql`
      SELECT COALESCE(model, 'unknown') AS model, COALESCE(SUM(cost), 0) AS cost
      FROM sessions
      WHERE cost IS NOT NULL AND cost > 0
      GROUP BY model
      ORDER BY cost DESC
    `)).rows as { model: string; cost: number }[];

    return {
      totalSessions: agg?.totalSessions ?? 0,
      totalMessages: agg?.totalMessages ?? 0,
      totalCost: agg?.totalCost ?? 0,
      totalInputTokens: agg?.totalInputTokens ?? 0,
      totalOutputTokens: agg?.totalOutputTokens ?? 0,
      sessionsByDate,
      costByModel,
    };
  }
}

function rowToSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as SessionId,
    title: row.title as string,
    createdAt: row.timeCreated instanceof Date ? row.timeCreated.toISOString() : new Date(row.timeCreated as string).toISOString(),
    updatedAt: row.timeUpdated instanceof Date ? row.timeUpdated.toISOString() : new Date(row.timeUpdated as string).toISOString(),
    ...(row.parentSessionId ? { parentSessionId: row.parentSessionId as SessionId } : {}),
    ...(row.agentId ? { agentId: row.agentId as AgentId } : {}),
    ...(row.model ? { model: row.model as string } : {}),
    ...(typeof row.cost === "number" ? { cost: row.cost as number } : {}),
    ...(typeof row.inputTokens === "number" ? { inputTokens: row.inputTokens as number } : {}),
    ...(typeof row.outputTokens === "number" ? { outputTokens: row.outputTokens as number } : {}),
    ...(row.locationDirectory
      ? { location: { directory: row.locationDirectory as string, ...(row.locationWorkspaceId ? { workspaceId: row.locationWorkspaceId as WorkspaceId } : {}) } }
      : {}),
    isActive: row.isActive === true || row.isActive === 1,
  };
}

function rowToMessage(row: Record<string, unknown>): Message {
  const ti = row.tokensInput as number | undefined;
  const to = row.tokensOutput as number | undefined;
  const tr = row.tokensReasoning as number | undefined;
  const tokens = typeof ti === "number" && typeof to === "number"
    ? { input: ti, output: to, ...(typeof tr === "number" ? { reasoning: tr } : {}) }
    : undefined;
  const createdAt = row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string);
  return {
    id: row.id as MessageId,
    sessionId: row.sessionId as SessionId,
    role: row.role as string,
    content: row.content as string,
    createdAt,
    ...(row.toolCallId ? { toolCallId: row.toolCallId as ToolCallId } : {}),
    ...(tokens ? { tokens } : {}),
    ...(row.model ? { model: row.model as string } : {}),
    ...(typeof row.cost === "number" ? { cost: row.cost as number } : {}),
  };
}
