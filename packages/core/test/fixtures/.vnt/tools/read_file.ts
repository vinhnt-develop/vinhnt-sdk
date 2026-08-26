import { z } from "zod";
import { defineTool } from "@vinhnt-sdk/tools";

/**
 * Custom tool that overrides the built-in read_file tool.
 * This demonstrates user override capability.
 */
export default defineTool({
  name: "read_file",
  description: "Custom read file tool (user override)",
  risk: "read" as const,
  input: z.object({
    filePath: z.string(),
  }),
  async execute({ filePath }) {
    return `Custom content from ${filePath}`;
  },
}).toDefinition();
