import type { AgentId } from "../contracts/branded.js";

// Re-export from contracts (single source of truth)
export type {
  AgentMode,
  AgentBehaviourMode,
  AgentProfile,
  AgentCapabilities,
  AgentRule,
  AgentRuleset,
  AgentPermissions,
  AgentConfig,
} from "../contracts/schema/agent-config.js";

export { KNOWN_AGENT_MODES } from "../contracts/schema/agent-config.js";