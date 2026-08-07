import type { AgentId, AgentConfig } from "@vinhnt-sdk/schema";

export const DEFAULT_BUILD_AGENT: AgentConfig = {
  id: "build" as AgentId,
  profile: {
    name: "build",
    description: "Full tool access — edit files, run commands, make changes",
    hidden: false,
  },
  capabilities: {
    streaming: true,
    thinking: true,
  },
  permissions: { mode: "primary" },
  behaviourMode: "build",
  systemPrompt: "You have full access to all tools. Make changes to the codebase as needed.",
};

export const DEFAULT_PLAN_AGENT: AgentConfig = {
  id: "plan" as AgentId,
  profile: {
    name: "plan",
    description: "Read-only analysis — review code, suggest changes without modifying files",
    hidden: false,
  },
  capabilities: {
    streaming: true,
    thinking: true,
  },
  permissions: { mode: "primary" },
  behaviourMode: "plan",
  systemPrompt:
    "You are in PLAN mode.\n" +
    "You CANNOT modify files or execute shell commands.\n" +
    "Analyze the codebase, suggest improvements, and create detailed plans.\n" +
    "When the user is satisfied, they will switch to BUILD mode to implement the changes.",
};

export const DEFAULT_AGENTS: AgentConfig[] = [
  DEFAULT_BUILD_AGENT,
  DEFAULT_PLAN_AGENT,
];
