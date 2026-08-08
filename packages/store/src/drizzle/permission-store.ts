import { eq, and } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { PermissionRule, PermissionStore } from "@vinhnt-sdk/core";
import { PermissionRuleTable } from "./schema.js";
import { createDb, pushSchema } from "./migration.js";

export class DrizzlePermissionStore implements PermissionStore {
  private readonly db: BetterSQLite3Database;

  constructor(dbPath: string) {
    this.db = createDb(dbPath);
    pushSchema(this.db);
  }

  async addSavedRule(runId: string, action: string, resource: string): Promise<void> {
    const existing = this.db
      .select()
      .from(PermissionRuleTable)
      .where(
        and(
          eq(PermissionRuleTable.runId, runId),
          eq(PermissionRuleTable.action, action),
          eq(PermissionRuleTable.resource, resource),
        ),
      )
      .get();
    if (existing) return; // already exists

    this.db.insert(PermissionRuleTable).values({
      id: crypto.randomUUID(),
      runId,
      action,
      resource,
      effect: "allow",
    }).run();
  }

  async removeSavedRule(runId: string, action: string, resource: string): Promise<void> {
    this.db
      .delete(PermissionRuleTable)
      .where(
        and(
          eq(PermissionRuleTable.runId, runId),
          eq(PermissionRuleTable.action, action),
          eq(PermissionRuleTable.resource, resource),
        ),
      )
      .run();
  }

  async listSavedRules(runId: string): Promise<readonly PermissionRule[]> {
    const rows = this.db
      .select()
      .from(PermissionRuleTable)
      .where(eq(PermissionRuleTable.runId, runId))
      .all();

    return rows.map((r) => ({
      action: r.action,
      resource: r.resource,
      effect: r.effect as PermissionRule["effect"],
    }));
  }
}
