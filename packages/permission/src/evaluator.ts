import type { PermissionRule, PermissionEffect } from "./permission.js";
import { wildcardMatch } from "@vinhnt-sdk/schema";
import { normalize } from "node:path";

type AnyRule = { effect: PermissionEffect; action?: string; target?: string; paramPattern?: string };

/**
 * Normalize a path-like string for consistent glob matching.
 * Resolves `.`/`..` segments and normalizes backslashes to forward slashes.
 * Non-path strings are returned as-is.
 */
function normalizeMatchValue(value: string): string {
  if (!value || value.includes("\\")) {
    return value.replace(/\\/g, "/");
  }
  if (value.startsWith("/") || value.startsWith("./") || value.includes("../")) {
    try {
      return normalize(value).replace(/\\/g, "/");
    } catch {
      return value;
    }
  }
  return value;
}

/**
 * Evaluate a list of permission rules against a tool action and context.
 * Uses last-match-wins semantics: later rules override earlier ones.
 *
 * If no rule matches, returns "ask" by default (safe default).
 */
export function matchPermission(
  rules: readonly AnyRule[],
  action: string,
  context?: string,
): { effect: PermissionEffect; matchedRule?: AnyRule } {
  let matched: AnyRule | undefined;
  let effect: PermissionEffect = "ask";

  const normContext = context !== undefined ? normalizeMatchValue(context) : undefined;

  for (const rule of rules) {
    if (matchesRule(rule, action, normContext)) {
      matched = rule;
      effect = rule.effect;
    }
  }

  return { effect, ...(matched ? { matchedRule: matched } : {}) };
}

/**
 * Check if a rule matches the given action and context.
 * Supports dot-separated action patterns like "bash.read", "edit.*", etc.
 */
function normalizePattern(pattern: string): string {
  return pattern.includes("\\") ? pattern.replace(/\\/g, "/") : pattern;
}

function matchesRule(rule: AnyRule, action: string, context?: string): boolean {
  const target = normalizePattern(rule.action ?? rule.target ?? "");
  const paramPattern = rule.paramPattern !== undefined ? normalizePattern(rule.paramPattern) : undefined;

  if (wildcardMatch(target, action)) {
    if (paramPattern !== undefined && context !== undefined) {
      return wildcardMatch(paramPattern, context);
    }
    return true;
  }

  // Nested context match: action.context (e.g., "bash.git *")
  if (context && target.includes(".")) {
    const dotIdx = target.indexOf(".");
    const ruleAction = normalizePattern(target.slice(0, dotIdx));
    const ruleContext = normalizePattern(target.slice(dotIdx + 1));

    if (wildcardMatch(ruleAction, action) && wildcardMatch(ruleContext, context)) {
      if (paramPattern !== undefined) {
        return wildcardMatch(paramPattern, context);
      }
      return true;
    }
  }

  return false;
}

/**
 * Build a lookup-friendly permission set from raw config rules.
 * Handles flat syntax (`edit: deny`) and nested syntax (`bash: { "*": "ask", "git diff": "allow" }`).
 */
export function buildPermissionRules(
  config: Record<string, string | Record<string, string>>,
): PermissionRule[] {
  const rules: PermissionRule[] = [];

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string") {
      rules.push({ action: key, resource: "*", effect: value as PermissionEffect });
    } else if (typeof value === "object" && value !== null) {
      for (const [pattern, effect] of Object.entries(value)) {
        const action = pattern === "*" ? key : `${key}.${pattern}`;
        rules.push({ action, resource: "*", effect: effect as PermissionEffect });
      }
    }
  }

  return rules;
}
