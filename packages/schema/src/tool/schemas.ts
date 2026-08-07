import { z } from "zod";

const filePathField = z.string().min(1);

export const ReadFileSchema = z.object({
  filePath: filePathField,
  stripTrailingNewline: z.boolean().optional().default(false),
});

export const WriteFileSchema = z.object({
  filePath: filePathField,
  content: z.string(),
});

export const EditBlockSchema = z.object({
  oldString: z.string().min(1, "oldString is required"),
  newString: z.string(),
});

export const EditFileSchema = z.object({
  filePath: filePathField,
  oldString: z.string().min(1).optional(),
  newString: z.string().optional(),
  edits: z.array(EditBlockSchema).min(1).optional(),
}).refine(
  (data) => (data.oldString !== undefined && data.newString !== undefined) || (data.edits !== undefined),
  { message: "Either oldString+newString or edits array is required" },
);

export const ApplyPatchSchema = z.object({
  filePath: filePathField,
  patch: z.string().min(1),
});

export const ListDirectorySchema = z.object({
  dirPath: z.string().min(1),
});

export const ExecuteCommandSchema = z.object({
  command: z.string().min(1),
  timeoutMs: z.number().positive().optional(),
});

export const GlobFilesSchema = z.object({
  pattern: z.string().min(1),
  maxResults: z.number().positive().optional(),
});

export const GrepFilesSchema = z.object({
  pattern: z.string().min(1),
  include: z.string().optional(),
  maxResults: z.number().positive().optional(),
});

export const WebFetchSchema = z.object({
  url: z.string().url().or(z.string().min(1)),
  format: z.enum(["markdown", "text", "html"]).optional(),
  timeout: z.number().positive().optional(),
});

export const ReadImageSchema = z.object({
  filePath: z.string().min(1),
});

export const SkillSchema = z.object({
  name: z.string().min(1),
  task: z.string().min(1),
});

export const SkillSearchSchema = z.object({
  query: z.string().min(1),
});

export const CreateSkillSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  instructions: z.string().min(1),
  directory: z.string().optional(),
  tools: z.array(z.string()).optional(),
  color: z.string().optional(),
});

export const GitDiffSchema = z.object({
  target: z.string().optional(),
  staged: z.boolean().optional(),
});

export const GitLogSchema = z.object({
  maxCount: z.number().positive().optional(),
  path: z.string().optional(),
});

export const GitCommitSchema = z.object({
  message: z.string().min(1),
});

export const GitStatusSchema = z.object({});

export const LspDiagnosticsSchema = z.object({
  filePath: z.string().min(1),
});

export const LspSymbolsSchema = z.object({
  filePath: z.string().min(1),
});

export const LspPositionSchema = z.object({
  filePath: z.string().min(1),
  line: z.number().int().nonnegative(),
  character: z.number().int().nonnegative(),
});

export const QuestionSchema = z.object({
  header: z.string().min(1).max(30),
  question: z.string().min(1),
  options: z.array(z.object({
    label: z.string().min(1),
    description: z.string().optional(),
  })).min(1).max(6).optional(),
  multiple: z.boolean().optional(),
});

export const WebSearchSchema = z.object({
  query: z.string().min(1),
  numResults: z.number().int().positive().optional(),
  searchDepth: z.enum(["basic", "advanced"]).optional(),
  livecrawl: z.enum(["fallback", "preferred"]).optional(),
  type: z.enum(["auto", "fast", "deep"]).optional(),
  contextMaxCharacters: z.number().int().positive().optional(),
});
