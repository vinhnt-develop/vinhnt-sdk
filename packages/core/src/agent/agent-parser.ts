import { readFile } from "node:fs/promises";
import type { AgentId, AgentConfig, AgentMode, SkillSource, AgentRule } from "@vinhnt-sdk/schema";
import type { AgentDefinition, AgentDefParser } from "./agent-def.js";
import { validateAgentConfig } from "./agent-factory.js";
import { parseFrontmatter } from "../yaml-frontmatter.js";

export class AgentParser implements AgentDefParser {
  parse(raw: string, source: SkillSource): AgentDefinition {
    const { frontmatter, body } = parseFrontmatter(raw);
    const nameRaw = frontmatter.name;
    const id = (typeof nameRaw === "string" ? nameRaw : crypto.randomUUID()) as AgentId;
    const mode = (frontmatter.mode ?? "all") as AgentMode;

    const model = typeof frontmatter.model === "string" ? frontmatter.model : undefined;
    const hidden = typeof frontmatter.hidden === "boolean" ? frontmatter.hidden : undefined;
    const tools = Array.isArray(frontmatter.tools) ? (frontmatter.tools as string[]) : undefined;
    const maxSteps = typeof frontmatter.maxSteps === "number" ? frontmatter.maxSteps : undefined;
    const temperature = typeof frontmatter.temperature === "number" ? frontmatter.temperature : undefined;
    const perm = frontmatter.permission as Record<string, unknown> | undefined;

    const rules: readonly AgentRule[] | undefined = perm
      ? this.mapPermissions(perm)
      : undefined;

    const config: AgentConfig = {
      id,
      profile: {
        name: typeof frontmatter.name === "string" ? frontmatter.name : "unnamed",
        description: typeof frontmatter.description === "string" ? frontmatter.description : "",
        ...(model !== undefined ? { model } : {}),
        ...(hidden !== undefined ? { hidden } : {}),
      },
      capabilities: {
        ...(tools !== undefined ? { tools } : {}),
        streaming: true,
        thinking: false,
      },
      permissions: {
        mode,
        ...(rules !== undefined || maxSteps !== undefined
          ? { ruleset: { rules: rules ?? [], ...(maxSteps !== undefined ? { maxSteps } : {}) } }
          : {}),
      },
      ...(body ? { systemPrompt: body } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
    };

    const errors = validateAgentConfig(config);
    if (errors.length > 0) {
      throw new Error(`Invalid agent config: ${errors.join("; ")}`);
    }

    return { config, source, raw };
  }

  async parseFile(filePath: string, source: SkillSource): Promise<AgentDefinition> {
    const content = await readFile(filePath, "utf-8");
    return this.parse(content, source);
  }

  private mapPermissions(perm: Record<string, unknown>): AgentRule[] {
    const rules: AgentRule[] = [];
    for (const [key, value] of Object.entries(perm)) {
      if (typeof value === "string") {
        rules.push({ effect: value as "allow" | "deny" | "ask", target: key });
      } else if (typeof value === "object" && value !== null) {
        const nested = value as Record<string, string>;
        for (const [pattern, effect] of Object.entries(nested)) {
          rules.push({ effect: effect as "allow" | "deny" | "ask", target: `${key}.${pattern}` });
        }
      }
    }
    return rules;
  }

  toAgentConfig(def: AgentDefinition): AgentConfig {
    return def.config;
  }
}
