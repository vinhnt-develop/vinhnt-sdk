import type { ContextSourceValue, ContextSourceKey } from "../types.js";
import type { SkillDefinition } from "@vinhnt-sdk/schema";

export interface SkillGuidanceInfo {
  skills: SkillDefinition[];
}

export function createSkillGuidanceSource(
  getSkills: () => SkillDefinition[],
): ContextSourceValue<SkillGuidanceInfo> {
  return {
    key: "core.skills" as ContextSourceKey,
    priority: 50,
    async load() {
      return { skills: getSkills() };
    },
    renderBaseline(value) {
      const visible = value.skills.filter((s) => !s.manifest.hidden);
      if (visible.length === 0) return "";
      const lines: string[] = ["<available_skills>"];
      for (const skill of visible) {
        lines.push(`  <skill>`);
        lines.push(`    <name>${escapeXml(skill.manifest.name)}</name>`);
        lines.push(`    <description>${escapeXml(skill.manifest.description)}</description>`);
        if (skill.manifest.tools?.length) {
          lines.push(`    <tools>${skill.manifest.tools.join(", ")}</tools>`);
        }
        lines.push(`  </skill>`);
      }
      lines.push("</available_skills>");
      return lines.join("\n");
    },
    renderUpdate() {
      return null;
    },
    renderRemoval() {
      return "";
    },
  };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
