/**
 * Per-step file snapshots → undo (P2-3 / G7.2).
 *
 * Before a mutating file tool (`write_file`/`edit_file`/`apply_patch` by
 * default) executes, the recorder captures each target file's PRE-IMAGE:
 * `{existed, content}` (content skipped above `maxContentBytes`). Snapshots
 * are grouped by `runId`/`step`/`toolCallId`, kept in an in-memory bounded
 * store (swap `fs`/store knobs via DI — no global state), and reference
 * metadata (never file content) rides on the `tool.completed` event as
 * `metadata.fileSnapshots`.
 *
 * `undo(filter)` restores newest-first: existing files get their pre-image
 * back, files the tool created are removed, entries without a captured
 * pre-image are reported as skipped. Opt-in via `AgentKernelConfig.fileSnapshot`
 * (default: off — zero behavior change until enabled).
 */

import { readFile, writeFile, rm, stat } from "node:fs/promises";
import { isAbsolute, resolve as resolvePath } from "node:path";
import { detectApplyPatchFormat, parseApplyPatch } from "@vinhnt-sdk/tools";

/** Pre-image of one file captured before a mutating tool ran. */
export interface FileSnapshot {
  /** Target path (absolute when `workspaceRoot` is known, else as given). */
  readonly path: string;
  /** Whether the file existed before the tool ran. */
  readonly existed: boolean;
  /**
   * Pre-image content. `undefined` when the file did not exist, was
   * unreadable, or exceeded `maxContentBytes` (undo then reports "no
   * pre-image" instead of corrupting the file).
   */
  readonly content?: string;
  /** Pre-image size in bytes (0 when the file did not exist). */
  readonly size: number;
  readonly toolCallId: string;
  readonly toolName: string;
  readonly step: number;
  readonly runId: string;
  /** ISO timestamp of the capture. */
  readonly at: string;
  /** Set once `undo()` restored/removed this entry (never undone twice). */
  undone: boolean;
}

/** Lightweight snapshot reference attached to `tool.completed` event metadata. */
export interface FileSnapshotRef {
  readonly path: string;
  readonly existed: boolean;
  /** Whether a restorable pre-image was captured (false = over-cap/unreadable). */
  readonly hadPreImage: boolean;
}

/** Injectable filesystem seam (defaults to `node:fs/promises`). */
export interface FileSnapshotFs {
  /**
   * Read a utf8 file. Return `content: undefined` when it exceeds `maxBytes`
   * (still report `size`). Throw an error with `code: "ENOENT"` when missing.
   */
  read(path: string, maxBytes: number): Promise<{ content?: string; size: number }>;
  write(path: string, content: string): Promise<void>;
  remove(path: string): Promise<void>;
}

/** Recorder configuration (all injectable — see defaults below). */
export interface FileSnapshotConfig {
  /** Tool names eligible for capture. Default: {@link DEFAULT_SNAPSHOT_TOOL_IDS}. */
  readonly toolIds?: readonly string[];
  /** Arg keys holding the target path (first present wins). Default: {@link DEFAULT_SNAPSHOT_PATH_ARGS}. */
  readonly pathArgs?: readonly string[];
  /** Skip capturing content above this many bytes (existence is still recorded). Default: 1 MiB. */
  readonly maxContentBytes?: number;
  /** Max retained snapshots (drop-oldest). Default: 200. */
  readonly maxSnapshots?: number;
  /** Resolve relative target paths against this root. */
  readonly workspaceRoot?: string;
  /** Filesystem seam. Default: {@link createNodeFileSnapshotFs}. */
  readonly fs?: FileSnapshotFs;
}

/** Selects snapshots for `list()`/`undo()`. At least one field should match. */
export interface FileSnapshotFilter {
  readonly runId?: string;
  readonly step?: number;
  readonly path?: string;
  readonly toolCallId?: string;
}

/** One successful undo action. */
export interface FileSnapshotUndoEntry {
  readonly path: string;
  readonly action: "restored" | "removed";
}

/** One entry that could not be undone. */
export interface FileSnapshotUndoSkipped {
  readonly path: string;
  readonly reason: string;
}

/** Result of {@link FileSnapshotRecorder.undo}. */
export interface FileSnapshotUndoResult {
  readonly restored: readonly FileSnapshotUndoEntry[];
  readonly skipped: readonly FileSnapshotUndoSkipped[];
}

/** Input to {@link FileSnapshotRecorder.capture}. */
export interface FileSnapshotCaptureParams {
  readonly toolName: string;
  readonly input: unknown;
  readonly toolCallId: string;
  readonly step: number;
  readonly runId: string;
  /** Override the ISO timestamp source (tests). */
  readonly now?: () => string;
}

/** Default mutating tool names eligible for capture. */
export const DEFAULT_SNAPSHOT_TOOL_IDS = ["write_file", "edit_file", "apply_patch"] as const;

/** Default arg keys carrying the target file path. */
export const DEFAULT_SNAPSHOT_PATH_ARGS = ["filePath", "path"] as const;

/** Default content cap: 1 MiB (larger files record existence only). */
export const DEFAULT_SNAPSHOT_MAX_CONTENT_BYTES = 1_048_576;

/** Default bounded store size (drop-oldest). */
export const DEFAULT_SNAPSHOT_MAX_COUNT = 200;

/** Filesystem backed by `node:fs/promises`. */
export function createNodeFileSnapshotFs(): FileSnapshotFs {
  return {
    async read(path, maxBytes) {
      const info = await stat(path);
      if (info.size > maxBytes) return { size: info.size };
      const content = await readFile(path, "utf8");
      return { content, size: Buffer.byteLength(content, "utf8") };
    },
    async write(path, content) {
      await writeFile(path, content, "utf8");
    },
    async remove(path) {
      await rm(path, { force: true });
    },
  };
}

/**
 * Extract the target file paths a mutating tool call will touch:
 * structured `apply_patch` patches (via the G2.1 grammar — every
 * `*** Update/Add/Delete File:` path plus `*** Move to:` targets), otherwise
 * the first present path arg (`filePath`/`path` by default).
 * Returns `[]` when nothing extractable (caller skips capture).
 */
export function extractSnapshotPaths(
  toolName: string,
  input: unknown,
  config?: Pick<FileSnapshotConfig, "pathArgs">,
): readonly string[] {
  const record = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  if (toolName === "apply_patch" && typeof record.patch === "string") {
    const patch = record.patch;
    if (detectApplyPatchFormat(patch) === "structured") {
      try {
        const program = parseApplyPatch(patch, "lenient");
        const paths: string[] = [];
        for (const op of program.ops) {
          paths.push(op.path);
          if (op.kind === "update" && op.moveTo !== undefined) paths.push(op.moveTo);
        }
        return [...new Set(paths)];
      } catch {
        // Best-effort: fall through to path-arg extraction.
      }
    }
  }
  for (const key of config?.pathArgs ?? DEFAULT_SNAPSHOT_PATH_ARGS) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return [value];
  }
  return [];
}

/**
 * Bounded in-memory store of file pre-images with capture/undo.
 * Not thread-safe across concurrent captures of the same path (per-tool
 * captures are serialized by the step executor's approval flow).
 */
export class FileSnapshotRecorder {
  private readonly toolIds: ReadonlySet<string>;
  private readonly pathArgs: readonly string[];
  private readonly maxContentBytes: number;
  private readonly maxSnapshots: number;
  private readonly workspaceRoot: string | undefined;
  private readonly fs: FileSnapshotFs;
  private readonly snapshots: FileSnapshot[] = [];

  constructor(config: FileSnapshotConfig = {}) {
    this.toolIds = new Set(config.toolIds ?? DEFAULT_SNAPSHOT_TOOL_IDS);
    this.pathArgs = config.pathArgs ?? DEFAULT_SNAPSHOT_PATH_ARGS;
    this.maxContentBytes = config.maxContentBytes ?? DEFAULT_SNAPSHOT_MAX_CONTENT_BYTES;
    this.maxSnapshots = Math.max(1, config.maxSnapshots ?? DEFAULT_SNAPSHOT_MAX_COUNT);
    this.workspaceRoot = config.workspaceRoot;
    this.fs = config.fs ?? createNodeFileSnapshotFs();
  }

  /** Total retained snapshots (bounded by `maxSnapshots`, drop-oldest). */
  get size(): number {
    return this.snapshots.length;
  }

  /** Whether the given tool name is eligible for capture. */
  accepts(toolName: string): boolean {
    return this.toolIds.has(toolName);
  }

  /**
   * Capture pre-images for a mutating tool call (best-effort — never throws).
   * Returns the lightweight refs to attach to `tool.completed` metadata.
   */
  async capture(params: FileSnapshotCaptureParams): Promise<readonly FileSnapshotRef[]> {
    if (!this.accepts(params.toolName)) return [];
    const paths = extractSnapshotPaths(params.toolName, params.input, { pathArgs: this.pathArgs });
    if (paths.length === 0) return [];
    const at = (params.now ?? (() => new Date().toISOString()))();
    const refs: FileSnapshotRef[] = [];
    for (const rawPath of paths) {
      try {
        const path = this.resolvePath(rawPath);
        let existed = true;
        let content: string | undefined;
        let size = 0;
        try {
          const result = await this.fs.read(path, this.maxContentBytes);
          content = result.content;
          size = result.size;
        } catch (error) {
          if ((error as { code?: string }).code === "ENOENT") {
            existed = false;
          } else {
            continue; // unreadable (permissions, directory…) — skip this path
          }
        }
        this.snapshots.push({
          path,
          existed,
          ...(content !== undefined ? { content } : {}),
          size,
          toolCallId: params.toolCallId,
          toolName: params.toolName,
          step: params.step,
          runId: params.runId,
          at,
          undone: false,
        });
        while (this.snapshots.length > this.maxSnapshots) this.snapshots.shift();
        refs.push({ path, existed, hadPreImage: existed && content !== undefined });
      } catch {
        // Path resolution failure — never break the tool call.
      }
    }
    return refs;
  }

  /** List matching snapshots (copy — oldest first). */
  list(filter?: FileSnapshotFilter): readonly FileSnapshot[] {
    return this.snapshots.filter((s) => matches(s, filter));
  }

  /**
   * Undo matching, NOT-yet-undone snapshots, NEWEST FIRST.
   * Existing files → pre-image restored; tool-created files → removed;
   * entries without a captured pre-image → skipped with a reason.
   */
  async undo(filter: FileSnapshotFilter = {}): Promise<FileSnapshotUndoResult> {
    const target = this.snapshots
      .filter((s) => !s.undone && matches(s, filter))
      .sort((a, b) => b.at.localeCompare(a.at) || this.snapshots.indexOf(b) - this.snapshots.indexOf(a));
    const restored: FileSnapshotUndoEntry[] = [];
    const skipped: FileSnapshotUndoSkipped[] = [];
    for (const snapshot of target) {
      try {
        if (!snapshot.existed) {
          await this.fs.remove(snapshot.path);
          snapshot.undone = true;
          restored.push({ path: snapshot.path, action: "removed" });
        } else if (snapshot.content !== undefined) {
          await this.fs.write(snapshot.path, snapshot.content);
          snapshot.undone = true;
          restored.push({ path: snapshot.path, action: "restored" });
        } else {
          skipped.push({ path: snapshot.path, reason: "no pre-image captured (missing or over size cap)" });
        }
      } catch (error) {
        skipped.push({ path: snapshot.path, reason: error instanceof Error ? error.message : String(error) });
      }
    }
    return { restored, skipped };
  }

  /** Drop snapshots (all, or only a run's) — e.g. after session cleanup. */
  clear(runId?: string): void {
    if (runId === undefined) {
      this.snapshots.length = 0;
      return;
    }
    for (let i = this.snapshots.length - 1; i >= 0; i--) {
      if (this.snapshots[i]?.runId === runId) this.snapshots.splice(i, 1);
    }
  }

  private resolvePath(path: string): string {
    if (this.workspaceRoot === undefined || isAbsolute(path)) return path;
    return resolvePath(this.workspaceRoot, path);
  }
}

/** Factory mirroring the SDK's create* conventions. */
export function createFileSnapshotRecorder(config?: FileSnapshotConfig): FileSnapshotRecorder {
  return new FileSnapshotRecorder(config);
}

function matches(snapshot: FileSnapshot, filter: FileSnapshotFilter | undefined): boolean {
  if (filter === undefined) return true;
  if (filter.runId !== undefined && snapshot.runId !== filter.runId) return false;
  if (filter.step !== undefined && snapshot.step !== filter.step) return false;
  if (filter.path !== undefined && snapshot.path !== filter.path) return false;
  if (filter.toolCallId !== undefined && snapshot.toolCallId !== filter.toolCallId) return false;
  return true;
}
