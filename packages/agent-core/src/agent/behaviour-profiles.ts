import type { AgentRule, AgentBehaviourMode } from "@vinhnt-sdk/schema";

export interface BehaviourProfile {
  readonly label: string;
  readonly icon: string;
  readonly description: string;
  readonly rules: readonly AgentRule[];
}

const BUILD_PROFILE: BehaviourProfile = {
  label: "Build",
  icon: "hammer",
  description: "Full tool access — edit files, run commands, make changes",
  rules: [
    { effect: "allow", target: "tool.*", reason: "Build mode: all tools allowed" },
  ],
};

const PLAN_PROFILE: BehaviourProfile = {
  label: "Plan",
  icon: "clipboard",
  description: "Read-only analysis — review code, suggest changes without modifying files",
  rules: [
    { effect: "allow", target: "tool.read_file" },
    { effect: "allow", target: "tool.glob_files" },
    { effect: "allow", target: "tool.grep_files" },
    { effect: "allow", target: "tool.list_directory" },
    { effect: "allow", target: "tool.web_fetch" },
    { effect: "allow", target: "tool.web_search" },
    { effect: "allow", target: "tool.question" },
    { effect: "allow", target: "tool.skill" },
    { effect: "allow", target: "tool.skill_search" },
    { effect: "allow", target: "tool.git_status" },
    { effect: "allow", target: "tool.git_diff" },
    { effect: "allow", target: "tool.git_log" },
    { effect: "allow", target: "tool.read_image" },
    { effect: "allow", target: "tool.lsp_*" },
    { effect: "allow", target: "tool.list_agents" },
    { effect: "allow", target: "tool.create_skill" },
    { effect: "deny", target: "tool.*", reason: "Plan mode: only read-only tools allowed" },
  ],
};

const DEFAULT_PROFILES: Record<string, BehaviourProfile> = {
  build: BUILD_PROFILE,
  plan: PLAN_PROFILE,
};

export function getBehaviourProfile(mode: AgentBehaviourMode): BehaviourProfile {
  return DEFAULT_PROFILES[mode] ?? BUILD_PROFILE;
}

export function applyBehaviourProfile(
  baseRules: readonly AgentRule[] | undefined,
  profile: BehaviourProfile,
): AgentRule[] {
  return [...(baseRules ?? []), ...profile.rules];
}

export function getBuiltinModes(): string[] {
  return Object.keys(DEFAULT_PROFILES);
}
