/**
 * ── Tool description lint (Phase 5) ──────────────────────────────────────
 * LLM tool-selection accuracy depends on description quality: a bad or vague
 * description ("Do stuff") makes the model pick the wrong tool or skip it.
 * This module flags the common "smells" in tool descriptions so authors and
 * CI can catch them early, mirroring API-doc review practices.
 */

export type DescriptionIssueCode = "empty" | "too-short" | "no-verb" | "vague" | "placeholder" | "too-long";

/** A single description-lint problem found. */
export interface ToolDescriptionIssue {
  readonly code: DescriptionIssueCode;
  readonly message: string;
}

/** Lint report for one tool description. */
export interface ToolDescriptionReport {
  readonly tool: string;
  readonly description: string;
  readonly issues: readonly ToolDescriptionIssue[];
}

/** Curated imperative verbs a tool description should start with. */
const ACTION_VERBS = new Set([
  "abort", "accept", "add", "analyze", "apply", "ask", "attach", "authenticate", "authorize",
  "build", "calculate", "cancel", "check", "clear", "close", "commit", "compile", "convert",
  "copy", "count", "create", "decode", "delete", "deploy", "describe", "detect", "diff",
  "download", "edit", "encode", "execute", "explain", "export", "fetch", "find", "fix",
  "format", "generate", "get", "initialize", "install", "invoke", "join", "launch", "list",
  "load", "login", "manage", "merge", "monitor", "move", "open", "optimize", "parse",
  "patch", "plan", "preview", "publish", "push", "query", "read", "rebuild", "refactor",
  "register", "reload", "remove", "rename", "replace", "resolve", "restart", "restore",
  "review", "rollback", "run", "save", "scan", "schedule", "search", "select", "send",
  "set", "show", "simulate", "sort", "spawn", "stage", "start", "stop", "subscribe",
  "summarize", "sync", "test", "trace", "track", "translate", "trigger", "undo", "update",
  "upload", "use", "validate", "verify", "view", "wait", "write", "zoom",
]);

/** Leading adverbs that should be skipped when checking the first verb. */
const LEADING_ADVERBS = new Set([
  "recursively", "automatically", "quickly", "quietly", "silently", "lazily", "eagerly",
  "simply", "always", "never", "only", "just", "also", "finally", "first", "then", "once",
]);

const MIN_DESCRIPTION_LENGTH = 12;
const MAX_DESCRIPTION_LENGTH = 220;
const MIN_WORDS = 4;
const PLACEHOLDER_RE = /\b(todo|tbd|fixme|placeholder|lorem|coming soon)\b|\byour (tool|plugin)\b|\betc\.?\.?\s*$/i;

function firstSignificantWord(description: string): string | undefined {
  const words = description.split(/\s+/);
  for (const word of words) {
    const normalized = word.toLowerCase().replace(/[^a-z]/g, "");
    if (!normalized) continue;
    if (LEADING_ADVERBS.has(normalized)) continue;
    return normalized;
  }
  return undefined;
}

/** Lint a single tool description. Returns the report (empty `issues` = clean). */
export function lintToolDescription(tool: string, description: string): ToolDescriptionReport {
  const issues: ToolDescriptionIssue[] = [];
  const trimmed = description.trim();

  if (!trimmed) {
    return { tool, description: trimmed, issues: [{ code: "empty", message: "Tool description is empty — the model cannot decide when to use this tool." }] };
  }

  if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
    issues.push({
      code: "too-short",
      message: `Description is only ${trimmed.length} chars (min ${MIN_DESCRIPTION_LENGTH}) — too little signal for tool selection.`,
    });
  }

  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    issues.push({
      code: "too-long",
      message: `Description is ${trimmed.length} chars (max ${MAX_DESCRIPTION_LENGTH}) — wasteful for the context window; keep the first sentence scannable.`,
    });
  }

  const verb = firstSignificantWord(trimmed);
  if (!verb || !ACTION_VERBS.has(verb)) {
    issues.push({
      code: "no-verb",
      message: `Description should start with an imperative verb (e.g. "Fetch", "Create", "Search") but starts with "${verb ?? "nothing"}".`,
    });
  }

  if (trimmed.split(/\s+/).length < MIN_WORDS) {
    issues.push({
      code: "vague",
      message: `Description is too vague (${trimmed.split(/\s+/).length} words) — state what it does and on what input.`,
    });
  }

  if (PLACEHOLDER_RE.test(trimmed)) {
    issues.push({
      code: "placeholder",
      message: "Description contains placeholder/TODO text — replace with a real description.",
    });
  }

  return { tool, description: trimmed, issues };
}

/** Lint a list of tool definitions, returning only the ones with issues. */
export function lintToolDefinitions(
  definitions: readonly { id: string; description: string }[],
): ToolDescriptionReport[] {
  return definitions
    .map((d) => lintToolDescription(d.id, d.description))
    .filter((report) => report.issues.length > 0);
}
