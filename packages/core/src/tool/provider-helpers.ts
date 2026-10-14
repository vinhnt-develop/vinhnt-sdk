import { ToolProviderRegistry } from "@vinhnt-sdk/tools";
import type { ToolProvider, ToolDefinition } from "@vinhnt-sdk/tools";
import { AgentToolProvider, SkillToolProvider } from "@vinhnt-sdk/tools";
import { BuiltinToolProvider } from "./builtin-provider.js";
import type { AgentKernel } from "../kernel/kernel.js";
import { createSpawnAgentTool } from "../agent/spawn-agent-tool.js";
import { createDelegateTool } from "../agent/delegate-tool.js";
import { createCreateAgentTool } from "../agent/create-agent-tool.js";
import { createListAgentsTool } from "../agent/list-agents-tool.js";
import { InMemorySkillDefRegistry } from "../skill/skill-def-registry.js";
import type { SkillDefRegistry } from "../skill/skill-def-registry.js";
import { SkillParser } from "../skill/skill-parser.js";
import { createSkillTool, createSkillSearchTool } from "../skill/skill-tool.js";

/**
 * Create a ToolProviderRegistry with all built-in providers.
 *
 * This is the main entry point for setting up the tool system.
 * It creates:
 * 1. BuiltinToolProvider (coding tools)
 * 2. User tools from .vnt/tools/ (if any)
 */
export async function createToolProviderRegistry(config: {
  workspaceRoot: string;
  shell: {
    workspaceRoot: string | (() => string);
    defaultTimeoutMs: number;
    maxTimeoutMs?: number;
    askPermission?: boolean;
  };
  webSearchApiKey?: string | (() => string);
}): Promise<ToolProviderRegistry> {
  const registry = new ToolProviderRegistry();

  // 1. Register built-in coding tools
  const builtinProvider = new BuiltinToolProvider({
    workspaceRoot: config.workspaceRoot,
    shell: config.shell,
    ...(config.webSearchApiKey !== undefined ? { webSearchApiKey: config.webSearchApiKey } : {}),
  });
  registry.registerProvider(builtinProvider);

  // 2. Load user tools from .vnt/tools/
  try {
    const { ToolFileLoader } = await import("@vinhnt-sdk/tools");
    const loader = new ToolFileLoader();
    const userTools = await loader.discover(config.workspaceRoot);
    if (userTools.tools.length > 0) {
      registry.registerProvider(userTools);
    }
  } catch {
    // User tools directory doesn't exist, ignore
  }

  return registry;
}

export interface WireAgentAndSkillToolsOptions {
  /**
   * Skill registry backing the wired `skill` / `skill_search` tools.
   * Defaults to a fresh in-memory registry (with a real {@link SkillParser}).
   * Pass your own to control skill loading (e.g. `loadFromSources()`).
   */
  readonly skillRegistry?: SkillDefRegistry;
}

export interface WiredAgentAndSkillTools {
  /**
   * The registry the skill tools read from. After `wire`, call
   * `await skillRegistry.load([...])` (or `reload()`) to expose skills —
   * without this handle the skill tools would be a silent dead-end.
   */
  readonly skillRegistry: SkillDefRegistry;
}

/**
 * Wire agent tools and skill tools into the provider registry.
 *
 * Explicit opt-in: agent-capability tools (`spawn_agent`, `delegate`,
 * `create_agent`, `list_agents`) are NOT registered by default — the library
 * never grants sub-agent powers implicitly. Call this AFTER the kernel is
 * created (agent tools need the kernel instance), before the first run.
 *
 * @example
 * ```ts
 * const registry = await createToolProviderRegistry(config);
 * const kernel = new AgentKernel({ ...config, toolProviderRegistry: registry });
 * const { skillRegistry } = wireAgentAndSkillTools(kernel, registry);
 * await skillRegistry.load([mySkillDefinition]);
 * ```
 */
export function wireAgentAndSkillTools(
  kernel: AgentKernel,
  registry: ToolProviderRegistry,
  options?: WireAgentAndSkillToolsOptions,
): WiredAgentAndSkillTools {
  // Wire agent tools
  const agentProvider = new AgentToolProvider();
  agentProvider.addTools([
    createSpawnAgentTool(kernel),
    createDelegateTool(kernel),
    createCreateAgentTool(kernel),
    createListAgentsTool(kernel),
  ]);
  registry.registerProvider(agentProvider);

  // Wire skill tools against an injectable/returned registry (P2.6: the
  // previous version created a private registry nobody could populate).
  const skillRegistry = options?.skillRegistry ?? new InMemorySkillDefRegistry(new SkillParser());
  const skillProvider = new SkillToolProvider();
  skillProvider.addTools([
    createSkillTool(skillRegistry),
    createSkillSearchTool(skillRegistry),
  ]);
  registry.registerProvider(skillProvider);

  return { skillRegistry };
}

/**
 * Create a custom ToolProvider from a list of tools.
 */
export function createToolProvider(
  id: string,
  name: string,
  tools: ToolDefinition[],
): ToolProvider {
  return {
    id,
    name,
    tools,
    register: () => {},
    unregister: () => {},
  };
}

/**
 * Register tools from a ToolProviderRegistry into an AgentKernel.
 */
export function registerProviderTools(
  kernel: AgentKernel,
  registry: ToolProviderRegistry,
): void {
  for (const tool of registry.getAllTools()) {
    kernel.registerTool(tool);
  }
}
