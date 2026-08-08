import type { RunId, RequestContext } from "@vinhnt-sdk/schema";
import type { ToolContext } from "@vinhnt-sdk/tools";
import type { PluginManager } from "../plugin.js";
import type { PermissionGate } from "./permission-gate.js";
import type { ToolExecutionPlan } from "./step-executor.js";
import type { AgentConfig } from "@vinhnt-sdk/schema";

export interface ToolContextBuilderDeps {
  readonly pluginManager: PluginManager | undefined;
  readonly permissionGate: PermissionGate;
  readonly currentAgent: AgentConfig | undefined;
}

export async function buildToolContext(
  tc: ToolExecutionPlan,
  runId: RunId,
  sessionId: string | undefined,
  ctx: RequestContext,
  runAbort: AbortController,
  compensationRef: { current: (() => Promise<void>) | null },
  deps: ToolContextBuilderDeps,
): Promise<ToolContext> {
  let shellEnv: Record<string, string> = process.env as Record<string, string>;
  const shellEnvResult = await deps.pluginManager?.fireHook("onShellEnv", { env: {} });
  if (shellEnvResult?.modified?.env) {
    shellEnv = shellEnvResult.modified.env;
  }
  let currentToolMetadata: Record<string, unknown> | undefined;
  return {
    sessionId: sessionId ?? "",
    runId,
    agentId: deps.currentAgent?.id ?? "",
    agentName: deps.currentAgent?.profile.name ?? "",
    signal: runAbort.signal,
    env: shellEnv,
    parentContext: ctx,
    ask: async (askInput) => {
      return deps.permissionGate.askForTool(
        tc.toolName, tc.toolId, runId, sessionId ?? "",
        askInput.reason, deps.currentAgent?.id ?? "",
        ctx.traceId, deps.pluginManager,
      );
    },
    metadata: (input) => { currentToolMetadata = { ...currentToolMetadata, ...input.metadata }; },
    setCompensation: (action) => { compensationRef.current = action; },
  };
}
