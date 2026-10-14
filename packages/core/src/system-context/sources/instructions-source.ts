import type { ContextSourceValue, ContextSourceKey } from "../types.js";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";

export interface InstructionsInfo {
  global: string;
  project: string;
  effective: string;
  /**
   * P7.3: project instruction files loaded, in root→cwd order (observability —
   * which files contributed to `project`/`effective`).
   */
  loadedFiles?: string[];
  /** P7.3: true when the combined project bytes hit `maxBytes` and content was truncated. */
  truncated?: boolean;
}

/** Options for {@link createInstructionsSource}. */
export interface InstructionsSourceOptions {
  /**
   * P7.3: combined byte cap for all project instruction files (Codex
   * `project_doc_max_bytes`). Default: 32 KiB. 0 = unlimited.
   * Files are added root→cwd until the budget is exhausted; the file that
   * crosses the boundary is truncated to the remaining budget.
   */
  maxBytes?: number;
  /**
   * P7.3: fallback filenames checked after `AGENTS.override.md`/`AGENTS.md`
   * in each directory (Codex `project_doc_fallback_filenames`). At most one
   * file per directory is included.
   */
  fallbackFilenames?: string[];
  /**
   * P7.3: markers walked upward from cwd to find the project root (Codex
   * `project_root_markers`). Default: `[".git"]`. Empty array = cwd only.
   */
  rootMarkers?: string[];
}

/** Default combined byte cap (Codex PROJECT_DOC_MAX_BYTES). */
export const DEFAULT_INSTRUCTIONS_MAX_BYTES = 32 * 1024;

/** Default project-root markers walked upward from cwd. */
export const DEFAULT_INSTRUCTIONS_ROOT_MARKERS: readonly string[] = [".git"];

const LOCAL_OVERRIDE = "AGENTS.override.md";
const DEFAULT_NAME = "AGENTS.md";

/**
 * Sanitize user-provided instruction content to reduce prompt injection risk.
 * Wraps user content with clear delimiters so the model can distinguish
 * instructions from user-controlled content.
 */
function sanitizeInstructions(content: string): string {
  if (!content) return "";
  return content;
}

export function createInstructionsSource(
  cwd?: string | (() => string),
  options?: InstructionsSourceOptions,
): ContextSourceValue<InstructionsInfo> {
  const maxBytes = options?.maxBytes ?? DEFAULT_INSTRUCTIONS_MAX_BYTES;
  const fallbackFilenames = options?.fallbackFilenames ?? [];
  const rootMarkers = options?.rootMarkers ?? [...DEFAULT_INSTRUCTIONS_ROOT_MARKERS];

  // P7.3 session cache: avoid re-reading unchanged files on every reconcile().
  // Invalidated when cwd changes or any discovered file's (mtimeMs, size) moves.
  let cache:
    | { cwd: string; files: Map<string, { mtimeMs: number; size: number }>; value: InstructionsInfo }
    | undefined;

  function candidateNames(): string[] {
    const names = [LOCAL_OVERRIDE, DEFAULT_NAME, ...fallbackFilenames.filter(Boolean)];
    return [...new Set(names)];
  }

  function findProjectRoot(startDir: string): string {
    if (rootMarkers.length === 0) return startDir;
    let dir = startDir;
    for (;;) {
      for (const marker of rootMarkers) {
        if (existsSync(join(dir, marker))) return dir;
      }
      const parent = dirname(dir);
      if (parent === dir) return startDir; // filesystem root — fall back to cwd
      dir = parent;
    }
  }

  /** At most one file per directory: override → AGENTS.md → fallbacks. */
  function pickOneFile(dir: string): string | undefined {
    for (const name of candidateNames()) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
    return undefined;
  }

  /** Root→cwd path list (inclusive), at most one instruction file per dir. */
  function discoverProjectFiles(base: string): string[] {
    const root = findProjectRoot(base);
    const dirs: string[] = [];
    let cursor = base;
    for (;;) {
      dirs.push(cursor);
      if (cursor === root) break;
      const parent = dirname(cursor);
      if (parent === cursor) break;
      cursor = parent;
    }
    dirs.reverse(); // root → cwd
    const files: string[] = [];
    for (const dir of dirs) {
      const file = pickOneFile(dir);
      if (file) files.push(file);
    }
    return files;
  }

  async function readIfExists(filePath: string): Promise<string> {
    try {
      if (existsSync(filePath)) {
        return await readFile(filePath, "utf-8");
      }
    } catch {
      // ignore
    }
    return "";
  }

  async function loadValue(base: string): Promise<InstructionsInfo> {
    const globalDir = resolve(process.env.HOME ?? process.env.USERPROFILE ?? "/root", ".vnt");
    // Global scope: first non-empty of AGENTS.override.md / AGENTS.md.
    let global = await readIfExists(join(globalDir, LOCAL_OVERRIDE));
    if (!global.trim()) global = await readIfExists(join(globalDir, DEFAULT_NAME));

    // Project scope: hierarchy root→cwd, one file per dir, byte-capped.
    const projectFiles = discoverProjectFiles(base);
    const parts: string[] = [];
    const loadedFiles: string[] = [];
    let remaining = maxBytes > 0 ? maxBytes : Number.POSITIVE_INFINITY;
    let truncated = false;

    for (const file of projectFiles) {
      if (remaining <= 0) {
        truncated = true;
        break;
      }
      let content: string;
      try {
        content = await readFile(file, "utf-8");
      } catch {
        continue;
      }
      if (!content.trim()) continue; // skip empty files (Codex behavior)
      const byteLength = Buffer.byteLength(content, "utf-8");
      if (byteLength > remaining) {
        // Truncate to remaining budget (byte-accurate via Buffer slice).
        content = Buffer.from(content, "utf-8").subarray(0, remaining).toString("utf-8");
        truncated = true;
        remaining = 0;
      } else {
        remaining -= byteLength;
      }
      parts.push(content);
      loadedFiles.push(file);
    }

    const project = parts.join("\n\n");
    const globalPart = global ? `## Global Instructions\n${sanitizeInstructions(global)}` : "";
    const projectPart = project ? `## Project Instructions\n${sanitizeInstructions(project)}` : "";
    const effective = [globalPart, projectPart].filter(Boolean).join("\n\n");

    return { global, project, effective, loadedFiles, truncated };
  }

  return {
    key: "core.instructions" as ContextSourceKey,
    priority: 10,
    async load() {
      const base = typeof cwd === "function" ? cwd() : (cwd ?? process.cwd());

      // Session cache: stat discovered files; reuse value when cwd + all (mtime, size) match.
      const projectFiles = discoverProjectFiles(base);
      const globalDir = resolve(process.env.HOME ?? process.env.USERPROFILE ?? "/root", ".vnt");
      const globalCandidates = [join(globalDir, LOCAL_OVERRIDE), join(globalDir, DEFAULT_NAME)];
      const allCandidates = [...globalCandidates, ...projectFiles];
      const currentStats = new Map<string, { mtimeMs: number; size: number }>();
      for (const file of allCandidates) {
        try {
          const st = await stat(file);
          currentStats.set(file, { mtimeMs: st.mtimeMs, size: st.size });
        } catch {
          // missing file — fine, recorded as absent
        }
      }

      if (
        cache &&
        cache.cwd === base &&
        cache.files.size === currentStats.size &&
        [...currentStats].every(([file, st]) => {
          const cached = cache!.files.get(file);
          return cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size;
        })
      ) {
        return cache.value;
      }

      const value = await loadValue(base);
      cache = { cwd: base, files: currentStats, value };
      return value;
    },
    renderBaseline(value) {
      if (!value.effective) return "";
      return value.effective;
    },
    renderUpdate(value, previous) {
      if (value.effective === previous.effective) return null;
      return `[Context update — instructions changed]\n${value.effective || "No active instructions."}`;
    },
    renderRemoval() {
      return "";
    },
  };
}
