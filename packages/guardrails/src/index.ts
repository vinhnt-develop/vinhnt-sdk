/**
 * Guardrail tripwires for agent inputs/outputs.
 *
 * Inspired by OpenAI Agents SDK guardrail pattern.
 * Pattern-based safety checks that run before/after tool execution.
 *
 * @module guardrails
 * @packageDocumentation
 */

import type { GuardDecision } from "@vinhnt-sdk/guard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Guardrail scope - when the check runs */
export type GuardrailScope = "input" | "output" | "both";

/** Priority order - lower runs first */
export type GuardrailPriority = number;

/** A guardrail tripwire that checks inputs/outputs */
export interface Guardrail {
  readonly name: string;
  readonly scope: GuardrailScope;
  readonly priority: GuardrailPriority;
  check: (ctx: GuardrailContext) => Promise<GuardrailResult>;
}

/** Context passed to guardrails */
export interface GuardrailContext {
  readonly direction: "input" | "output";
  readonly toolName?: string;
  readonly content: unknown;
  readonly metadata?: Record<string, unknown>;
}

/** Result of a guardrail check */
export interface GuardrailResult {
  readonly passed: boolean;
  readonly decision: GuardDecision;
  readonly reason?: string;
  /** Optional modified content (e.g., redacted) */
  readonly modifiedContent?: unknown;
}

// ---------------------------------------------------------------------------
// Built-in Guardrails
// ---------------------------------------------------------------------------

/** Maximum input length guardrail */
export function maxLengthGuardrail(maxChars: number, source = "unknown"): Guardrail {
  return {
    name: "max-length",
    scope: "input",
    priority: 10,
    check: async (ctx) => {
      const text = typeof ctx.content === "string" ? ctx.content : JSON.stringify(ctx.content);
      if (text.length > maxChars) {
        return {
          passed: false,
          decision: "deny",
          reason: `${source}: input exceeds ${maxChars} chars (got ${text.length})`,
        };
      }
      return { passed: true, decision: "allow" };
    },
  };
}

/** Blocklist pattern guardrail - blocks content matching patterns */
export function blocklistGuardrail(patterns: RegExp[], name = "blocklist"): Guardrail {
  return {
    name,
    scope: "both",
    priority: 20,
    check: async (ctx) => {
      const text = typeof ctx.content === "string" ? ctx.content : JSON.stringify(ctx.content);
      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        if (pattern.test(text)) {
          return {
            passed: false,
            decision: "deny",
            reason: `${name}: blocked pattern matched`,
          };
        }
      }
      return { passed: true, decision: "allow" };
    },
  };
}

/** Secret detection guardrail - redacts detected secrets */
export function secretDetectionGuardrail(redactor: { redact: (text: string) => string }): Guardrail {
  return {
    name: "secret-detection",
    scope: "output",
    priority: 30,
    check: async (ctx) => {
      const text = typeof ctx.content === "string" ? ctx.content : JSON.stringify(ctx.content);
      const redacted = redactor.redact(text);
      if (redacted !== text) {
        return {
          passed: true,
          decision: "allow",
          reason: "secrets detected and redacted",
          modifiedContent: redacted,
        };
      }
      return { passed: true, decision: "allow" };
    },
  };
}

// ---------------------------------------------------------------------------
// Guardrail Runner
// ---------------------------------------------------------------------------

/**
 * Run guardrails in priority order with monotonic semantics.
 * Once a guardrail denies, subsequent guardrails cannot override.
 */
export async function runGuardrails(
  guardrails: Guardrail[],
  ctx: GuardrailContext,
): Promise<GuardrailResult> {
  const sorted = [...guardrails]
    .filter((g) => g.scope === "both" || g.scope === ctx.direction)
    .sort((a, b) => a.priority - b.priority);

  let current: GuardrailResult = { passed: true, decision: "allow" };

  for (const guardrail of sorted) {
    // Monotonic: once denied, stop
    if (current.decision === "deny") break;

    const result = await guardrail.check(ctx);

    // Deny takes precedence
    if (result.decision === "deny") {
      current = result;
      break;
    }

    // Escalate if not already denied
    if (result.decision === "escalate" && current.decision === "allow") {
      current = result;
    }

    // Carry forward modified content
    if (result.modifiedContent !== undefined) {
      current = { ...current, modifiedContent: result.modifiedContent };
    }
  }

  return current;
}
