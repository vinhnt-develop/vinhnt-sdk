import { z } from "zod";
import { defineTool } from "./index.js";
import type { PlanApprovalStep } from "@vinhnt-sdk/schema";
import type {
  PlanApprovalRequest,
  PlanApprovalReply,
  PlanDecision,
} from "./plan-store.js";

/** Resolver that returns the user's decision for a {@link PlanApprovalRequest}. */
export type PlanApprovalHandler = (request: PlanApprovalRequest) => Promise<PlanApprovalReply>;

/** Options for {@link createSubmitPlanTool}. */
export interface SubmitPlanToolOptions {
  /**
   * App-supplied resolver. When omitted, the tool uses `ctx.askPlan`
   * (the host-owned durable request/reply path).
   */
  handler?: PlanApprovalHandler;
  /** Hard timeout in ms for the whole review. */
  timeoutMs?: number;
}

const StepSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1),
  status: z.string().optional(),
});

const PlanSchema = z.object({
  title: z.string().min(1).optional(),
  steps: z.array(StepSchema).min(1).max(50),
  explanation: z.string().optional(),
});

/** Format the decision into a short text answer the model can read. */
function formatDecision(reply: PlanApprovalReply): string {
  switch (reply.decision) {
    case "approve":
      return "User approved the plan. Proceed with the steps.";
    case "request_changes":
      return reply.feedback
        ? `User requested changes to the plan: ${reply.feedback}`
        : "User requested changes to the plan.";
    default:
      return "Plan review cancelled.";
  }
}

/**
 * Create the `submit_plan` tool that presents a plan to the user for approval
 * and blocks until they decide (approve / request changes / cancel). Prefers
 * the host-owned `ctx.askPlan` request/reply path; a
 * {@link PlanApprovalHandler} may be injected instead.
 */
export function createSubmitPlanTool(
  handlerOrOptions?: PlanApprovalHandler | SubmitPlanToolOptions,
) {
  const options: SubmitPlanToolOptions =
    typeof handlerOrOptions === "function"
      ? { handler: handlerOrOptions }
      : (handlerOrOptions ?? {});

  return defineTool<unknown, unknown>({
    name: "submit_plan",
    description:
      "Present a plan (an ordered list of steps) to the user for approval before executing it. " +
      "Blocks until the user approves, requests changes, or cancels. Use this for multi-step or " +
      "risky work so the user can confirm the approach; the returned decision tells you how to proceed.",
    risk: "external",
    input: z.unknown(),
    jsonSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short plan title" },
        explanation: { type: "string", description: "Why this plan (optional)" },
        steps: {
          type: "array",
          description: "Ordered plan steps",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Stable step id (optional)" },
              text: { type: "string", description: "The step to perform" },
              status: { type: "string", description: "Optional status hint" },
            },
            required: ["text"],
          },
        },
      },
      required: ["steps"],
    },
    async execute(raw, ctx) {
      const parsed = PlanSchema.safeParse(raw ?? {});
      if (!parsed.success) {
        return { error: `Invalid plan input: ${parsed.error.issues[0]?.message ?? "validation failed"}` };
      }
      const input = parsed.data;
      const steps: PlanApprovalStep[] = input.steps.map((s) => ({
        text: s.text,
        ...(s.id !== undefined ? { id: s.id } : {}),
        ...(s.status !== undefined ? { status: s.status } : {}),
      }));

      const context = ctx as
        | {
            sessionId?: string;
            runId?: string;
            askPlan?: (i: {
              steps: readonly PlanApprovalStep[];
              title?: string;
              explanation?: string;
              timeoutMs?: number;
            }) => Promise<PlanApprovalReply>;
          }
        | undefined;

      let reply: PlanApprovalReply = { decision: "cancel" };
      if (options.handler) {
        const request: PlanApprovalRequest = {
          requestId: crypto.randomUUID(),
          runId: context?.runId ?? "",
          sessionId: context?.sessionId ?? "",
          steps,
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.explanation !== undefined ? { explanation: input.explanation } : {}),
          ...(options.timeoutMs !== undefined ? { expiresAt: Date.now() + options.timeoutMs } : {}),
        };
        reply = await options.handler(request);
      } else if (typeof context?.askPlan === "function") {
        reply = await context.askPlan({
          steps,
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.explanation !== undefined ? { explanation: input.explanation } : {}),
          ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
        });
      } else {
        return {
          decision: "cancel" as PlanDecision,
          answer: "No plan handler configured",
          error: "No plan handler configured",
        };
      }

      return {
        decision: reply.decision,
        ...(reply.feedback !== undefined ? { feedback: reply.feedback } : {}),
        answer: formatDecision(reply),
      };
    },
  }).toDefinition();
}
