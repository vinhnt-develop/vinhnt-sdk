/** Known agent step types. Use as reference, not exhaustive. */
export const KNOWN_AGENT_STEP_TYPES = [
  "analyzing_codebase",
  "searching_files",
  "reading_file",
  "generating_patch",
  "running_tests",
  "executing_bash",
  "thinking",
  "writing_file",
  "compiling",
  "idle",
] as const;

/** Agent step type — open string for extensibility. */
export type AgentStepType = string;

export const AGENT_STEP_LABELS: Record<string, string> = {
  analyzing_codebase: "Analyzing codebase",
  searching_files:    "Searching files",
  reading_file:       "Reading file",
  generating_patch:   "Generating patch",
  running_tests:      "Running tests",
  executing_bash:     "Executing command",
  thinking:           "Thinking",
  writing_file:       "Writing file",
  compiling:          "Compiling",
  idle:               "Idle",
};

export function inferStepType(toolName: string): AgentStepType {
  const map: Record<string, AgentStepType> = {
    list_directory:    "analyzing_codebase",
    codebase_search:  "analyzing_codebase",
    codebase_file:    "analyzing_codebase",
    codebase_references: "analyzing_codebase",
    glob_files:       "searching_files",
    grep_files:       "searching_files",
    lsp_symbols:      "searching_files",
    lsp_references:   "searching_files",
    lsp_diagnostics:  "searching_files",
    read_file:        "reading_file",
    read_image:       "reading_file",
    lsp_hover:        "reading_file",
    lsp_definition:   "reading_file",
    write_file:       "generating_patch",
    edit_file:        "generating_patch",
    git_diff:         "running_tests",
    git_log:          "running_tests",
    bash:             "executing_bash",
    shell:            "executing_bash",
    web_fetch:        "searching_files",
    web_search:       "searching_files",
    memory_search:    "searching_files",
    rag_search:       "searching_files",
  };
  return map[toolName] ?? "executing_bash";
}
