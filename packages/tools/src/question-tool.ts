import { z } from "zod";
import { defineTool } from "./index.js";
import type { QuestionItem, QuestionAnswer } from "@vinhnt-sdk/schema";
import type { QuestionRequest, QuestionReply, QuestionAction } from "./question-store.js";

/** Reply from human-in-the-loop question (kept for API symmetry with permission). */
export interface QuestionInput {
  header: string;
  question: string;
  options?: { label: string; description?: string | undefined }[] | undefined;
  multiple?: boolean | undefined;
}

/** Resolver that returns the user's answer for a {@link QuestionRequest}. */
export type QuestionHandler = (request: QuestionRequest) => Promise<QuestionReply>;

/** Options for {@link createQuestionTool}. */
export interface QuestionToolOptions {
  /**
   * App-supplied resolver. When omitted, the tool uses `ctx.askQuestion`
   * (the host-owned durable request/reply path).
   */
  handler?: QuestionHandler;
  /** Offer an "Other" free-text option even when options are predefined. */
  allowCustom?: boolean;
  /** Hard timeout in ms for the whole question batch. */
  timeoutMs?: number;
}

const OptionSchema = z.object({
  label: z.string().min(1),
  description: z.string().optional(),
});

const ItemSchema = z.object({
  header: z.string().min(1),
  question: z.string().min(1),
  options: z.array(OptionSchema).min(1).max(6).optional(),
  multiple: z.boolean().optional(),
});

const QuestionSchema = z.object({
  header: z.string().min(1).optional(),
  question: z.string().min(1).optional(),
  options: z.array(OptionSchema).min(1).max(6).optional(),
  multiple: z.boolean().optional(),
  /** Batch form (1–4 questions per call). Takes precedence over the single form. */
  questions: z.array(ItemSchema).min(1).max(4).optional(),
});

/** Format the reply into a short text answer the model can read. */
function formatAnswer(reply: QuestionReply, questions: readonly QuestionItem[]): string {
  if (reply.action !== "accept") {
    return reply.action === "decline" ? "User declined to answer." : "Question cancelled.";
  }
  const answers = reply.answers ?? [];
  if (answers.length === 0) return "User accepted but provided no answers.";
  return questions
    .map((q) => {
      const a = answers.find((x) => x.header === q.header);
      if (!a) return `${q.header}: (no answer)`;
      const parts = [...a.selected];
      if (a.text) parts.push(a.text);
      return `${q.header}: ${parts.length > 0 ? parts.join(", ") : "(no answer)"}`;
    })
    .join("\n");
}

/**
 * Create the `question` tool that asks the user one or more questions and
 * blocks until they answer. Supports a single question (backward compatible)
 * or a batch via `questions[]`. Prefers the host-owned `ctx.askQuestion`
 * request/reply path; a {@link QuestionHandler} may be injected instead.
 */
export function createQuestionTool(
  handlerOrOptions?: QuestionHandler | QuestionToolOptions,
) {
  const options: QuestionToolOptions =
    typeof handlerOrOptions === "function"
      ? { handler: handlerOrOptions }
      : (handlerOrOptions ?? {});
  const allowCustom = options.allowCustom ?? true;

  return defineTool<unknown, unknown>({
    name: "question",
    description:
      "Ask the user one or more questions and get their response. Use this when you need clarification, preferences, or decisions from the user. " +
      "Provide clear options when possible; pass a `questions[]` array to ask up to 4 at once. " +
      "Each question may allow multiple selection; users can always answer freely (\"Other\").",
    risk: "external",
    input: z.unknown(),
    jsonSchema: {
      type: "object",
      properties: {
        header: { type: "string", description: "Short header/title for the question (max 30 chars)" },
        question: { type: "string", description: "The question to ask the user" },
        options: {
          type: "array",
          description: "Predefined answer options the user can pick from",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Option label shown to user" },
              description: { type: "string", description: "Optional description" },
            },
            required: ["label"],
          },
        },
        multiple: { type: "boolean", description: "Allow selecting multiple options (default: false)" },
        questions: {
          type: "array",
          description: "Batch form: up to 4 questions in one call (takes precedence over header/question)",
          items: {
            type: "object",
            properties: {
              header: { type: "string" },
              question: { type: "string" },
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["label"],
                },
              },
              multiple: { type: "boolean" },
            },
            required: ["header", "question"],
          },
        },
      },
      required: [],
    },
    async execute(raw, ctx) {
      const v = (raw ?? {}) as Record<string, unknown>;
      const parsed = QuestionSchema.safeParse(v);
      if (!parsed.success) {
        return { error: `Invalid question input: ${parsed.error.issues[0]?.message ?? "validation failed"}` };
      }
      const input = parsed.data;

      const items: QuestionItem[] =
        input.questions && input.questions.length > 0
          ? input.questions.map((q) => ({
              header: q.header,
              question: q.question,
              ...(q.options ? { options: q.options.map((o) => ({ label: o.label, ...(o.description !== undefined ? { description: o.description } : {}) })) } : {}),
              ...(q.multiple !== undefined ? { multiple: q.multiple } : {}),
            }))
          : input.header && input.question
            ? [{
                header: input.header,
                question: input.question,
                ...(input.options ? { options: input.options.map((o) => ({ label: o.label, ...(o.description !== undefined ? { description: o.description } : {}) })) } : {}),
                ...(input.multiple !== undefined ? { multiple: input.multiple } : {}),
              }]
            : [];

      if (items.length === 0) {
        return { error: "At least one question (header + question) is required" };
      }

      const context = ctx as { sessionId?: string; runId?: string; askQuestion?: (i: {
        questions: readonly QuestionItem[];
        allowCustom?: boolean;
        timeoutMs?: number;
      }) => Promise<QuestionReply> } | undefined;

      let reply: QuestionReply = { action: "cancel" };
      if (options.handler) {
        const request: QuestionRequest = {
          requestId: crypto.randomUUID(),
          runId: context?.runId ?? "",
          sessionId: context?.sessionId ?? "",
          questions: items,
          allowCustom,
          ...(options.timeoutMs !== undefined ? { expiresAt: Date.now() + options.timeoutMs } : {}),
        };
        reply = await options.handler(request);
      } else if (typeof context?.askQuestion === "function") {
        reply = await context.askQuestion({
          questions: items,
          allowCustom,
          ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
        });
      } else {
        return { action: "cancel" as QuestionAction, answer: "No question handler configured", error: "No question handler configured" };
      }

      return {
        action: reply.action,
        ...(reply.answers !== undefined ? { answers: reply.answers as readonly QuestionAnswer[] } : {}),
        answer: formatAnswer(reply, items),
      };
    },
  }).toDefinition();
}
