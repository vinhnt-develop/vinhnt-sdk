import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SkillDefinition, SkillSource } from "@vinhnt-sdk/schema";

export interface SkillDefParser {
  parse(raw: string, source: SkillSource): SkillDefinition;
  parseFile(filePath: string, source: SkillSource): Promise<SkillDefinition>;
}

export interface SkillDefRegistry {
  load(skills: SkillDefinition[]): Promise<void>;
  get(name: string): SkillDefinition | undefined;
  list(): readonly SkillDefinition[];
  search(query: string): SkillDefinition[];
  reload(): Promise<void>;
}
import type { SourceDir } from "../agent/agent-registry.js";

export class InMemorySkillDefRegistry implements SkillDefRegistry {
  private readonly skills = new Map<string, SkillDefinition>();
  private readonly parser: SkillDefParser;
  private readonly sourceDirs: SourceDir[];

  constructor(parser: SkillDefParser, sourceDirs?: SourceDir[]) {
    this.parser = parser;
    this.sourceDirs = sourceDirs ?? [];
  }

  async load(skills: SkillDefinition[]): Promise<void> {
    for (const skill of skills) {
      this.skills.set(skill.manifest.name, skill);
    }
  }

  async loadFromSources(): Promise<void> {
    const allSkills: SkillDefinition[] = [];

    for (const source of this.sourceDirs) {
      const found = await this.scanDir(source);
      allSkills.push(...found);
    }

    const seenNames = new Set<string>();
    for (const skill of allSkills) {
      if (seenNames.has(skill.manifest.name)) continue;
      this.skills.set(skill.manifest.name, skill);
      seenNames.add(skill.manifest.name);
    }
  }

  get(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }

  list(): readonly SkillDefinition[] {
    return [...this.skills.values()];
  }

  search(query: string): SkillDefinition[] {
    const lower = query.toLowerCase();
    return [...this.skills.values()].filter(
      (s) =>
        s.manifest.name.toLowerCase().includes(lower) ||
        s.manifest.description.toLowerCase().includes(lower)
    );
  }

  async reload(): Promise<void> {
    this.skills.clear();
    await this.loadFromSources();
  }

  private async scanDir(source: SourceDir): Promise<SkillDefinition[]> {
    try {
      const entries = await readdir(source.dir, { withFileTypes: true });

      // SKILL.md directly in source dir
      const results: SkillDefinition[] = [];

      // Also scan subdirectories for SKILL.md
      const subDirs = entries.filter((e) => e.isDirectory());
      for (const dir of subDirs) {
        try {
          const skillPath = join(source.dir, dir.name, "SKILL.md");
          const raw = await readFile(skillPath, "utf-8");
          const def = this.parser.parse(raw, {
            type: source.type,
            dir: join(source.dir, dir.name),
            priority: source.priority,
          });
          results.push(def);
        } catch {
          // No SKILL.md in this subdirectory
        }
      }

      return results;
    } catch {
      return [];
    }
  }
}
