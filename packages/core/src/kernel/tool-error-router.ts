import type { RunId, RequestContext } from "@vinhnt-sdk/schema";
import { sanitizeEnv } from "@vinhnt-sdk/security";
import type { ChatMessage } from "../model.js";
import { normalize } from "node:path";
import type { ToolContext, ToolDefinition } from "@vinhnt-sdk/tools";
import type { PluginManager } from "../plugin.js";
import type { PermissionGate } from "./permission-gate.js";
import type { RecentCall } from "./kernel-utils.js";
import { hashArgs, raceWithAbort, toolDomain } from "./kernel-utils.js";
import { ToolPermissionDenied, RunAbortedError } from "@vinhnt-sdk/schema";
import type { ToolExecutionPlan } from "./step-executor.js";
import type { ModelProvider } from "../model.js";

export interface ToolErrorRouterDeps {
  readonly store: { emitEvent(event: Omit<import("@vinhnt-sdk/schema").KnownRunEvent, "sequence">, persist?: boolean): Promise<void> };
  readonly addSessionMessage: (sessionId: string | undefined, role: string, content: string, extra?: Record<string, unknown>) => Promise<void>;
  readonly pluginManager: PluginManager | undefined;
  readonly permissionGate: PermissionGate;
  readonly selfCorrectOnFailure: boolean;
  readonly externalDirectoryAccess?: boolean;
  readonly workspaceRoot?: string;
  readonly findTool: (name: string, runId?: RunId) => ToolDefinition | undefined;
  currentAgent: import("@vinhnt-sdk/schema").AgentConfig | undefined;
  runSelfCorrection: (
    tc: ToolExecutionPlan, messages: ChatMessage[], recentCalls: RecentCall[],
    step: number, runId: RunId, ctx: RequestContext,
    runAbort: AbortController, toolCtx: ToolContext, errorMsg: string,
    runModel: ModelProvider,
  ) => Promise<void>;
}

function checkExternalPathsLocal(toolName: string, args: unknown, workspaceRoot: string): string | undefined {
  const PATH_AWARE_TOOLS = new Set(["read_file", "write_file", "edit_file", "apply_patch", "list_directory", "glob_files", "grep_files", "shell"]);
  if (!PATH_AWARE_TOOLS.has(toolName)) return undefined;
  const input = args as Record<string, unknown> | undefined;
  if (!input) return undefined;
  const normalizedRoot = workspaceRoot.replace(/\\/g, "/") + "/";
  const pathCandidates = [input.filePath, input.path, input.dirPath].filter((p): p is string => typeof p === "string");
  for (const p of pathCandidates) {
    const absRaw: string = p.startsWith("/") || /^[A-Za-z]:[/\\]/.test(p) ? p : workspaceRoot + "/" + p;
    const absPath = normalize(absRaw).replace(/\\/g, "/");
    if (!absPath.startsWith(normalizedRoot)) {
      return `references path outside workspace: "${p}" (${absPath} not in ${normalizedRoot})`;
    }
  }
  return undefined;
}

export async function handleToolError(
  err: unknown,
  tc: ToolExecutionPlan,
  _tool: ToolDefinition,
  messages: ChatMessage[],
  step: number,
  runId: RunId,
  ctx: RequestContext,
  runAbort: AbortController,
  toolCtx: ToolContext,
  sessionId: string | undefined,
  recentCalls: RecentCall[],
  runModel: ModelProvider,
  deps: ToolErrorRouterDeps,
): Promise<void> {
  const isPermissionDenied = err instanceof ToolPermissionDenied;
  if (err instanceof RunAbortedError) return;

  const errorMsg = err instanceof Error ? err.message : String(err);

  if (tc.toolName === "edit_file" && errorMsg.includes("not found") && !isPermissionDenied) {
    if (await tryReadFileFallback(tc, runAbort, runId, ctx, sessionId, messages, errorMsg, runModel, deps)) {
      recentCalls.push({ id: tc.toolName, args: tc.args, argsKey: hashArgs(tc.args) });
      return;
    }
  }

  await deps.store.emitEvent({
    id: crypto.randomUUID(), runId, type: "tool.failed",
    occurredAt: new Date().toISOString(), traceId: ctx.traceId,
    data: { toolId: tc.toolId, toolName: tc.toolName, domain: toolDomain(tc.toolName), error: errorMsg },
  });

  await deps.pluginManager?.fireHook("onToolFailed", {
    toolId: tc.toolId, toolName: tc.toolName, error: errorMsg,
  });

  messages.push({ role: "tool", toolCallId: tc.toolId, content: `Error: ${errorMsg}` });
  await deps.addSessionMessage(sessionId, "tool", `Error: ${errorMsg}`, {
    toolCallId: tc.toolId, model: runModel.model,
  });

  if (!isPermissionDenied && deps.selfCorrectOnFailure) {
    await deps.runSelfCorrection(tc, messages, recentCalls, step, runId, ctx, runAbort, toolCtx, errorMsg, runModel);
  }
}

export async function tryReadFileFallback(
  tc: ToolExecutionPlan,
  runAbort: AbortController,
  runId: RunId,
  ctx: RequestContext,
  sessionId: string | undefined,
  messages: ChatMessage[],
  errorMsg: string,
  runModel: ModelProvider,
  deps: ToolErrorRouterDeps,
): Promise<boolean> {
  try {
    const fallbackTool = deps.findTool("read_file", runId);
    if (!fallbackTool) return false;

    const fbInput = { filePath: (tc.args as Record<string, unknown>)?.filePath ?? "" };

    if (deps.externalDirectoryAccess !== true && deps.workspaceRoot) {
      const extPath = checkExternalPathsLocal("read_file", fbInput, deps.workspaceRoot);
      if (extPath) return false;
    }
    const fbPermResult = deps.permissionGate.checkTool(
      "read_file", fallbackTool.risk, undefined, deps.currentAgent,
    );
    if (!fbPermResult.allowed && !fbPermResult.needsApproval) return false;
    if (fbPermResult.needsApproval) {
      const reply = await deps.permissionGate.askForTool(
        "read_file", tc.toolId, runId, sessionId ?? "",
        `Fallback read_file for edit_file after error: ${errorMsg.substring(0, 100)}`,
        deps.currentAgent?.id ?? "", ctx.traceId,
      );
      if (reply === "reject") return false;
    }

    const toolCtx: ToolContext = {
      sessionId: sessionId ?? "", runId,
      agentId: deps.currentAgent?.id ?? "",
      agentName: deps.currentAgent?.profile.name ?? "",
      signal: runAbort.signal, env: sanitizeEnv(),
      ask: async (input) => {
        return deps.permissionGate.askForTool(
          "read_file", tc.toolId, runId, sessionId ?? "",
          input.reason, deps.currentAgent?.id ?? "",
          ctx.traceId, deps.pluginManager,
        );
      },
      metadata: () => {},
      setCompensation: () => {},
    };
    const fbOutput = await raceWithAbort(fallbackTool.execute(fbInput, toolCtx), runAbort.signal, runId);
    const fbContent = typeof fbOutput === "string" ? fbOutput : JSON.stringify(fbOutput);

    await deps.store.emitEvent({
      id: crypto.randomUUID(), runId, type: "tool.completed",
      occurredAt: new Date().toISOString(), traceId: ctx.traceId,
      data: { toolId: tc.toolId, toolName: "read_file", domain: toolDomain("read_file"), output: fbOutput },
    });

    messages.push({
      role: "tool", toolCallId: tc.toolId,
      content: `Error: ${errorMsg}\n\nCurrent file content:\n${fbContent}`,
    });
    await deps.addSessionMessage(sessionId, "tool", `Error: ${errorMsg}\n\nCurrent file content:\n${fbContent}`, {
      toolCallId: tc.toolId, model: runModel.model,
    });

    await deps.pluginManager?.fireHook("onToolFailed", {
      toolId: tc.toolId, toolName: tc.toolName, error: errorMsg,
    });
    return true;
  } catch {
    return false;
  }
}
