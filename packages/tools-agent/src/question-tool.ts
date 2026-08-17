import { z } from "zod";
import { defineTool } from "@vinhnt-sdk/tools";

/** Input for the `question` tool. */
export interface QuestionInput {
  header: string;
  question: string;
  options?: { label: string; description?: string }[] | undefined;
  multiple?: boolean;
}

/** Resolver that returns the user's answer for a {@link QuestionInput}. */
export type QuestionHandler = (question: QuestionInput) => Promise<string>;

const QuestionSchema = z.object({
  header: z.string().min(1).max(30),
  question: z.string().min(1),
  options: z.array(z.object({
    label: z.string().min(1),
    description: z.string().optional(),
  })).min(1).max(6).optional(),
  multiple: z.boolean().optional(),
});

/**
 * Create the `question` tool that asks the user a question (with optional
 * predefined options). Pass a {@link QuestionHandler} to resolve answers.
 */
export function createQuestionTool(handler?: QuestionHandler) {
  return defineTool<QuestionInput, { answer: string; error?: string }>({
    name: "question",
    description: "Ask the user a question and get their response. Use this when you need clarification, preferences, or decisions from the user. Provide clear options when possible.",
    risk: "external",
    input: QuestionSchema,
    jsonSchema: {
      type: "object",
      properties: {
        header: { type: "string", description: "Short header or title for the question (max 100 chars)" },
        question: { type: "string", description: "The question to ask the user" },
        options: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Option label shown to user" },
              description: { type: "string", description: "Optional description" },
            },
            required: ["label"],
          },
          description: "Predefined answer options the user can pick from",
        },
        multiple: {
          type: "boolean",
          description: "Allow selecting multiple options (default: false)",
        },
      },
      required: ["header", "question"],
    },
    async execute(v) {
      if (!handler) {
        return { answer: "", error: "No question handler configured" };
      }
      const answer = await handler(v);
      return { answer };
    },
  }).toDefinition();
}
