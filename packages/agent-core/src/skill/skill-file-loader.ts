import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SkillDefinition, SkillSource } from "@vinhnt-sdk/schema";
import type { SkillDefParser, SkillDefRegistry } from "../skill/skill-def-registry.js";
import { SkillParser } from "../skill/skill-parser.js";

/**
 * SkillFileLoader — Discovers and loads skills from .vnt/skills/ directories.
 *
 * Supports multiple discovery locations:
 * 1. Workspace-local: .vnt/skills/<name>/SKILL.md
 * 2. Global: ~/.vnt/skills/<name>/SKILL.md
 * 3. Claude-compatible: .claude/skills/<name>/SKILL.md
 * 4. Agents-compatible: .agents/skills/<name>/SKILL.md
 */
export class SkillFileLoader {
  private readonly parser: SkillDefParser;

  constructor(parser?: SkillDefParser) {
    this.parser = parser ?? new SkillParser();
  }

  /**
   * Load skills from a single directory.
   */
  async loadFromDirectory(dir: string, source: SkillSource): Promise<SkillDefinition[]> {
    const skills: SkillDefinition[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillPath = join(dir, entry.name, "SKILL.md");
        try {
          const raw = await readFile(skillPath, "utf-8");
          const skill = this.parser.parse(raw, source);
          skills.push(skill);
        } catch {
          // No SKILL.md in this subdirectory
        }
      }
    } catch {
      // Directory doesn't exist, ignore
    }

    return skills;
  }

  /**
   * Discover skills from all conventional locations.
   *
   * Discovery order (workspace overrides global):
   * 1. Global: ~/.vnt/skills/
   * 2. Global Claude: ~/.claude/skills/
   * 3. Global Agents: ~/.agents/skills/
   * 4. Workspace: .vnt/skills/
   * 5. Workspace Claude: .claude/skills/
   * 6. Workspace Agents: .agents/skills/
   */
  async discover(workspaceRoot: string): Promise<SkillDefinition[]> {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    const allSkills: SkillDefinition[] = [];

    // Global locations
    const globalLocations = [
      { dir: join(home, ".vnt", "skills"), type: "global" as const, priority: 0 },
      { dir: join(home, ".claude", "skills"), type: "global" as const, priority: 0 },
      { dir: join(home, ".agents", "skills"), type: "global" as const, priority: 0 },
    ];

    // Workspace locations
    const workspaceLocations = [
      { dir: join(workspaceRoot, ".vnt", "skills"), type: "project" as const, priority: 10 },
      { dir: join(workspaceRoot, ".claude", "skills"), type: "project" as const, priority: 10 },
      { dir: join(workspaceRoot, ".agents", "skills"), type: "project" as const, priority: 10 },
    ];

    // Load from all locations
    for (const loc of [...globalLocations, ...workspaceLocations]) {
      const skills = await this.loadFromDirectory(loc.dir, {
        type: loc.type,
        dir: loc.dir,
        priority: loc.priority,
      });
      allSkills.push(...skills);
    }

    // Deduplicate by name (workspace > global)
    const skillMap = new Map<string, SkillDefinition>();
    for (const skill of allSkills) {
      const existing = skillMap.get(skill.manifest.name);
      if (!existing || (skill.source?.priority ?? 0) > (existing.source?.priority ?? 0)) {
        skillMap.set(skill.manifest.name, skill);
      }
    }

    return [...skillMap.values()];
  }
}

/**
 * SkillFileProvider — Integrates discovered skills into the kernel.
 */
export class SkillFileProvider {
  private skills: SkillDefinition[] = [];

  /**
   * Load skills from all conventional locations.
   */
  async load(workspaceRoot: string): Promise<void> {
    const loader = new SkillFileLoader();
    this.skills = await loader.discover(workspaceRoot);
  }

  /**
   * Get all discovered skills.
   */
  getSkills(): readonly SkillDefinition[] {
    return this.skills;
  }

  /**
   * Register skills into a SkillDefRegistry.
   */
  async registerInto(registry: SkillDefRegistry): Promise<void> {
    await registry.load(this.skills);
  }
}
