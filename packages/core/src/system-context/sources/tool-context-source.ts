import type { ContextSourceValue, ContextSourceKey } from "../types.js";

export interface ToolContextInfo {
  tools: Array<{
    name: string;
    description: string;
    risk?: string;
  }>;
}

/**
 * Creates a context source that renders registered tool definitions as
 * structured text in the system prompt.
 *
 * This supplements native function calling with a human-readable tool
 * usage guide so the model understands available capabilities.
 */
export function createToolContextSource(
  getTools: () => Array<{ name: string; description: string; risk?: string }>,
): ContextSourceValue<ToolContextInfo> {
  return {
    key: "core.tools" as ContextSourceKey,
    priority: 5,
    async load() {
      return { tools: getTools() };
    },
    renderBaseline(value) {
      if (value.tools.length === 0) return "";
      const lines: string[] = [
        "# Available Tools",
        "",
        "The following tools are available for use. Prefer using tools over manual work.",
        "",
      ];
      for (const tool of value.tools) {
        const risk = tool.risk ? ` [${tool.risk}]` : "";
        lines.push(`- \`${tool.name}\`${risk}: ${tool.description}`);
      }
      return lines.join("\n");
    },
    renderUpdate(value, previous) {
      if (value.tools.length === previous.tools.length) return null;
      const added = value.tools.filter(
        (t) => !previous.tools.some((p) => p.name === t.name),
      );
      const removed = previous.tools.filter(
        (t) => !value.tools.some((p) => p.name === t.name),
      );
      if (added.length === 0 && removed.length === 0) return null;

      const lines: string[] = ["[Context update — tools changed]"];
      if (added.length > 0) {
        lines.push(`New tools: ${added.map((t) => t.name).join(", ")}`);
      }
      if (removed.length > 0) {
        lines.push(`Removed tools: ${removed.map((t) => t.name).join(", ")}`);
      }
      return lines.join("\n");
    },
    renderRemoval() {
      return "";
    },
  };
}
