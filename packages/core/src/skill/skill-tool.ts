import type { SkillDefinition } from "@vinhnt-sdk/schema";
import type { SkillDefRegistry } from "./skill-def-registry.js";
import { z } from "zod";
import { defineTool } from "../tool/define-tool.js";

export interface SkillToolInput {
  name: string;
  task: string;
}

const SkillSchema = z.object({
  name: z.string().min(1),
  task: z.string().min(1),
});
const SkillSearchSchema = z.object({
  query: z.string().min(1),
});

export function createSkillTool(
  registry: SkillDefRegistry,
) {
  return defineTool<SkillToolInput, string>({
    name: "skill",
    description: "Load a skill by name and apply it to the current task. Skills provide specialized instructions, workflows, and best practices for specific domains (testing, deployment, code review, etc.). Use this tool when the task matches a skill's description.",
    risk: "read",
    input: SkillSchema,
    jsonSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the skill to load (use search first if unsure)",
        },
        task: {
          type: "string",
          description: "Description of the task to apply the skill to",
        },
      },
      required: ["name", "task"],
    },
    async execute(v): Promise<string> {
      const skill = registry.get(v.name);
      if (!skill) {
        const similar = registry.search(v.name);
        if (similar.length > 0) {
          const names = similar.map((s) => `  - ${s.manifest.name}: ${s.manifest.description}`).join("\n");
          return `Skill "${v.name}" not found. Available similar skills:\n${names}\n\nUse 'skill' with the correct name.`;
        }
        return `Skill "${v.name}" not found. No similar skills found.`;
      }

      return formatSkillOutput(skill, v.task);
    },
  }).toDefinition();
}

export function createSkillSearchTool(
  registry: SkillDefRegistry,
) {
  return defineTool<{ query: string }, string>({
    name: "skill_search",
    description: "Search for available skills by name or description. Use this to discover skills that match your current task.",
    risk: "read",
    input: SkillSearchSchema,
    jsonSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (matches against name and description)" },
      },
      required: ["query"],
    },
    async execute(v): Promise<string> {
      const results = registry.search(v.query);
      if (results.length === 0) {
        return `No skills found matching "${v.query}".`;
      }

      const lines = results.map((s, i) => {
        const tags = s.manifest.tools?.length ? ` [tools: ${s.manifest.tools.join(", ")}]` : "";
        return `${i + 1}. **${s.manifest.name}**${s.manifest.color ? ` (color: ${s.manifest.color})` : ""}${tags}\n   ${s.manifest.description}`;
      });

      return `Found ${results.length} skill(s) matching "${v.query}":\n\n${lines.join("\n")}\n\nUse \`skill\` tool with the desired name to load.`;
    },
  }).toDefinition();
}

function formatSkillOutput(skill: SkillDefinition, task: string): string {
  const lines: string[] = [];
  lines.push(`# Skill: ${skill.manifest.name}`);
  lines.push("");
  lines.push(skill.manifest.description);
  lines.push("");

  if (skill.manifest.mode) {
    lines.push(`**Mode**: ${skill.manifest.mode}`);
  }
  if (skill.manifest.model) {
    lines.push(`**Model**: ${skill.manifest.model}`);
  }
  if (skill.manifest.temperature !== undefined) {
    lines.push(`**Temperature**: ${skill.manifest.temperature}`);
  }
  if (skill.manifest.tools && skill.manifest.tools.length > 0) {
    lines.push(`**Tools**: ${skill.manifest.tools.join(", ")}`);
  }
  lines.push("");

  if (skill.body) {
    lines.push("## Instructions");
    lines.push("");
    lines.push(skill.body);
    lines.push("");
  }

  lines.push("---");
  lines.push(`**Task to apply this skill to**: ${task}`);
  lines.push("");

  return lines.join("\n");
}
