import type { AgentConfig, AgentRule, AgentRuleset, AgentPermissions } from "@vinhnt-sdk/schema";
import { wildcardMatch } from "@vinhnt-sdk/schema";
import { matchPermission } from "./evaluator.js";

/** Result of evaluating a resource against a ruleset. */
export type PermissionResult =
  | { decision: "allow" }
  | { decision: "deny"; reason: string }
  | { decision: "ask"; reason: string };

/** Normalize a permissions shorthand into a full {@link AgentRuleset}. */
export function normalizePermissions(p: AgentPermissions | undefined): AgentRuleset {
  if (!p) return {};
  if (p.ruleset) return { ...p.ruleset };
  const result: Record<string, unknown> = { inheritFromParent: true };
  const rules: AgentRule[] = [];
  if (p.allowedTools) {
    for (const t of p.allowedTools) rules.push({ effect: "allow", target: `tool.${t}` });
  }
  if (p.deniedTools) {
    for (const t of p.deniedTools) rules.push({ effect: "deny", target: `tool.${t}` });
  }
  if (rules.length > 0) result.rules = rules;
  if (p.allowedRisks) result.allowedRisks = [...p.allowedRisks];
  if (p.maxSteps !== undefined) result.maxSteps = p.maxSteps;
  if (p.maxTokens !== undefined) result.maxTokens = p.maxTokens;
  return result as AgentRuleset;
}

/** Merge a child ruleset over its parent (child deny rules override parent allows). */
export function mergeRulesets(child: AgentRuleset, parent: AgentRuleset): AgentRuleset {
  const parentRules = parent.rules ?? [];
  const childRules = child.rules ?? [];

  // Child deny rules override parent allow rules
  const childDenyTargets = new Set(
    childRules.filter((r) => r.effect === "deny").map((r) => r.target),
  );
  const filteredParent = parentRules.filter(
    (r) => !(r.effect === "allow" && childDenyTargets.has(r.target)),
  );

  const result: Record<string, unknown> = { inheritFromParent: child.inheritFromParent ?? true };
  result.rules = [...filteredParent, ...childRules];

  const mergedRisks = [...new Set([...(parent.allowedRisks ?? []), ...(child.allowedRisks ?? [])])];
  if (mergedRisks.length > 0) result.allowedRisks = mergedRisks;

  const ms = child.maxSteps !== undefined
    ? Math.min(child.maxSteps, parent.maxSteps ?? Infinity)
    : parent.maxSteps;
  if (ms !== undefined) result.maxSteps = ms;

  const mt = child.maxTokens !== undefined
    ? Math.min(child.maxTokens, parent.maxTokens ?? Infinity)
    : parent.maxTokens;
  if (mt !== undefined) result.maxTokens = mt;

  return result as AgentRuleset;
}

/** Compute the effective ruleset for an agent, merging ancestor permissions. */
export function resolveEffectivePermissions(
  agent: AgentConfig,
  ancestors?: AgentConfig[],
): AgentRuleset {
  const own = normalizePermissions(agent.permissions);
  if (!own.inheritFromParent) return own;
  if (ancestors && ancestors.length > 0) {
    let effective = own;
    for (const parent of ancestors) {
      const pRules = normalizePermissions(parent.permissions);
      effective = mergeRulesets(effective, pRules);
    }
    return effective;
  }
  return own;
}

/**
 * Evaluate a resource against a ruleset.
 *
 * Semantics (matching OpenCode's findLast):
 * - Rules are evaluated in order; last matching rule wins.
 * - "deny" blocks access.
 * - "ask" triggers human-in-the-loop.
 * - "allow" permits access.
 * - If no rule matches, the default is "ask" (safe default).
 *
 * When `paramPattern` is set on a rule, the rule only matches if
 * the JSON-stringified tool args also match the paramPattern glob.
 */
export function evaluatePermission(
  ruleset: AgentRuleset | undefined,
  resource: string,
  args?: Record<string, unknown>,
): PermissionResult {
  if (!ruleset?.rules || ruleset.rules.length === 0) {
    return { decision: "ask", reason: "No permission rules configured" };
  }

  const context = args ? JSON.stringify(args) : undefined;
  const { effect, matchedRule } = matchPermission(ruleset.rules, resource, context);

  if (!matchedRule) {
    return { decision: "ask", reason: `No matching rule for "${resource}"` };
  }

  const rule = matchedRule as AgentRule;
  switch (effect) {
    case "deny":
      return { decision: "deny", reason: rule.reason ?? `Denied by rule: ${resource}` };
    case "ask":
      return { decision: "ask", reason: rule.reason ?? `Approval needed for "${resource}"` };
    case "allow":
      return { decision: "allow" };
    default:
      return { decision: "ask", reason: rule.reason ?? `Unknown effect "${effect}" for "${resource}"` };
  }
}



/** Return whether the given risk level is allowed by the ruleset. */
export function checkRiskAllowed(
  ruleset: AgentRuleset | undefined,
  risk: string,
): boolean {
  if (!ruleset?.allowedRisks) return false;
  return ruleset.allowedRisks.some((r) => wildcardMatch(r, risk));
}