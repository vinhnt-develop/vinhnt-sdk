import { eq, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { ShareTable } from "./schema.js";
import { createDb, pushSchema } from "./migration.js";

export interface ShareRecord {
  id: string;
  sessionId: string;
  password?: string;
  createdAt: string;
  expiresAt: string;
}

export class DrizzleShareStore {
  private readonly db: BetterSQLite3Database;

  constructor(dbPath: string) {
    this.db = createDb(dbPath);
    pushSchema(this.db);
  }

  async create(record: ShareRecord): Promise<void> {
    this.db.insert(ShareTable).values(record).run();
  }

  async get(id: string): Promise<ShareRecord | null> {
    const row = this.db.select().from(ShareTable).where(eq(ShareTable.id, id)).get() as {
      id: string;
      sessionId: string;
      password: string | null;
      createdAt: string;
      expiresAt: string;
    } | undefined;
    if (!row) return null;
    return {
      id: row.id,
      sessionId: row.sessionId,
      password: row.password ?? undefined,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    };
  }

  async delete(id: string): Promise<void> {
    this.db.delete(ShareTable).where(eq(ShareTable.id, id)).run();
  }

  async deleteExpired(): Promise<number> {
    const result = this.db.delete(ShareTable)
      .where(sql`expires_at < ${new Date().toISOString()}`)
      .run();
    return result.changes;
  }
}
