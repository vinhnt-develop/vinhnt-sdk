import type { RunId, RequestId, AgentConfig, PermissionRequest, AgentRule, RunEvent } from "@vinhnt-sdk/schema";
import type { ToolRisk, PermissionReply } from "@vinhnt-sdk/tools";
import type { PluginManager } from "../plugin.js";
import type { ApprovalStore } from "../permission/saved.js";
import type { RunEventStore } from "../session/store.js";
import type { PermissionRule } from "../permission/permission.js";
import type { EventBus } from "../event-bus/types.js";
import { evaluatePermission, checkRiskAllowed } from "../permission/checker.js";
import { wildcardMatch } from "@vinhnt-sdk/schema";
import { buildPermissionRules } from "../permission/evaluator.js";
import { commandPattern } from "@vinhnt-sdk/tools";
import { PermissionRequested, PermissionReplied } from "@vinhnt-sdk/schema";

export type ApprovalDecision = "allow" | "deny" | "approval_required";

export interface DynamicRule {
  toolName: string;
  pattern: string;
  decision: "allow" | "deny";
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  needsApproval?: boolean;
}

export interface PermissionGateDeps {
  readonly store: RunEventStore;
  readonly eventBus?: EventBus;
  readonly pluginManager: PluginManager | undefined;
  readonly approvalStore: ApprovalStore | undefined;
  readonly autoApprovalEnabled?: boolean | undefined;
}

const RISK_DECISIONS: Record<ToolRisk, ApprovalDecision> = {
  read: "allow",
  write: "approval_required",
  destructive: "deny",
  external: "approval_required",
};

function extractContextPattern(toolName: string, args?: Record<string, unknown>): string {
  if (!args || typeof args !== "object") return "*";
  if (toolName === "execute_command" || toolName === "bash") {
    const cmd = args.command;
    if (typeof cmd === "string" && cmd.trim()) return commandPattern(cmd);
  }
  const path = args.filePath ?? args.path;
  if (typeof path === "string" && path.trim()) return path;
  return "*";
}

/** Split a `Tool(glob)` permission-pattern string into its parts. Returns null if malformed. */
function parseToolPattern(expr: string): { toolName: string; pattern: string } | null {
  const m = /^\s*([A-Za-z0-9_.-]+)\s*\(\s*(.*?)\s*\)\s*$/.exec(expr);
  if (!m) {
    const bare = expr.trim();
    if (!bare) return null;
    return { toolName: bare, pattern: "*" };
  }
  return { toolName: m[1]!, pattern: m[2] || "*" };
}

export class PermissionGate {
  private globalPermissionRules?: AgentRule[];
  private dynamicRules: DynamicRule[] = [];
  private riskOverrides?: Partial<Record<ToolRisk, ApprovalDecision>>;
  private topLevelRules: { toolName: string; pattern: string; decision: "allow" | "deny" | "ask" }[] = [];
  private autoApproval: boolean;

  constructor(private readonly deps: PermissionGateDeps) {
    this.autoApproval = deps.autoApprovalEnabled ?? false;
  }

  /** Toggle auto-approval at runtime (mirrors config.autoApprovalEnabled). */
  setAutoApprovalEnabled(enabled: boolean): void {
    this.autoApproval = enabled;
  }

  /** Parse and apply config-level permission rules (OpenCode-style nested `{ tool: "allow|deny|ask" }`). */
  setGlobalRules(configRules: Record<string, string | Record<string, string>>): void {
    const raw = buildPermissionRules(configRules);
    this.globalPermissionRules = raw.map((r: PermissionRule) => ({
      effect: r.effect,
      target: r.action,
      ...(r.resource !== "*" ? { paramPattern: r.resource } : {}),
    })) as AgentRule[];
  }

  /**
   * Apply top-level `allow`/`deny`/`ask` pattern lists (OpenCode-style
   * `"ToolName(glob)"` strings). These take precedence over risk defaults and
   * agent-level allowed/denied tool lists.
   */
  setTopLevelRules(rules: Record<"allow" | "deny" | "ask", string[]>): void {
    const parsed: { toolName: string; pattern: string; decision: "allow" | "deny" | "ask" }[] = [];
    for (const decision of ["allow", "deny", "ask"] as const) {
      for (const expr of rules[decision] ?? []) {
        if (typeof expr !== "string") continue;
        const parts = parseToolPattern(expr);
        if (parts) parsed.push({ ...parts, decision });
      }
    }
    this.topLevelRules = parsed;
  }

  /** Register a user-approved dynamic rule (last-match-wins over risk defaults). */
  addDynamicRule(rule: DynamicRule): void {
    this.dynamicRules.push(rule);
  }

  /** Override risk-level defaults (read→allow, write→approval, destructive→deny). */
  setRiskOverrides(overrides?: Partial<Record<ToolRisk, ApprovalDecision>>): void {
    this.riskOverrides = overrides;
  }

  /**
   * Evaluate whether a tool call is allowed.
   * 4-phase gate: global rules → agent permissions → dynamic rules → risk defaults.
   * Returns { allowed, reason, needsApproval }.
   */
  checkTool(name: string, risk: ToolRisk, args?: Record<string, unknown>, agent?: AgentConfig): PermissionCheckResult {
    // Phase 1: Global config-level rules (OpenCode-style nested patterns)
    if (this.globalPermissionRules && this.globalPermissionRules.length > 0) {
      const globalResult = evaluatePermission({ rules: this.globalPermissionRules }, `tool.${name}`, args);
      if (globalResult.decision === "deny") return { allowed: false, reason: globalResult.reason };
      if (globalResult.decision === "ask") return { allowed: false, reason: globalResult.reason, needsApproval: true };
    }

    // Phase 1.5: Top-level allow/deny/ask pattern lists ("Tool(glob)")
    if (this.topLevelRules.length > 0) {
      const pattern = extractContextPattern(name, args);
      let matched: { toolName: string; pattern: string; decision: "allow" | "deny" | "ask" } | undefined;
      for (const rule of this.topLevelRules) {
        if (rule.toolName === name && wildcardMatch(rule.pattern, pattern)) {
          matched = rule; // last-match-wins
        }
      }
      if (matched) {
        if (matched.decision === "deny") return { allowed: false, reason: `Tool "${name}" is denied` };
        if (matched.decision === "ask") return { allowed: false, reason: `Tool "${name}" requires approval`, needsApproval: true };
        return { allowed: true, reason: "Allowed by configured rule" };
      }
    }

    // Phase 2: Agent-specific permissions
    const perms = agent?.permissions;
    if (perms) {
      if (perms.ruleset) {
        const result = evaluatePermission(perms.ruleset, `tool.${name}`, args);
        if (result.decision === "deny") return { allowed: false, reason: result.reason };
        if (result.decision === "ask") return { allowed: false, reason: result.reason, needsApproval: true };
        if (perms.ruleset.allowedRisks && !checkRiskAllowed(perms.ruleset, risk)) {
          return { allowed: false, reason: `Tool "${name}" has risk "${risk}" which exceeds agent's allowed risks` };
        }
        return { allowed: true };
      }

      if (perms.deniedTools?.some((p) => wildcardMatch(p, name))) {
        return { allowed: false, reason: `Tool "${name}" is denied for this agent` };
      }
      if (perms.allowedTools && !perms.allowedTools.some((p) => wildcardMatch(p, name))) {
        return { allowed: false, reason: `Tool "${name}" is not in the allowed tools list` };
      }
      if (perms.allowedRisks && !perms.allowedRisks.includes(risk)) {
        return { allowed: false, reason: `Tool "${name}" has risk "${risk}" which exceeds agent's allowed risks` };
      }
    }

    // Phase 3: Dynamic rules (last-match-wins, same as ToolPolicy)
    if (this.dynamicRules.length > 0) {
      const pattern = extractContextPattern(name, args);
      for (let i = this.dynamicRules.length - 1; i >= 0; i--) {
        const rule = this.dynamicRules[i]!;
        if (rule.toolName === name && wildcardMatch(rule.pattern, pattern)) {
          if (rule.decision === "deny") return { allowed: false, reason: `Tool "${name}" denied by dynamic rule` };
          return { allowed: true };
        }
      }
    }

    // Phase 4: Risk-based default fallback (merged from ToolPolicy)
    const decision = this.riskOverrides?.[risk] ?? RISK_DECISIONS[risk];
    if (decision === "deny") return { allowed: false, reason: `Tool "${name}" (risk: ${risk}) is denied` };
    if (decision === "approval_required") return { allowed: false, needsApproval: true, reason: `Tool "${name}" (risk: ${risk}) requires approval` };
    return { allowed: true };
  }

  /** Check whether combined token count stays within agent's maxTokens limit. */
  checkMaxTokens(inputTokens: number, outputTokens: number, agent?: AgentConfig): boolean {
    const perms = agent?.permissions;
    if (!perms?.maxTokens) return true;
    return (inputTokens + outputTokens) <= perms.maxTokens;
  }

  /** Check whether step count is within agent's maxSteps limit. */
  checkMaxSteps(step: number, agent?: AgentConfig): boolean {
    const perms = agent?.permissions;
    if (!perms?.maxSteps) return true;
    return step < perms.maxSteps;
  }

  /**
   * Ask the user to approve a tool call.
   * Routes through ApprovalStore and plugin hooks.
   * When reply is "always", `savePatterns` are persisted as allow rules so
   * future matching calls auto-approve (without opening the whole tool).
   * Returns "once", "always", or "reject".
   */
  async askForTool(
    toolName: string,
    _toolId: string,
    runId: RunId,
    _sessionId: string,
    reason: string,
    _agentId: string,
    traceId: string,
    pluginManager?: PluginManager,
    savePatterns?: readonly string[],
  ): Promise<PermissionReply> {
    if (this.autoApproval) return "once";

    const reply = await this.askViaApprovalStore(toolName, runId, reason, traceId, pluginManager);

    if (reply === "always" && savePatterns && savePatterns.length > 0) {
      for (const pattern of savePatterns) {
        if (!pattern || pattern === "*") continue;
        this.addDynamicRule({ toolName, pattern, decision: "allow" });
      }
    }
    return reply;
  }

  private async askViaApprovalStore(
    toolName: string,
    runId: RunId,
    reason: string,
    traceId: string,
    pluginManager?: PluginManager,
  ): Promise<PermissionReply> {
    const requestId = crypto.randomUUID() as RequestId;
    const req: PermissionRequest = {
      id: requestId,
      runId,
      toolName,
      resource: toolName,
      reason,
      prompt: reason,
      occurredAt: new Date().toISOString(),
    };
    
    // Persist permission.requested to store (sync for tests) AND publish to bus
    await this.deps.store.append({
      id: crypto.randomUUID(), runId, type: "permission.requested",
      occurredAt: new Date().toISOString(), traceId,
      data: { requestId, toolName, resource: toolName, reason, prompt: reason },
    } as RunEvent);
    
    if (this.deps.eventBus) {
      this.deps.eventBus.publish(PermissionRequested, {
        requestId, toolName, resource: toolName, reason, prompt: reason
      }, { traceId, aggregateId: runId });
    }

    let reply: PermissionReply = "reject";
    const hookResult = await pluginManager?.fireHook("onPermissionAsk", {
      permission: `tool.${toolName}`,
      resource: toolName,
      reason,
    });
    if (hookResult?.modified?.reply) {
      reply = hookResult.modified.reply as PermissionReply;
    } else if (this.deps.approvalStore) {
      reply = await this.deps.approvalStore.awaitReply(req);
    }

    // Persist permission.replied to store (sync for tests) AND publish to bus
    await this.deps.store.append({
      id: crypto.randomUUID(), runId, type: "permission.replied",
      occurredAt: new Date().toISOString(), traceId,
      data: { requestId, reply },
    } as RunEvent);
    
    if (this.deps.eventBus) {
      this.deps.eventBus.publish(PermissionReplied, {
        requestId, reply
      }, { traceId, aggregateId: runId });
    }
    return reply;
  }

  /** Check whether a previously saved approval exists for this tool+agent. Returns false if a rejection exists. */
  checkSavedApproval(toolName: string, agentId?: string): boolean {
    const store = this.deps.approvalStore;
    if (!store) return false;
    if (store.checkRejection(`tool.${toolName}`, toolName, agentId)) return false;
    return store.checkApproval(`tool.${toolName}`, toolName, agentId);
  }

  /** Return all registered dynamic rules (saved allow/deny policies). */
  getDynamicRules(): readonly DynamicRule[] {
    return [...this.dynamicRules];
  }

  /** Persist a saved approval so future calls skip the ask dialog. */
  saveApproval(toolName: string, agentId?: string): void {
    this.deps.approvalStore?.saveApproval({
      resource: `tool.${toolName}`,
      action: toolName,
      ...(agentId ? { agentId } : {}),
    });
  }

  /** Persist a saved rejection so future calls are auto-denied. */
  saveRejection(toolName: string, agentId?: string): void {
    this.deps.approvalStore?.saveRejection(
      `tool.${toolName}`, toolName, agentId,
    );
  }
}
