import type { AgentId, AgentConfig } from "@vinhnt-sdk/schema";
import type { AgentRegistry } from "../agent/agent-registry.js";

export class FakeAgentRegistry implements AgentRegistry {
  private readonly agents = new Map<string, AgentConfig>();
  private readonly parentMap = new Map<string, string>();
  private readonly childrenMap = new Map<string, string[]>();

  async register(config: AgentConfig, parentId?: AgentId): Promise<void> {
    this.agents.set(config.id, config);
    if (parentId) {
      this.parentMap.set(config.id, parentId);
      const existing = this.childrenMap.get(parentId) ?? [];
      existing.push(config.id);
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
  }

  async update(id: AgentId, patch: Partial<AgentConfig>): Promise<AgentConfig | null> {
    const existing = this.agents.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id } as AgentConfig;
    this.agents.set(id, updated);
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
}
