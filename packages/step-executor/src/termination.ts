import type { RunId } from "@vinhnt-sdk/schema";

/**
 * ── Termination policy (Phase 4) ─────────────────────────────────────────
 * A declarative, per-run exit strategy layered on top of the plain loop:
 * hard step cap, token budget, and stop conditions / hooks that are verified
 * after each step. The loop stays the unit of execution; the policy decides
 * when it may stop early (success) or must be cut (budget exhausted).
 */

/** Result of one tool invocation, used by stop-condition evaluation. */
export interface ToolCallOutcome {
  readonly toolName: string;
  readonly output?: string;
  readonly exitCode?: number;
}

/** Read-only snapshot the loop exposes to stop conditions / hooks each step. */
export interface StepVerificationContext {
  readonly runId: RunId;
  readonly step: number;
  readonly finalOutput: string;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly lastStepToolOutcomes: readonly ToolCallOutcome[];
}

/** Declarative condition that can end the loop early. */
export type StopCondition =
  | { kind: "tool-output"; tool: string; expect: { exitCode?: number } }
  | { kind: "file-unchanged"; path: string }
  | { kind: "screenshot" }
  | { kind: "llm-judge"; agent: string; criteria: readonly string[] }
  | { kind: "state"; predicate: (ctx: StepVerificationContext) => boolean };

/** Hard limits and stop conditions that terminate a run. */
export interface TerminationPolicy {
  /** Per-run hard step cap (overrides the kernel default when set). */
  readonly maxSteps?: number;
  /** Token budget — the loop is cut when any limit is exceeded. */
  readonly budgetTokens?: { readonly input?: number; readonly output?: number; readonly total?: number };
  /** Declarative conditions checked after each step (e.g. stop-when-build-green). */
  readonly stopConditions?: readonly StopCondition[];
  /** Deterministic async hooks — return "stop" to end the run early as success. */
  readonly stopHooks?: readonly { onStepEnded(ctx: StepVerificationContext): Promise<"continue" | "stop"> }[];
  /** Evaluator-optimizer: id of the judge agent used for `llm-judge` conditions. */
  readonly evaluatorAgent?: string;
}

/** Normalize an arbitrary tool result into an outcome (exitCode from structured output). */
export function toToolCallOutcome(toolName: string, output: unknown): ToolCallOutcome {
  if (typeof output === "string") return { toolName, output };
  if (output && typeof output === "object") {
    const structured = output as { output?: unknown; exitCode?: unknown };
    const text = typeof structured.output === "string" ? structured.output : undefined;
    const code = typeof structured.exitCode === "number" ? structured.exitCode : undefined;
    return {
      toolName,
      ...(text !== undefined ? { output: text } : {}),
      ...(code !== undefined ? { exitCode: code } : {}),
    };
  }
  return { toolName };
}

/**
 * Evaluate declarative stop conditions against a step context. Returns the
 * first matching condition, or undefined to continue. Kinds that need external
 * infrastructure (file-unchanged, screenshot, llm-judge) return undefined here;
 * wire them through `stopHooks` / an evaluator agent instead.
 */
export function evaluateStopConditions(
  conditions: readonly StopCondition[],
  ctx: StepVerificationContext,
): StopCondition | undefined {
  for (const condition of conditions) {
    if (matchesCondition(condition, ctx)) return condition;
  }
  return undefined;
}

function matchesCondition(condition: StopCondition, ctx: StepVerificationContext): boolean {
  switch (condition.kind) {
    case "tool-output": {
      const outcome = ctx.lastStepToolOutcomes.find((o) => o.toolName === condition.tool);
      if (!outcome) return false;
      if (condition.expect?.exitCode !== undefined) return outcome.exitCode === condition.expect.exitCode;
      return outcome.output !== undefined;
    }
    case "state":
      return condition.predicate(ctx);
    case "file-unchanged":
    case "screenshot":
    case "llm-judge":
      return false;
    default:
      return false;
  }
}

/**
 * Build the judge prompt for an `llm-judge` stop condition. The evaluator is
 * asked to return a single verdict, not a long essay — cheap enough to run
 * every step.
 */
export function buildJudgeMessages(
  condition: Extract<StopCondition, { kind: "llm-judge" }>,
  ctx: StepVerificationContext,
  evaluatorAgent?: string,
): { role: "system" | "user"; content: string }[] {
  const persona = evaluatorAgent ? ` (agent "${evaluatorAgent}")` : "";
  const toolLog = ctx.lastStepToolOutcomes.length > 0
    ? ctx.lastStepToolOutcomes
        .map((o) => `- ${o.toolName}${o.exitCode !== undefined ? ` (exit ${o.exitCode})` : ""}${o.output ? `: ${String(o.output).slice(0, 300)}` : ""}`)
        .join("\n")
    : "(no tool output this step)";
  return [
    {
      role: "system",
      content: `You are an evaluator judge${persona}. Given the criteria and the evidence, decide whether the task is complete. Respond with ONLY a valid JSON object of the form {"met": true} or {"met": false}. No prose.`,
    },
    {
      role: "user",
      content: [
        `Criteria (ALL must be met):`,
        condition.criteria.map((c) => `- ${c}`).join("\n"),
        "",
        "Evidence:",
        `Final output: ${ctx.finalOutput || "(none yet)"}`,
        `Tool outputs this step:\n${toolLog}`,
        "",
        "Are all criteria met? Reply JSON only.",
      ].join("\n"),
    },
  ];
}

/** Parse a judge verdict (`{"met": true|false}`) tolerantly. */
export function parseJudgeVerdict(content: string): { met: boolean } {
  const match = content.match(/"met"\s*:\s*(true|false)/i);
  if (match) return { met: match[1]!.toLowerCase() === "true" };
  return { met: false };
}
