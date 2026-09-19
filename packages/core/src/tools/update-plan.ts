/**
 * Plan tracking tool — allows agents to maintain structured task plans.
 *
 * @module tools/update-plan
 */

import { z } from "zod";
import { defineTool, type ToolDefinition } from "@vinhnt-sdk/tools";

export interface PlanStep {
  readonly id: string;
  readonly text: string;
  readonly status: "pending" | "in_progress" | "completed" | "failed";
  readonly createdAt: string;
  readonly completedAt?: string | undefined;
}

export interface Plan {
  readonly id: string;
  readonly steps: PlanStep[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly explanation?: string | undefined;
}

/**
 * Create an update_plan tool that lets agents track their task progress.
 *
 * The agent calls this tool to:
 * 1. Create a plan with multiple steps
 * 2. Mark steps as in_progress or completed
 * 3. Add explanation for each update
 *
 * @example
 * ```typescript
 * const tool = createUpdatePlanTool();
 * toolRegistry.register(tool);
 *
 * // Agent calls:
 * // update_plan({ steps: [
 *   // { text: "Read codebase", status: "completed" },
 *   // { text: "Implement feature", status: "in_progress" },
 *   // { text: "Write tests", status: "pending" },
 * // ], explanation: "Starting implementation" })
 * ```
 */
export function createUpdatePlanTool(): ToolDefinition {
  return defineTool({
    name: "update_plan",
    description: "Update the task plan with steps and their status. Use this to track your progress on multi-step tasks.",
    risk: "none" as const,
    input: z.object({
      steps: z.array(z.object({
        text: z.string().describe("Description of the step"),
        status: z.enum(["pending", "in_progress", "completed", "failed"]).describe("Current status"),
      })).describe("Updated list of plan steps"),
      explanation: z.string().optional().describe("Explanation for this plan update"),
    }),
    execute: async (input, ctx) => {
      const now = new Date().toISOString();

      const inProgressCount = input.steps.filter((s) => s.status === "in_progress").length;
      if (inProgressCount > 1) {
        return `Error: Only one step can be in_progress at a time. Found ${inProgressCount}.`;
      }

      const plan: Plan = {
        id: crypto.randomUUID(),
        steps: input.steps.map((s, i) => ({
          id: `step_${i}`,
          text: s.text,
          status: s.status,
          createdAt: now,
          ...(s.status === "completed" ? { completedAt: now } : {}),
        })),
        createdAt: now,
        updatedAt: now,
        explanation: input.explanation,
      };

      const lines = plan.steps.map((s, i) => {
        const icon = s.status === "completed" ? "✅"
          : s.status === "in_progress" ? "🔄"
          : s.status === "failed" ? "❌"
          : "⏳";
        return `${icon} ${i + 1}. ${s.text}`;
      });

      const completed = plan.steps.filter((s) => s.status === "completed").length;
      const total = plan.steps.length;

      return [
        `Plan (${completed}/${total} completed):`,
        "",
        ...lines,
        "",
        plan.explanation ? `Note: ${plan.explanation}` : "",
      ].filter(Boolean).join("\n");
    },
  }).toDefinition();
}

/**
 * Create a get_plan tool — returns the current plan state.
 */
export function createGetPlanTool(): ToolDefinition {
  return defineTool({
    name: "get_plan",
    description: "Get the current task plan and its progress.",
    risk: "none" as const,
    input: z.object({}),
    execute: async () => {
      return "No active plan. Use update_plan to create one.";
    },
  }).toDefinition();
}
