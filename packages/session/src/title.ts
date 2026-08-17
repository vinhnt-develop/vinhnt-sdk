import type { ModelProvider } from "@vinhnt-sdk/schema";

/** Max characters of the user message passed to the model for title generation. */
export const TITLE_INPUT_TRUNCATION = 200;
/** Max tokens allowed for the generated title. */
export const TITLE_MAX_TOKENS = 30;
/** Max characters of the final title after post-processing. */
export const TITLE_OUTPUT_TRUNCATION = 80;
/** System prompt instructing the model to produce a concise session title. */
export const TITLE_SYSTEM_PROMPT = "Generate a concise session title (max 8 words) from this user message. Respond with ONLY the title, no quotes, no punctuation.";

/** Create a session title generator backed by the given model. */
export function createDefaultSessionTitleGenerator(model: ModelProvider): (prompt: string) => Promise<string> {
  return async (prompt: string): Promise<string> => {
    const truncated = prompt.slice(0, TITLE_INPUT_TRUNCATION);
    const res = await model.generate({
      messages: [
        {
          role: "system",
          content: TITLE_SYSTEM_PROMPT,
        },
        { role: "user", content: truncated },
      ],
      tools: [],
      maxTokens: TITLE_MAX_TOKENS,
    });
    return res.content.trim().replace(/^["']|["']$/g, "").slice(0, TITLE_OUTPUT_TRUNCATION);
  };
}
