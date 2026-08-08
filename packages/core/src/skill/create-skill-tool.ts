import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { defineTool } from "../tool/define-tool.js";

export interface CreateSkillInput {
  name: string;
  description: string;
  instructions: string;
  /** Optional: tools this skill needs */
  tools?: string[];
  /** Optional: directory to write to (default: .vnt/skills/<name>/SKILL.md) */
  directory?: string;
  /** Optional: color for UI display */
  color?: string;
}

const CreateSkillSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  instructions: z.string().min(1),
  directory: z.string().optional(),
  tools: z.array(z.string()).optional(),
  color: z.string().optional(),
});

export function createCreateSkillTool() {
  return defineTool<CreateSkillInput, string>({
    name: "create_skill",
    description: "Create a reusable skill definition. Skills are collections of instructions, workflows, and best practices that can be loaded via the skill tool. Use this to capture expertise for reuse across projects.",
    risk: "write",
    input: CreateSkillSchema,
    jsonSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Skill name (lowercase alphanumeric with hyphens, e.g. 'code-review', 'deploy-guide')",
        },
        description: {
          type: "string",
          description: "Brief description of what this skill does (shown in skill search)",
        },
        instructions: {
          type: "string",
          description: "Detailed instructions, workflows, and best practices for this skill",
        },
        tools: {
          type: "array",
          items: { type: "string" },
          description: "Tools this skill typically uses",
        },
        directory: {
          type: "string",
          description: "Directory to write the skill file to (default: .vnt/skills/<name>/SKILL.md)",
        },
        color: {
          type: "string",
          description: "Optional color for UI display (e.g. '#ff6b6b')",
        },
      },
      required: ["name", "description", "instructions"],
    },
    async execute(v): Promise<string> {
      const dir = v.directory ?? join(".vnt", "skills", v.name);
      const filePath = join(dir, "SKILL.md");

      const frontmatter: Record<string, unknown> = {
        name: v.name,
        description: v.description,
      };
      if (v.tools && v.tools.length > 0) {
        frontmatter.tools = v.tools;
      }
      if (v.color) {
        frontmatter.color = v.color;
      }

      const frontmatterYaml = Object.entries(frontmatter)
        .map(([k, v]) => {
          if (Array.isArray(v)) return `${k}:\n${v.map((i) => `  - ${i}`).join("\n")}`;
          return `${k}: ${v}`;
        })
        .join("\n");

      const content = `---\n${frontmatterYaml}\n---\n\n${v.instructions}\n`;

      await mkdir(dir, { recursive: true });
      await writeFile(filePath, content, "utf-8");

      return `Skill "${v.name}" created at ${filePath}\n\nUse \`skill\` tool with name "${v.name}" to load this skill.`;
    },
  }).toDefinition();
}
