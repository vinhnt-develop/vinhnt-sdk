import type { SavedApproval } from "@vinhnt-sdk/schema";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { SavedApprovalTable } from "./schema.js";

export class DrizzleSavedApprovalStore {
  constructor(private readonly db: BetterSQLite3Database) {}

  async loadAll(): Promise<SavedApproval[]> {
    const rows = this.db
      .select()
      .from(SavedApprovalTable)
      .where(eq(SavedApprovalTable.denied, 0))
      .all();
    return rows.map((row) => ({
      resource: row.resource,
      action: row.action,
      agentId: row.agentId ?? undefined,
    }));
  }

  async loadAllRejections(): Promise<SavedApproval[]> {
    const rows = this.db
      .select()
      .from(SavedApprovalTable)
      .where(eq(SavedApprovalTable.denied, 1))
      .all();
    return rows.map((row) => ({
      resource: row.resource,
      action: row.action,
      agentId: row.agentId ?? undefined,
    }));
  }

  async saveApproval(approval: SavedApproval): Promise<void> {
    const id = `${approval.resource}:${approval.action}`;
    await this.db
      .insert(SavedApprovalTable)
      .values({
        id,
        resource: approval.resource,
        action: approval.action,
        agentId: approval.agentId ?? null,
        denied: 0,
        time_created: Date.now(),
        time_updated: Date.now(),
      })
      .onConflictDoUpdate({
        target: SavedApprovalTable.id,
        set: { denied: 0, time_updated: Date.now() },
      });
  }

  async saveRejection(resource: string, action: string, agentId?: string): Promise<void> {
    const id = `${resource}:${action}`;
    await this.db
      .insert(SavedApprovalTable)
      .values({
        id,
        resource,
        action,
        agentId: agentId ?? null,
        denied: 1,
        time_created: Date.now(),
        time_updated: Date.now(),
      })
      .onConflictDoUpdate({
        target: SavedApprovalTable.id,
        set: { denied: 1, time_updated: Date.now() },
      });
  }

  async removeApproval(resource: string, action: string): Promise<void> {
    const id = `${resource}:${action}`;
    await this.db
      .delete(SavedApprovalTable)
      .where(eq(SavedApprovalTable.id, id));
  }
}
