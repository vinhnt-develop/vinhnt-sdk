import { eq, and } from "drizzle-orm";
import type { PermissionRule, PermissionStore } from "@vinhnt-sdk/core";
import { PgPermissionRuleTable } from "./pg-schema.js";
import { PgStoreBase } from "./pg-base.js";

export class DrizzlePgPermissionStore extends PgStoreBase implements PermissionStore {

  async addSavedRule(runId: string, action: string, resource: string): Promise<void> {
    const rows = await this.db
      .select()
      .from(PgPermissionRuleTable)
      .where(
        and(
          eq(PgPermissionRuleTable.runId, runId),
          eq(PgPermissionRuleTable.action, action),
          eq(PgPermissionRuleTable.resource, resource),
        ),
      )
      .limit(1);
    if (rows[0]) return;

    await this.db.insert(PgPermissionRuleTable).values({
      id: crypto.randomUUID(),
      runId,
      action,
      resource,
      effect: "allow",
      timeCreated: new Date(),
      timeUpdated: new Date(),
    });
  }

  async removeSavedRule(runId: string, action: string, resource: string): Promise<void> {
    await this.db
      .delete(PgPermissionRuleTable)
      .where(
        and(
          eq(PgPermissionRuleTable.runId, runId),
          eq(PgPermissionRuleTable.action, action),
          eq(PgPermissionRuleTable.resource, resource),
        ),
      );
  }

  async listSavedRules(runId: string): Promise<readonly PermissionRule[]> {
    const rows = await this.db
      .select()
      .from(PgPermissionRuleTable)
      .where(eq(PgPermissionRuleTable.runId, runId));

    return rows.map((r) => ({
      action: r.action,
      resource: r.resource,
      effect: r.effect as PermissionRule["effect"],
    }));
  }
}
