import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AgentConfig, AgentId, SkillSourceType } from "@vinhnt-sdk/schema";
import { AgentConfigSchema } from "@vinhnt-sdk/schema";

/** Registry contract for storing and querying agent configs with parent/child hierarchy. */
export interface AgentRegistry {
  register(config: AgentConfig, parentId?: AgentId): Promise<void>;
  get(id: AgentId): Promise<AgentConfig | null>;
  list(): Promise<readonly AgentConfig[]>;
  findByCapability(key: string, value: unknown): Promise<readonly AgentConfig[]>;
  update(id: AgentId, patch: Partial<AgentConfig>): Promise<AgentConfig | null>;
  unregister(id: AgentId): Promise<void>;
  getChildren(parentId: AgentId): Promise<readonly AgentConfig[]>;
  getParent(childId: AgentId): Promise<AgentConfig | null>;
  getAncestors(childId: AgentId): Promise<readonly AgentConfig[]>;
}

/** A skill source directory scanned for agent definitions, with load priority. */
export interface SourceDir {
  type: SkillSourceType;
  dir: string;
  priority: number;
}

/** A loadable agent definition — either inline config or a config file on disk. */
export type AgentSource = {
  type: "inline";
  config: AgentConfig;
  parentId?: AgentId;
} | {
  type: "file";
  path: string;
  parentId?: AgentId;
};

/**
 * In-memory agent store with optional file loading (load/loadMultiple/reload).
 */
export class InMemoryAgentRegistry implements AgentRegistry {
  protected readonly agents = new Map<string, AgentConfig>();
  private readonly parentMap = new Map<string, string>();
  private readonly childrenMap = new Map<string, string[]>();
  private readonly loadedPaths = new Set<string>();
  private readonly pathToAgentId = new Map<string, AgentId>();

  async register(config: AgentConfig, parentId?: AgentId): Promise<void> {
    const parsed = AgentConfigSchema.parse(config) as unknown as AgentConfig;
    this.agents.set(parsed.id, parsed);
    if (parentId) {
      this.parentMap.set(parsed.id, parentId);
      const existing = this.childrenMap.get(parentId) ?? [];
      existing.push(parsed.id);
      this.childrenMap.set(parentId, existing);
    }
  }

  async get(id: AgentId): Promise<AgentConfig | null> {
    return this.agents.get(id) ?? null;
  }

  async list(): Promise<readonly AgentConfig[]> {
    return [...this.agents.values()];
  }

  async findByCapability(key: string, value: unknown): Promise<readonly AgentConfig[]> {
    return [...this.agents.values()].filter((a) => {
      const caps = a.capabilities as Record<string, unknown>;
      return caps[key] === value;
    });
  }

  async unregister(id: AgentId): Promise<void> {
    this.agents.delete(id);
    this.parentMap.delete(id);
    this.childrenMap.delete(id);
    for (const [parentId, children] of this.childrenMap) {
      const idx = children.indexOf(id);
      if (idx >= 0) {
        children.splice(idx, 1);
        this.childrenMap.set(parentId, children);
        break;
      }
    }
    for (const [absPath, agentId] of this.pathToAgentId) {
      if (agentId === id) {
        this.loadedPaths.delete(absPath);
        this.pathToAgentId.delete(absPath);
      }
    }
  }

  async update(id: AgentId, patch: Partial<AgentConfig>): Promise<AgentConfig | null> {
    const existing = this.agents.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id } as AgentConfig;
    this.agents.set(id, AgentConfigSchema.parse(updated) as unknown as AgentConfig);
    return updated;
  }

  async getChildren(parentId: AgentId): Promise<readonly AgentConfig[]> {
    const childIds = this.childrenMap.get(parentId) ?? [];
    return childIds.map((id) => this.agents.get(id)).filter(Boolean) as AgentConfig[];
  }

  async getParent(childId: AgentId): Promise<AgentConfig | null> {
    const parentId = this.parentMap.get(childId);
    if (!parentId) return null;
    return this.agents.get(parentId) ?? null;
  }

  async getAncestors(childId: AgentId): Promise<readonly AgentConfig[]> {
    const ancestors: AgentConfig[] = [];
    let current = childId;
    for (;;) {
      const parent = await this.getParent(current);
      if (!parent) break;
      ancestors.unshift(parent);
      current = parent.id;
    }
    return ancestors;
  }

  // -------------------------------------------------------------------------
  // File loading
  // -------------------------------------------------------------------------

  async load(source: AgentSource): Promise<AgentConfig> {
    switch (source.type) {
      case "inline": {
        const parsed = AgentConfigSchema.parse(source.config) as unknown as AgentConfig;
        await this.register(parsed, source.parentId);
        return parsed;
      }
      case "file": {
        const absPath = resolve(source.path);
        if (this.loadedPaths.has(absPath)) {
          throw new Error(`Agent file already loaded: ${absPath}`);
        }
        const content = await readFile(absPath, "utf-8");
        const raw = JSON.parse(content);
        const parsed = AgentConfigSchema.parse(raw) as unknown as AgentConfig;
        await this.register(parsed, source.parentId);
        this.loadedPaths.add(absPath);
        this.pathToAgentId.set(absPath, parsed.id);
        return parsed;
      }
    }
  }

  async loadMultiple(sources: AgentSource[]): Promise<AgentConfig[]> {
    const results: AgentConfig[] = [];
    for (const source of sources) {
      results.push(await this.load(source));
    }
    return results;
  }

  async reload(path: string): Promise<AgentConfig> {
    const absPath = resolve(path);
    const previousId = this.pathToAgentId.get(absPath);
    this.loadedPaths.delete(absPath);
    this.pathToAgentId.delete(absPath);
    if (previousId) {
      await this.unregister(previousId);
    }
    return await this.load({ type: "file", path });
  }
}
