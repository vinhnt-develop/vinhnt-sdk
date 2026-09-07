import { ToolProviderRegistry } from "@vinhnt-sdk/tools";
import type { ToolProvider, ToolDefinition } from "@vinhnt-sdk/tools";
import { AgentToolProvider, SkillToolProvider } from "@vinhnt-sdk/tools";
import { BuiltinToolProvider } from "./builtin-provider.js";
import type { AgentKernel } from "../kernel/kernel.js";
import { createSpawnAgentTool } from "../agent/spawn-agent-tool.js";
import { createDelegateTool } from "../agent/delegate-tool.js";
import { createCreateAgentTool } from "../agent/create-agent-tool.js";
import { createListAgentsTool } from "../agent/list-agents-tool.js";

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

/**
 * Wire agent tools and skill tools into the provider registry.
 *
 * Call this AFTER the kernel is created — agent tools need the kernel instance.
 *
 * @example
 * ```ts
 * const registry = await createToolProviderRegistry(config);
 * const kernel = new AgentKernel({ ...config, toolProviderRegistry: registry });
 * wireAgentAndSkillTools(kernel, registry);
 * ```
 */
export async function wireAgentAndSkillTools(
  kernel: AgentKernel,
  registry: ToolProviderRegistry,
): Promise<void> {
  // Wire agent tools
  const agentProvider = new AgentToolProvider();
  agentProvider.addTools([
    createSpawnAgentTool(kernel),
    createDelegateTool(kernel),
    createCreateAgentTool(kernel),
    createListAgentsTool(kernel),
  ]);
  registry.registerProvider(agentProvider);

  // Wire skill tools (if available)
  try {
    const { InMemorySkillDefRegistry } = await import("../skill/skill-def-registry.js");
    const { createSkillTool, createSkillSearchTool } = await import("../skill/skill-tool.js");

    const skillRegistry = new InMemorySkillDefRegistry(/* parser */ undefined as never, []);
    const skillProvider = new SkillToolProvider();
    skillProvider.addTools([
      createSkillTool(skillRegistry),
      createSkillSearchTool(skillRegistry),
    ]);
    registry.registerProvider(skillProvider);
  } catch {
    // Skill system not available, skip
  }
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
