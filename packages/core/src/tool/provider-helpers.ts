import { ToolProviderRegistry } from "@vinhnt-sdk/tools";
import type { ToolProvider, ToolDefinition } from "@vinhnt-sdk/tools";
import { BuiltinToolProvider } from "./builtin-provider.js";
import type { AgentKernel } from "../kernel/kernel.js";

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
    webSearchApiKey: config.webSearchApiKey,
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
