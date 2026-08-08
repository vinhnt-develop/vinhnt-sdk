import { readFile } from "node:fs/promises";
import type { SkillDefinition, SkillPermission, SkillSource } from "@vinhnt-sdk/schema";
import type { SkillDefParser } from "./skill-def-registry.js";
import { parseFrontmatter } from "../yaml-frontmatter.js";

export class SkillParser implements SkillDefParser {
  parse(raw: string, source: SkillSource): SkillDefinition {
    const { frontmatter, body } = parseFrontmatter(raw);

    if (!frontmatter.name) throw new Error("Skill must have a 'name' in frontmatter");
    if (!frontmatter.description) throw new Error("Skill must have a 'description' in frontmatter");

    const name = String(frontmatter.name);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
      throw new Error(`Skill name "${name}" must be lowercase alphanumeric with hyphens`);
    }
    if (name.length < 1 || name.length > 64) {
      throw new Error(`Skill name "${name}" must be 1-64 characters`);
    }

    const perm = frontmatter.permission as SkillPermission | undefined;
    const tools = Array.isArray(frontmatter.tools) ? (frontmatter.tools as string[]) : undefined;
    const hidden = typeof frontmatter.hidden === "boolean" ? frontmatter.hidden : undefined;
    const color = typeof frontmatter.color === "string" ? frontmatter.color : undefined;
    const mode = (frontmatter.mode as "primary" | "subagent" | "all") ?? "all";

    return {
      manifest: {
        name,
        description: String(frontmatter.description),
        mode,
        ...(hidden !== undefined ? { hidden } : {}),
        ...(tools !== undefined ? { tools } : {}),
        ...(perm !== undefined ? { permission: perm } : {}),
        ...(color !== undefined ? { color } : {}),
      },
      source,
      body,
      raw,
    };
  }

  async parseFile(filePath: string, source: SkillSource): Promise<SkillDefinition> {
    const content = await readFile(filePath, "utf-8");
    return this.parse(content, source);
  }
}
