/**
 * Structured `apply_patch` grammar (Codex-style, Phase 7 group 2).
 *
 * Codex enforces its apply_patch format with a Lark grammar in strict/lenient
 * variants. JS has no Lark runtime (and the SDK is zero-dep), so this module
 * is an equivalent hand-written line parser with the same two modes:
 *
 *   - `strict`:  every directive/line must match the grammar; first violation
 *                throws `ValidationError` with the offending line number.
 *   - `lenient`: recover where unambiguous (missing Begin/End markers, add
 *                lines without `+`, content before first `@@` starts an
 *                implicit hunk, unknown directives are skipped); structural
 *                impossibilities (no operations, no path) still throw.
 *
 * Grammar:
 *
 *   patch    := "*** Begin Patch" NL section+ "*** End Patch"
 *   section  := "*** Update File: " path NL (directive | hunk)*
 *             | "*** Add File: "    path NL ("+" line)*
 *             | "*** Delete File: " path NL
 *   directive:= "*** Move to: " path NL | "@@" header? NL
 *   hunk     := (" " | "-" | "+") line NL   (exact-empty line = context)
 *
 * Exact-empty lines inside an open hunk are context, but blanks sitting at a
 * hunk's leading/trailing edge are diff artifacts and are trimmed at flush
 * (intentional blank lines always carry a " ", "-" or "+" tag).
 *
 * The tool auto-falls back: strict parse first, lenient on failure, and the
 * strict error is rethrown when both fail (strict errors are the precise ones).
 */
import { ValidationError } from "@vinhnt-sdk/schema";

/** Parse mode - mirrors Codex's strict/lenient apply_patch grammars. */
export type ApplyPatchMode = "strict" | "lenient";

/** Wire format of a patch payload: structured grammar vs legacy SEARCH blocks. */
export type ApplyPatchFormat = "structured" | "legacy";

/** One `@@` hunk: raw lines (first char = ` ` context, `-` remove, `+` add). */
export interface ApplyPatchHunk {
  /** Text after `@@` - used to anchor the hunk location in the file. */
  readonly header: string | undefined;
  readonly lines: readonly string[];
}

/** A parsed file operation. */
export type ApplyPatchOp =
  | { readonly kind: "update"; readonly path: string; readonly moveTo: string | undefined; readonly hunks: readonly ApplyPatchHunk[] }
  | { readonly kind: "add"; readonly path: string; readonly content: string }
  | { readonly kind: "delete"; readonly path: string };

/** Result of a successful parse. */
export interface ApplyPatchProgram {
  readonly mode: ApplyPatchMode;
  readonly ops: readonly ApplyPatchOp[];
}

const BEGIN = "*** Begin Patch";
const END = "*** End Patch";
const UPDATE_PREFIX = "*** Update File:";
const ADD_PREFIX = "*** Add File:";
const DELETE_PREFIX = "*** Delete File:";
const MOVE_PREFIX = "*** Move to:";

/**
 * Classify `patch` as `structured` or `legacy`. Detection precedence:
 *   1. a `*** Begin Patch` line anywhere (leading blanks tolerated) -> structured
 *   2. a `<<<<<<< SEARCH` marker -> legacy (a mixed patch must never be
 *      silently reinterpreted as structured)
 *   3. any `*** Update/Add/Delete File:` section directive -> structured
 *   4. otherwise -> legacy
 */
export function detectApplyPatchFormat(patch: string): ApplyPatchFormat {
  if (/^[ \t]*\*{3} Begin Patch/m.test(patch)) return "structured";
  if (patch.includes("<<<<<<< SEARCH")) return "legacy";
  if (/^[ \t]*\*{3} (?:Update File:|Add File:|Delete File:)/m.test(patch)) return "structured";
  return "legacy";
}

interface MutableUpdate { kind: "update"; path: string; moveTo?: string; hunks: { header?: string; lines: string[] }[] }
interface MutableAdd { kind: "add"; path: string; lines: string[] }
interface MutableDelete { kind: "delete"; path: string }
type MutableSection = MutableUpdate | MutableAdd | MutableDelete;

function lineError(lineNo: number, msg: string): ValidationError {
  return new ValidationError(`apply_patch line ${lineNo}: ${msg}`);
}

function pathAfter(prefix: string, line: string): string {
  return line.slice(line.indexOf(prefix) + prefix.length).trim();
}

/** Drop exact-empty lines at a hunk/section's leading and trailing edges. */
function trimBlankEdges(lines: readonly string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start] === "") start++;
  while (end > start && lines[end - 1] === "") end--;
  return lines.slice(start, end);
}

/**
 * Parse a structured apply_patch patch in `strict` or `lenient` mode.
 * @throws ValidationError when the grammar is violated (with line numbers).
 */
export function parseApplyPatch(patch: string, mode: ApplyPatchMode): ApplyPatchProgram {
  const strict = mode === "strict";
  const lines = patch.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  const skipBlank = () => { while (i < lines.length && lines[i]!.trim() === "") i++; };
  const at = () => i + 1; // 1-based line number

  skipBlank();
  let sawBegin = false;
  let sawEnd = false;
  if (i < lines.length && lines[i]!.trim() === BEGIN) {
    sawBegin = true;
    i++;
  } else if (strict && i < lines.length) {
    throw lineError(at(), `expected "${BEGIN}"`);
  }

  const ops: ApplyPatchOp[] = [];
  let section: MutableSection | null = null;
  const flush = () => {
    if (!section) return;
    if (section.kind === "add") {
      const linesToAdd = trimBlankEdges(section.lines);
      if (linesToAdd.length === 0 && strict) {
        throw lineError(at(), `"*** Add File:" section for "${section.path}" has no "+content" lines`);
      }
      const body = linesToAdd.map((l) => (l.startsWith("+") ? l.slice(1) : l));
      ops.push({ kind: "add", path: section.path, content: body.length ? body.join("\n") + "\n" : "" });
    } else if (section.kind === "update") {
      const hunks = section.hunks
        .map((h) => ({ header: h.header, lines: trimBlankEdges(h.lines) }))
        .filter((h) => h.lines.length > 0);
      if (hunks.length === 0 && !section.moveTo && strict) {
        throw lineError(at(), `"*** Update File:" section for "${section.path}" has no "@@ hunk" and no "*** Move to:" directive`);
      }
      if (hunks.length === 0 && !section.moveTo) return; // lenient: drop empty update
      ops.push({ kind: "update", path: section.path, moveTo: section.moveTo, hunks });
    } else {
      ops.push({ kind: "delete", path: section.path });
    }
    section = null;
  };

  while (i < lines.length) {
    const raw = lines[i]!;
    const trimmed = raw.trim();

    if (trimmed === END) {
      flush();
      sawEnd = true;
      i++;
      for (; i < lines.length; i++) {
        if (lines[i]!.trim() !== "" && strict) throw lineError(i + 1, `unexpected content after "${END}"`);
      }
      break;
    }
    if (trimmed === BEGIN) {
      if (strict) throw lineError(at(), `duplicate "${BEGIN}"`);
      i++;
      continue;
    }

    if (trimmed.startsWith(UPDATE_PREFIX)) {
      flush();
      const path = pathAfter(UPDATE_PREFIX, trimmed);
      if (!path) {
        if (strict) throw lineError(at(), `"*** Update File:" is missing a path`);
        i++;
        continue;
      }
      section = { kind: "update", path, hunks: [] };
      i++;
      continue;
    }
    if (trimmed.startsWith(ADD_PREFIX)) {
      flush();
      const path = pathAfter(ADD_PREFIX, trimmed);
      if (!path) {
        if (strict) throw lineError(at(), `"*** Add File:" is missing a path`);
        i++;
        continue;
      }
      section = { kind: "add", path, lines: [] };
      i++;
      continue;
    }
    if (trimmed.startsWith(DELETE_PREFIX)) {
      flush();
      const path = pathAfter(DELETE_PREFIX, trimmed);
      if (!path) {
        if (strict) throw lineError(at(), `"*** Delete File:" is missing a path`);
        i++;
        continue;
      }
      section = { kind: "delete", path };
      i++;
      continue;
    }
    if (trimmed.startsWith(MOVE_PREFIX)) {
      const path = pathAfter(MOVE_PREFIX, trimmed);
      if (section && section.kind === "update") {
        if (!path) {
          if (strict) throw lineError(at(), `"*** Move to:" is missing a path`);
        } else {
          section.moveTo = path;
        }
      } else if (strict) {
        throw lineError(at(), `"*** Move to:" is only valid inside an "*** Update File:" section`);
      }
      i++;
      continue;
    }
    if (trimmed.startsWith("@@")) {
      if (section && section.kind === "update") {
        const header = trimmed.slice(2).trim();
        section.hunks.push({ ...(header ? { header } : {}), lines: [] });
      } else if (strict) {
        throw lineError(at(), `"@@ hunk header is only valid inside an "*** Update File:" section`);
      }
      i++;
      continue;
    }
    if (trimmed.startsWith("***")) {
      if (strict) throw lineError(at(), `unknown directive "${trimmed.slice(0, 40)}"`);
      i++; // lenient: skip unknown directives
      continue;
    }

    // Body line.
    if (section && section.kind === "update") {
      if (raw === "") {
        // Exact-empty line inside an open hunk is context (edge blanks are
        // trimmed at flush); a blank before the first "@@" is a separator.
        const open = section.hunks[section.hunks.length - 1];
        if (open) open.lines.push("");
        i++;
        continue;
      }
      if (section.hunks.length === 0) {
        if (strict) throw lineError(at(), `expected "@@ hunk header" before content lines in "*** Update File:" section`);
        section.hunks.push({ lines: [] }); // lenient: implicit hunk
      }
      if (strict && !/^[ +-]/.test(raw)) {
        throw lineError(at(), `hunk line must start with " ", "-" or "+"`);
      }
      section.hunks[section.hunks.length - 1]!.lines.push(raw);
      i++;
      continue;
    }
    if (section && section.kind === "add") {
      if (!raw.startsWith("+")) {
        if (strict) throw lineError(at(), `"*** Add File:" line must start with "+"`);
        section.lines.push(raw); // lenient: keep the line as-is
        i++;
        continue;
      }
      section.lines.push(raw);
      i++;
      continue;
    }
    if (section && section.kind === "delete") {
      if (trimmed !== "" && strict) throw lineError(at(), `"*** Delete File:" section must not contain content`);
      i++; // blank separator (lenient stray content ignored)
      continue;
    }
    if (trimmed === "") {
      i++; // blank separator outside sections
      continue;
    }
    if (strict) throw lineError(at(), `content outside any "*** <Type> File:" section`);
    i++; // lenient: ignore
  }

  flush();
  if (strict && !sawBegin) throw lineError(1, `expected "${BEGIN}"`);
  if (strict && !sawEnd) throw lineError(lines.length, `expected "${END}"`);
  if (ops.length === 0) {
    throw new ValidationError(`apply_patch: patch contains no file operations (missing "*** Update/Add/Delete File:" sections)`);
  }
  return { mode, ops };
}

/**
 * Apply one hunk to `content`: build the search span from context+removed
 * lines, the replacement from context+added lines, then splice it in.
 * The `@@` header (when present) anchors where the search starts so repeated
 * context blocks resolve deterministically.
 */
export function applyHunkToContent(content: string, hunk: ApplyPatchHunk, filePath: string): string {
  const oldLines: string[] = [];
  const newLines: string[] = [];
  for (const line of hunk.lines) {
    const tag = line.charAt(0);
    const text = line.slice(1);
    if (tag === "+") {
      newLines.push(text);
    } else if (tag === "-") {
      oldLines.push(text);
    } else {
      oldLines.push(text);
      newLines.push(text);
    }
  }
  const oldText = oldLines.join("\n");
  const newText = newLines.join("\n");

  if (oldText === "") {
    // Insert-only hunk: needs the header anchor to know where to insert.
    if (hunk.header) {
      const hIdx = content.indexOf(hunk.header);
      if (hIdx < 0) throw hunkNotFound(filePath, hunk, content);
      const eol = content.indexOf("\n", hIdx);
      const at = eol < 0 ? content.length : eol + 1;
      return content.slice(0, at) + newText + (newText ? "\n" : "") + content.slice(at);
    }
    throw new ValidationError(
      `apply_patch: hunk in ${filePath} only adds lines but has no context to anchor insertion - add a "@@ <context>" header or context lines`
    );
  }

  let from = 0;
  if (hunk.header) {
    const hIdx = content.indexOf(hunk.header);
    if (hIdx >= 0) from = hIdx;
  }
  const idx = content.indexOf(oldText, from);
  if (idx < 0) throw hunkNotFound(filePath, hunk, content);
  return content.slice(0, idx) + newText + content.slice(idx + oldText.length);
}

function hunkNotFound(filePath: string, hunk: ApplyPatchHunk, content: string): ValidationError {
  const snippet = content.length > 400 ? content.slice(0, 200) + "\n...\n" + content.slice(-200) : content;
  const searchText = hunk.lines.filter((l) => l.charAt(0) !== "+").map((l) => l.slice(1)).join("\n");
  const headerNote = hunk.header ? ` (anchored at header "${hunk.header}")` : "";
  return new ValidationError(
    `apply_patch: hunk search block not found in ${filePath}${headerNote}. File content:\n---\n${snippet}\n---\n` +
    `Searched for:\n---\n${searchText.slice(0, 300)}${searchText.length > 300 ? "..." : ""}\n---`
  );
}
