import { eq, sql } from "drizzle-orm";
import { PgShareTable } from "./pg-schema.js";
import { PgStoreBase } from "./pg-base.js";

export interface ShareRecord {
  id: string;
  sessionId: string;
  password?: string;
  createdAt: string;
  expiresAt: string;
}

export class DrizzlePgShareStore extends PgStoreBase {
  async create(record: ShareRecord): Promise<void> {
    await this.requireDb().insert(PgShareTable).values({
      id: record.id,
      sessionId: record.sessionId,
      password: record.password ?? null,
      createdAt: new Date(record.createdAt),
      expiresAt: new Date(record.expiresAt),
    });
  }

  async get(id: string): Promise<ShareRecord | null> {
    const rows = await this.requireDb().select().from(PgShareTable).where(eq(PgShareTable.id, id)).limit(1);
    if (rows.length === 0) return null;
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      sessionId: row.sessionId,
      password: row.password ?? undefined,
      createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
      expiresAt: typeof row.expiresAt === "string" ? row.expiresAt : row.expiresAt.toISOString(),
    };
  }

  async delete(id: string): Promise<void> {
    await this.requireDb().delete(PgShareTable).where(eq(PgShareTable.id, id));
  }

  async deleteExpired(): Promise<number> {
    const result = await this.requireDb().delete(PgShareTable)
      .where(sql`expires_at < NOW()`)
      .returning({ id: PgShareTable.id });
    return result.length;
  }
}
