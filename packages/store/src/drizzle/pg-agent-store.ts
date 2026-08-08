import { eq } from "drizzle-orm";
import type { AgentId, AgentConfig } from "@vinhnt-sdk/schema";
import type { AgentRegistry } from "@vinhnt-sdk/core";
import { PgAgentTable } from "./pg-schema.js";
import { PgStoreBase } from "./pg-base.js";

export class DrizzlePgAgentStore extends PgStoreBase implements AgentRegistry {

  async register(config: AgentConfig, parentId?: AgentId): Promise<void> {
    const vals: Record<string, unknown> = {
      id: config.id,
      mode: config.permissions?.mode ?? "all",
      profile: config.profile,
      capabilities: config.capabilities,
      timeCreated: new Date(),
      timeUpdated: new Date(),
    };
    if (config.permissions) vals.permissions = config.permissions;
    if (config.systemPrompt !== undefined) vals.systemPrompt = config.systemPrompt;
    if (config.temperature !== undefined) vals.temperature = config.temperature;
    if (parentId) vals.parentId = parentId;
    await this.db.insert(PgAgentTable).values(vals as any);
  }

  async get(id: AgentId): Promise<AgentConfig | null> {
    const rows = await this.db
      .select()
      .from(PgAgentTable)
      .where(eq(PgAgentTable.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return rowToConfig(row);
  }

  async list(): Promise<readonly AgentConfig[]> {
    const rows = await this.db
      .select()
      .from(PgAgentTable);
    return rows.map(rowToConfig);
  }

  async findByCapability(key: string, value: unknown): Promise<readonly AgentConfig[]> {
    const rows = await this.db
      .select()
      .from(PgAgentTable);
    return rows
      .filter((row) => {
        const caps = row.capabilities as Record<string, unknown>;
        return caps[key] !== undefined && caps[key] === value;
      })
      .map(rowToConfig);
  }

  async unregister(id: AgentId): Promise<void> {
    await this.db
      .delete(PgAgentTable)
      .where(eq(PgAgentTable.id, id));
  }

  async update(id: AgentId, patch: Partial<AgentConfig>): Promise<AgentConfig | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const merged: AgentConfig = { ...existing, ...patch, id };
    const vals: Record<string, unknown> = {
      mode: merged.permissions?.mode ?? existing.permissions?.mode ?? "all",
      profile: merged.profile,
      capabilities: merged.capabilities,
      timeUpdated: new Date(),
    };
    if (merged.permissions) vals.permissions = merged.permissions;
    if (merged.systemPrompt !== undefined) vals.systemPrompt = merged.systemPrompt;
    if (merged.temperature !== undefined) vals.temperature = merged.temperature;
    await this.db
      .update(PgAgentTable)
      .set(vals as any)
      .where(eq(PgAgentTable.id, id));
    return merged;
  }

  async getChildren(parentId: AgentId): Promise<readonly AgentConfig[]> {
    const rows = await this.db
      .select()
      .from(PgAgentTable)
      .where(eq(PgAgentTable.parentId, parentId));
    return rows.map(rowToConfig);
  }

  async getParent(childId: AgentId): Promise<AgentConfig | null> {
    const rows = await this.db
      .select()
      .from(PgAgentTable)
      .where(eq(PgAgentTable.id, childId))
      .limit(1);
    const child = rows[0];
    if (!child?.parentId) return null;
    return this.get(child.parentId as AgentId);
  }

  async getAncestors(childId: AgentId): Promise<readonly AgentConfig[]> {
    const ancestors: AgentConfig[] = [];
    let currentId: AgentId = childId;
    for (let i = 0; i < 100; i++) {
      const parent = await this.getParent(currentId);
      if (!parent) break;
      ancestors.unshift(parent);
      currentId = parent.id;
    }
    return ancestors;
  }
}

function rowToConfig(row: Record<string, unknown>): AgentConfig {
  const c: Record<string, unknown> = {
    id: row.id,
    profile: row.profile,
    capabilities: row.capabilities,
  };
  if (row.permissions) {
    const perms = { ...(row.permissions as Record<string, unknown>) };
    if (row.mode && typeof row.mode === "string") perms.mode = row.mode;
    c.permissions = perms;
  } else if (row.mode && typeof row.mode === "string" && row.mode !== "all") {
    c.permissions = { mode: row.mode };
  }
  if (row.systemPrompt) c.systemPrompt = row.systemPrompt;
  if (typeof row.temperature === "number") c.temperature = row.temperature;
  return c as unknown as AgentConfig;
}
