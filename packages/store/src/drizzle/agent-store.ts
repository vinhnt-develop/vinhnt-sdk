import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { AgentId, AgentConfig } from "@vinhnt-sdk/schema";
import type { AgentRegistry } from "@vinhnt-sdk/core";
import { AgentTable } from "./schema.js";
import { createDb, pushSchema } from "./migration.js";

export class DrizzleAgentStore implements AgentRegistry {
  private readonly db: BetterSQLite3Database;

  constructor(dbPath: string) {
    this.db = createDb(dbPath);
    pushSchema(this.db);
  }

  async register(config: AgentConfig, parentId?: AgentId): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.db.insert(AgentTable).values as any)({
      id: config.id,
      mode: config.permissions?.mode ?? "all",
      profile: config.profile,
      capabilities: config.capabilities,
      ...(config.permissions ? { permissions: config.permissions } : {}),
      ...(config.systemPrompt !== undefined ? { systemPrompt: config.systemPrompt } : {}),
      ...(config.temperature !== undefined ? { temperature: config.temperature } : {}),
      ...(parentId ? { parentId } : {}),
    }).run();
  }

  async get(id: AgentId): Promise<AgentConfig | null> {
    const row = this.db
      .select()
      .from(AgentTable)
      .where(eq(AgentTable.id, id))
      .get();
    if (!row) return null;
    return rowToConfig(row);
  }

  async list(): Promise<readonly AgentConfig[]> {
    const rows = this.db
      .select()
      .from(AgentTable)
      .all();
    return rows.map(rowToConfig);
  }

  async findByCapability(key: string, value: unknown): Promise<readonly AgentConfig[]> {
    const rows = this.db
      .select()
      .from(AgentTable)
      .all();
    return rows
      .filter((row) => {
        const caps = row.capabilities as Record<string, unknown>;
        return caps[key] !== undefined && caps[key] === value;
      })
      .map(rowToConfig);
  }

  async unregister(id: AgentId): Promise<void> {
    this.db
      .delete(AgentTable)
      .where(eq(AgentTable.id, id))
      .run();
  }

  async update(id: AgentId, patch: Partial<AgentConfig>): Promise<AgentConfig | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const merged: AgentConfig = { ...existing, ...patch, id };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.db.update(AgentTable).set as any)({
      mode: merged.permissions?.mode ?? existing.permissions?.mode ?? "all",
      profile: merged.profile,
      capabilities: merged.capabilities,
      ...(merged.permissions ? { permissions: merged.permissions } : {}),
      ...(merged.systemPrompt !== undefined ? { systemPrompt: merged.systemPrompt } : {}),
      ...(merged.temperature !== undefined ? { temperature: merged.temperature } : {}),
    })
      .where(eq(AgentTable.id, id))
      .run();
    return merged;
  }

  async getChildren(parentId: AgentId): Promise<readonly AgentConfig[]> {
    const rows = this.db
      .select()
      .from(AgentTable)
      .where(eq(AgentTable.parentId, parentId))
      .all();
    return rows.map(rowToConfig);
  }

  async getParent(childId: AgentId): Promise<AgentConfig | null> {
    const child = this.db
      .select()
      .from(AgentTable)
      .where(eq(AgentTable.id, childId))
      .get();
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
