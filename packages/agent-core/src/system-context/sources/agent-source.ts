import type { ContextSourceValue, ContextSourceKey } from "../types.js";
import type { AgentRegistry } from "../../agent/agent-registry.js";

export interface AgentContextInfo {
  currentAgentId: string | null;
  agents: Array<{
    id: string;
    name: string;
    description: string;
    mode: string;
    capabilities: string[];
  }>;
}

export function createAgentSource(registry: AgentRegistry, getCurrentAgentId: () => string | null): ContextSourceValue<AgentContextInfo> {
  return {
    key: "core.agents" as ContextSourceKey,
    priority: 20,
    async load() {
      const agents = await registry.list();
      return {
        currentAgentId: getCurrentAgentId(),
        agents: agents.map((a) => ({
          id: a.id,
          name: a.profile.name,
          description: a.profile.description,
          mode: a.permissions?.mode ?? "primary",
          capabilities: [...(a.capabilities.tools ?? []), ...(a.capabilities.models ?? [])],
        })),
      };
    },
    renderBaseline(value) {
      const lines: string[] = ["## Agents"];
      if (value.currentAgentId) {
        const current = value.agents.find((a) => a.id === value.currentAgentId);
        if (current) {
          lines.push(`- **Current agent**: ${current.name} (${current.mode}) — ${current.description}`);
        }
      }
      const others = value.agents.filter((a) => a.id !== value.currentAgentId);
      if (others.length > 0) {
        lines.push("**Available agents:**");
        for (const a of others) {
          const caps = a.capabilities.length > 0 ? ` [${a.capabilities.join(", ")}]` : "";
          lines.push(`- \`${a.id}\`: ${a.name} (${a.mode})${caps} — ${a.description}`);
        }
      }
      return lines.join("\n");
    },
    renderUpdate(value, previous) {
      if (value.currentAgentId !== previous.currentAgentId) {
        const current = value.agents.find((a) => a.id === value.currentAgentId);
        if (current) {
          return `[Agent switched]\nNow using agent: ${current.name} (${current.mode}).`;
        }
      }
      return null;
    },
    renderRemoval() {
      return "";
    },
  };
}
