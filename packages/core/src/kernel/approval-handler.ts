import type { RunId, RequestContext } from "@vinhnt-sdk/schema";
import type { ChatMessage } from "../model.js";
import type { ToolContext } from "@vinhnt-sdk/tools";
import type { PluginManager } from "../plugin.js";
import type { PermissionGate, PermissionCheckResult } from "./permission-gate.js";
import type { ToolExecutionPlan } from "./step-executor.js";
import type { AgentConfig } from "@vinhnt-sdk/schema";
import { toolDomain } from "./kernel-utils.js";

export interface ApprovalHandlerDeps {
  readonly store: { emitEvent(event: Omit<import("@vinhnt-sdk/schema").KnownRunEvent, "sequence">, persist?: boolean): Promise<void> };
  readonly permissionGate: PermissionGate;
  readonly pluginManager: PluginManager | undefined;
  currentAgent: AgentConfig | undefined;
}

export async function handleApproval(
  permResult: PermissionCheckResult,
  tc: ToolExecutionPlan,
  toolCtx: ToolContext,
  runId: RunId,
  ctx: RequestContext,
  _sessionId: string | undefined,
  messages: ChatMessage[],
  deps: ApprovalHandlerDeps,
): Promise<boolean> {
  if (!permResult.needsApproval || permResult.allowed) return true;

  const savedOk = deps.permissionGate.checkSavedApproval(tc.toolName, deps.currentAgent?.id);
  if (savedOk) return true;

  const reply = await toolCtx.ask({
    permission: `tool.${tc.toolName}`,
    resource: tc.toolName,
    reason: permResult.reason!,
  });

  if (reply === "reject") {
    deps.permissionGate.saveRejection(tc.toolName, deps.currentAgent?.id);
    await deps.store.emitEvent({
      id: crypto.randomUUID(), runId, type: "tool.failed",
      occurredAt: new Date().toISOString(), traceId: ctx.traceId,
      data: { toolId: tc.toolId, toolName: tc.toolName, domain: toolDomain(tc.toolName), decision: "deny", error: `Tool "${tc.toolName}" rejected by user` },
    });
    messages.push({ role: "tool", toolCallId: tc.toolId, content: `Error: Tool "${tc.toolName}" rejected by user` });
    return false;
  }

  if (reply === "always") {
    deps.permissionGate.saveApproval(tc.toolName, deps.currentAgent?.id);
  }
  return true;
}
