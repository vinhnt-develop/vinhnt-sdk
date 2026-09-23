import type { ContextSourceValue, ContextSourceKey } from "../types.js";

export interface ToolContextInfo {
  tools: Array<{
    name?: string;
    id?: string;
    description?: string;
    risk?: string;
  }>;
}

/**
 * Creates a context source that renders registered tool names as a lightweight
 * index in the system prompt.
 *
 * Descriptions and JSON Schemas are NOT duplicated here — they ride the native
 * `tools[]` API param (industry pattern: OpenAI/Anthropic/ADK/Mastra).
 * This block is name+risk only so the model sees a compact capability map.
 */
export function createToolContextSource(
  getTools: () => Array<{
    name?: string;
    id?: string;
    description?: string;
    risk?: string;
  }>,
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
        "Prefer using tools over manual work. Tool descriptions and parameter schemas are provided via the tools API.",
        "",
      ];
      for (const tool of value.tools) {
        const name = tool.name ?? tool.id;
        if (!name) continue;
        const risk = tool.risk ? ` [${tool.risk}]` : "";
        lines.push(`- \`${name}\`${risk}`);
      }
      return lines.join("\n");
    },
    renderUpdate(value, previous) {
      const keyOf = (t: { name?: string; id?: string }) => t.name ?? t.id ?? "";
      if (value.tools.length === previous.tools.length) return null;
      const added = value.tools.filter(
        (t) => !previous.tools.some((p) => keyOf(p) === keyOf(t)),
      );
      const removed = previous.tools.filter(
        (t) => !value.tools.some((p) => keyOf(p) === keyOf(t)),
      );
      if (added.length === 0 && removed.length === 0) return null;

      const lines: string[] = ["[Context update — tools changed]"];
      if (added.length > 0) {
        lines.push(`New tools: ${added.map((t) => keyOf(t)).join(", ")}`);
      }
      if (removed.length > 0) {
        lines.push(`Removed tools: ${removed.map((t) => keyOf(t)).join(", ")}`);
      }
      return lines.join("\n");
    },
    renderRemoval() {
      return "";
    },
  };
}
