import type { RunId, RequestContext } from "@vinhnt-sdk/schema";
import { sanitizeEnv } from "@vinhnt-sdk/security";
import type { ToolContext, ToolRisk } from "@vinhnt-sdk/tools";
import type { StepExecutorPluginHooks } from "./hooks.js";
import type { PermissionGate } from "./permission-gate.js";
import type { ToolExecutionPlan } from "./step-executor.js";
import type { AgentConfig } from "@vinhnt-sdk/schema";

/** Dependencies required by {@link buildToolContext}. */
export interface ToolContextBuilderDeps {
  readonly pluginManager: StepExecutorPluginHooks | undefined;
  readonly permissionGate: PermissionGate;
  readonly currentAgent: AgentConfig | undefined;
  /** Tool risk used to evaluate the tool's own `ctx.ask` against the gate. */
  readonly toolRisk: ToolRisk;
}

/** Mutable ref through which tools attach observability metadata. */
export interface MetadataRef {
  current?: Record<string, unknown>;
}

export async function buildToolContext(
  tc: ToolExecutionPlan,
  runId: RunId,
  sessionId: string | undefined,
  ctx: RequestContext,
  runAbort: AbortController,
  compensationRef: { current: (() => Promise<void>) | null },
  metadataRef: MetadataRef,
  deps: ToolContextBuilderDeps,
): Promise<ToolContext> {
  // P1-G: default env is the sanitized whitelist, never raw process.env.
  let shellEnv: Record<string, string> = sanitizeEnv();
  const shellEnvResult = await deps.pluginManager?.fireHook("onShellEnv", { env: {} });
  if (shellEnvResult?.modified?.env) {
    shellEnv = { ...shellEnv, ...shellEnvResult.modified.env };
  }
  metadataRef.current = undefined;
  return {
    sessionId: sessionId ?? "",
    runId,
    agentId: deps.currentAgent?.id ?? "",
    agentName: deps.currentAgent?.profile.name ?? "",
    signal: runAbort.signal,
    env: shellEnv,
    parentContext: ctx,
    // P1-H: single approval path — gate decide first (saved patterns / rules),
    // then prompt via the approval store passing savePatterns for "always".
    ask: async (askInput) => {
      const decision = deps.permissionGate.checkTool(
        tc.toolName, deps.toolRisk, tc.args as Record<string, unknown>, deps.currentAgent,
      );
      if (decision.allowed) return "once";
      if (deps.permissionGate.checkSavedApproval(tc.toolName, deps.currentAgent?.id)) return "once";
      if (!decision.needsApproval) return "reject";
      return deps.permissionGate.askForTool(
        tc.toolName, tc.toolId, runId, sessionId ?? "",
        askInput.reason, deps.currentAgent?.id ?? "",
        ctx.traceId, deps.pluginManager,
        askInput.savePatterns,
      );
    },
    metadata: (input) => {
      metadataRef.current = {
        ...metadataRef.current,
        ...(input.metadata ?? {}),
        ...(input.title ? { title: input.title } : {}),
      };
    },
    setCompensation: (action) => { compensationRef.current = action; },
  };
}
