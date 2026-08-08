import type { AgentKernel } from "../kernel/kernel.js";
import { z } from "zod";
import { defineTool } from "../tool/define-tool.js";

/** Tool for listing all registered agents (useful for discovering sub-agents) */
export function createListAgentsTool(kernel: AgentKernel) {
  return defineTool<unknown, string>({
    name: "list_agents",
    description: "List all registered agents including their IDs, mode, capabilities, and permissions.",
    risk: "read",
    input: z.unknown(),
    jsonSchema: {
      type: "object",
      properties: {},
    },
    async execute(): Promise<string> {
      const registry = kernel.getAgentRegistry();
      if (!registry) return "No agent registry configured";
      const agents = await registry.list();
      if (agents.length === 0) return "No agents registered";

      const lines = await Promise.all(agents.map(async (a) => {
        const mode = a.permissions?.mode ?? "primary";
        const parent = await registry.getParent(a.id);
        let info = `- ${a.id}: ${a.profile.name} [${mode}] — ${a.profile.description}`;
        if (parent) info += ` (parent: ${parent.id})`;
        if (a.permissions?.ruleset?.rules) {
          const rules = a.permissions.ruleset.rules.map((r) => `${r.effect}:${r.target}`);
          info += ` rules: ${rules.join(", ")}`;
        }
        if (a.permissions?.allowedTools) {
          info += ` allowed: ${a.permissions.allowedTools.join(", ")}`;
        }
        if (a.permissions?.deniedTools) {
          info += ` denied: ${a.permissions.deniedTools.join(", ")}`;
        }
        return info;
      }));
      return lines.join("\n");
    },
  }).toDefinition();
}
