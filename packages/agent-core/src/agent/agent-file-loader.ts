import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AgentDefinition, AgentDefParser } from "../agent/agent-def.js";
import type { SkillSource } from "@vinhnt-sdk/schema";
import { AgentParser } from "../agent/agent-parser.js";

/**
 * AgentFileLoader — Discovers and loads agents from .vnt/agents/ directories.
 *
 * Supports multiple discovery locations:
 * 1. Workspace-local: .vnt/agents/<name>.md
 * 2. Global: ~/.vnt/agents/<name>.md
 * 3. Claude-compatible: .claude/agents/<name>.md
 * 4. Agents-compatible: .agents/agents/<name>.md
 */
export class AgentFileLoader {
  private readonly parser: AgentDefParser;

  constructor(parser?: AgentDefParser) {
    this.parser = parser ?? new AgentParser();
  }

  /**
   * Load agents from a single directory.
   */
  async loadFromDirectory(dir: string, source: SkillSource): Promise<AgentDefinition[]> {
    const agents: AgentDefinition[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!entry.name.endsWith(".md")) continue;

        const filePath = join(dir, entry.name);
        try {
          const raw = await readFile(filePath, "utf-8");
          const agent = this.parser.parse(raw, source);
          agents.push(agent);
        } catch (error) {
          console.error(`[AgentFileLoader] Failed to load agent from ${filePath}:`, error);
        }
      }
    } catch {
      // Directory doesn't exist, ignore
    }

    return agents;
  }

  /**
   * Discover agents from all conventional locations.
   *
   * Discovery order (workspace overrides global):
   * 1. Global: ~/.vnt/agents/
   * 2. Global Claude: ~/.claude/agents/
   * 3. Global Agents: ~/.agents/agents/
   * 4. Workspace: .vnt/agents/
   * 5. Workspace Claude: .claude/agents/
   * 6. Workspace Agents: .agents/agents/
   */
  async discover(workspaceRoot: string): Promise<AgentDefinition[]> {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    const allAgents: AgentDefinition[] = [];

    // Global locations
    const globalLocations = [
      { dir: join(home, ".vnt", "agents"), type: "global" as const, priority: 0 },
      { dir: join(home, ".claude", "agents"), type: "global" as const, priority: 0 },
      { dir: join(home, ".agents", "agents"), type: "global" as const, priority: 0 },
    ];

    // Workspace locations
    const workspaceLocations = [
      { dir: join(workspaceRoot, ".vnt", "agents"), type: "project" as const, priority: 10 },
      { dir: join(workspaceRoot, ".claude", "agents"), type: "project" as const, priority: 10 },
      { dir: join(workspaceRoot, ".agents", "agents"), type: "project" as const, priority: 10 },
    ];

    // Load from all locations
    for (const loc of [...globalLocations, ...workspaceLocations]) {
      const agents = await this.loadFromDirectory(loc.dir, {
        type: loc.type,
        dir: loc.dir,
        priority: loc.priority,
      });
      allAgents.push(...agents);
    }

    // Deduplicate by ID (workspace > global)
    const agentMap = new Map<string, AgentDefinition>();
    for (const agent of allAgents) {
      const existing = agentMap.get(agent.config.id);
      if (!existing || (agent.source?.priority ?? 0) > (existing.source?.priority ?? 0)) {
        agentMap.set(agent.config.id, agent);
      }
    }

    return [...agentMap.values()];
  }
}

/**
 * AgentFileProvider — Integrates discovered agents into the kernel.
 */
export class AgentFileProvider {
  private agents: AgentDefinition[] = [];

  /**
   * Load agents from all conventional locations.
   */
  async load(workspaceRoot: string): Promise<void> {
    const loader = new AgentFileLoader();
    this.agents = await loader.discover(workspaceRoot);
  }

  /**
   * Get all discovered agents.
   */
  getAgents(): readonly AgentDefinition[] {
    return this.agents;
  }
}
