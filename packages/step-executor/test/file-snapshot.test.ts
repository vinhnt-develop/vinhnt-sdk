import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";
import { StepExecutor } from "../src/step-executor.js";
import type { StepExecutorDeps } from "../src/step-executor.js";
import {
  FileSnapshotRecorder,
  createFileSnapshotRecorder,
  extractSnapshotPaths,
  DEFAULT_SNAPSHOT_TOOL_IDS,
} from "../src/index.js";
import type { FileSnapshotFs, FileSnapshotConfig, FileSnapshotFilter, FileSnapshotRef } from "../src/index.js";
import type { RunId, ChatMessage, KnownRunEvent } from "@vinhnt-sdk/schema";

/** In-memory fs seam — keyed by exact path, ENOENT via `code`. */
function memFs(files: Record<string, string> = {}): { fs: FileSnapshotFs; files: Record<string, string> } {
  return {
    files,
    fs: {
      async read(path, maxBytes) {
        const content = files[path];
        if (content === undefined) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
        const size = Buffer.byteLength(content, "utf8");
        if (size > maxBytes) return { size };
        return { content, size };
      },
      async write(path, content) {
        files[path] = content;
      },
      async remove(path) {
        delete files[path];
      },
    },
  };
}

describe("FileSnapshotRecorder (G7.2 / P2-3)", () => {
  it("captures an existing file pre-image with grouping metadata", async () => {
    const { fs, files } = memFs({ "/w/a.txt": "ORIG" });
    const recorder = createFileSnapshotRecorder({ fs });
    const refs = await recorder.capture({
      toolName: "write_file",
      input: { filePath: "/w/a.txt", content: "NEW" },
      toolCallId: "tc1",
      step: 3,
      runId: "run1",
      now: () => "2026-10-13T00:00:00.000Z",
    });

    expect(refs).toEqual([{ path: "/w/a.txt", existed: true, hadPreImage: true }]);
    const [snapshot] = recorder.list();
    expect(snapshot).toMatchObject({
      path: "/w/a.txt",
      existed: true,
      content: "ORIG",
      size: 4,
      toolCallId: "tc1",
      toolName: "write_file",
      step: 3,
      runId: "run1",
      at: "2026-10-13T00:00:00.000Z",
      undone: false,
    });
    expect(files["/w/a.txt"]).toBe("ORIG"); // capture never mutates
  });

  it("captures a missing file as existed:false", async () => {
    const { fs } = memFs();
    const recorder = new FileSnapshotRecorder({ fs });
    const refs = await recorder.capture({
      toolName: "write_file",
      input: { path: "/w/new.txt" },
      toolCallId: "tc1",
      step: 1,
      runId: "run1",
    });
    expect(refs).toEqual([{ path: "/w/new.txt", existed: false, hadPreImage: false }]);
    expect(recorder.list()[0]).toMatchObject({ existed: false, size: 0 });
    expect(recorder.list()[0]?.content).toBeUndefined();
  });

  it("ignores non-snapshot tools and calls without a path", async () => {
    const { fs } = memFs({ "/w/a.txt": "x" });
    const recorder = new FileSnapshotRecorder({ fs });
    expect(DEFAULT_SNAPSHOT_TOOL_IDS).toContain("write_file");
    expect(recorder.accepts("read_file")).toBe(false);
    expect(
      await recorder.capture({ toolName: "read_file", input: { path: "/w/a.txt" }, toolCallId: "t", step: 1, runId: "r" }),
    ).toEqual([]);
    expect(
      await recorder.capture({ toolName: "write_file", input: {}, toolCallId: "t", step: 1, runId: "r" }),
    ).toEqual([]);
    expect(recorder.size).toBe(0);
  });

  it("resolves relative paths against workspaceRoot", async () => {
    const root = resolvePath("/ws");
    const key = join(root, "sub", "a.txt");
    const { fs, files } = memFs({ [key]: "v" });
    const recorder = createFileSnapshotRecorder({ fs, workspaceRoot: root });
    const refs = await recorder.capture({
      toolName: "edit_file",
      input: { filePath: "sub/a.txt" },
      toolCallId: "t",
      step: 1,
      runId: "r",
    });
    expect(refs[0]?.path).toBe(key);
    expect(files[key]).toBe("v");
  });

  it("records existence only when content exceeds maxContentBytes", async () => {
    const { fs } = memFs({ "/w/big.txt": "0123456789" });
    const recorder = createFileSnapshotRecorder({ fs, maxContentBytes: 4 });
    const refs = await recorder.capture({
      toolName: "write_file",
      input: { path: "/w/big.txt" },
      toolCallId: "t",
      step: 1,
      runId: "r",
    });
    expect(refs).toEqual([{ path: "/w/big.txt", existed: true, hadPreImage: false }]);
    expect(recorder.list()[0]?.content).toBeUndefined();
    expect(recorder.list()[0]?.size).toBe(10);
  });

  it("bounds the store drop-oldest", async () => {
    const { fs } = memFs({ "/w/a.txt": "1", "/w/b.txt": "2", "/w/c.txt": "3" });
    const recorder = createFileSnapshotRecorder({ fs, maxSnapshots: 2 });
    for (const p of ["/w/a.txt", "/w/b.txt", "/w/c.txt"]) {
      await recorder.capture({ toolName: "write_file", input: { path: p }, toolCallId: "t", step: 1, runId: "r" });
    }
    expect(recorder.size).toBe(2);
    expect(recorder.list().map((s) => s.path)).toEqual(["/w/b.txt", "/w/c.txt"]);
  });

  it("undo restores pre-images, removes created files, and runs newest-first", async () => {
    const { fs, files } = memFs({ "/w/a.txt": "A1", "/w/b.txt": "B1" });
    const recorder = createFileSnapshotRecorder({ fs });
    await recorder.capture({ toolName: "write_file", input: { path: "/w/a.txt" }, toolCallId: "t1", step: 1, runId: "r" });
    await recorder.capture({ toolName: "write_file", input: { path: "/w/new.txt" }, toolCallId: "t2", step: 1, runId: "r" });
    await recorder.capture({ toolName: "edit_file", input: { path: "/w/b.txt" }, toolCallId: "t3", step: 2, runId: "r" });
    files["/w/a.txt"] = "A2";
    files["/w/b.txt"] = "B2";
    files["/w/new.txt"] = "created";

    const result = await recorder.undo({ runId: "r" });

    expect(result.skipped).toEqual([]);
    expect(result.restored).toEqual([
      { path: "/w/b.txt", action: "restored" },
      { path: "/w/new.txt", action: "removed" },
      { path: "/w/a.txt", action: "restored" },
    ]);
    expect(files["/w/a.txt"]).toBe("A1");
    expect(files["/w/b.txt"]).toBe("B1");
    expect(files["/w/new.txt"]).toBeUndefined();

    // All entries marked undone — a second undo is a no-op.
    const again = await recorder.undo({ runId: "r" });
    expect(again.restored).toEqual([]);
    expect(again.skipped).toEqual([]);
  });

  it("skips entries without a captured pre-image and reports fs failures", async () => {
    const { fs, files } = memFs({ "/w/capped.txt": "xx" });
    const recorder = createFileSnapshotRecorder({ fs, maxContentBytes: 1 });
    await recorder.capture({ toolName: "write_file", input: { path: "/w/capped.txt" }, toolCallId: "t", step: 1, runId: "r" });
    await recorder.capture({ toolName: "write_file", input: { path: "/w/created.txt" }, toolCallId: "t", step: 1, runId: "r" });
    // Make undo's remove throw for the created file.
    const failing: FileSnapshotFs = {
      ...fs,
      async remove() {
        throw new Error("disk gone");
      },
    };
    const failingRecorder = new FileSnapshotRecorder({
      fs: failing,
      maxContentBytes: 1,
    });
    await failingRecorder.capture({ toolName: "write_file", input: { path: "/w/created.txt" }, toolCallId: "t", step: 1, runId: "r" });

    const capped = await recorder.undo({});
    expect(capped.restored.map((r) => r.action)).toEqual(["removed"]); // created.txt
    expect(capped.skipped).toEqual([
      { path: "/w/capped.txt", reason: "no pre-image captured (missing or over size cap)" },
    ]);

    const failed = await failingRecorder.undo({});
    expect(failed.restored).toEqual([]);
    expect(failed.skipped[0]?.reason).toContain("disk gone");
    delete files["/w/capped.txt"];
  });

  it("filters list/undo by step, path, toolCallId; clear(runId) drops a run", async () => {
    const { fs, files } = memFs({ "/w/a.txt": "A", "/w/b.txt": "B" });
    const recorder = createFileSnapshotRecorder({ fs });
    await recorder.capture({ toolName: "write_file", input: { path: "/w/a.txt" }, toolCallId: "ta", step: 1, runId: "r1" });
    await recorder.capture({ toolName: "write_file", input: { path: "/w/b.txt" }, toolCallId: "tb", step: 2, runId: "r2" });

    expect(recorder.list({ step: 2 }).map((s) => s.path)).toEqual(["/w/b.txt"]);
    expect(recorder.list({ toolCallId: "ta" })).toHaveLength(1);
    const filter: FileSnapshotFilter = { path: "/w/a.txt" };
    expect(recorder.list(filter)).toHaveLength(1);

    const partial = await recorder.undo({ path: "/w/a.txt" });
    expect(partial.restored).toEqual([{ path: "/w/a.txt", action: "restored" }]);
    expect(files["/w/a.txt"]).toBe("A");

    recorder.clear("r2");
    expect(recorder.size).toBe(1);
    recorder.clear();
    expect(recorder.size).toBe(0);
  });

  it("extractSnapshotPaths handles structured apply_patch, legacy, and path aliases", () => {
    const structured =
      "*** Begin Patch\n" +
      "*** Update File: src/a.ts\n" +
      "@@\n-old\n+new\n" +
      "*** Move to: src/renamed.ts\n" +
      "*** Add File: src/b.ts\n" +
      "+line\n" +
      "*** Delete File: src/c.ts\n" +
      "*** End Patch";
    expect([...extractSnapshotPaths("apply_patch", { patch: structured })].sort()).toEqual([
      "src/a.ts",
      "src/b.ts",
      "src/c.ts",
      "src/renamed.ts",
    ]);
    // legacy SEARCH/REPLACE: paths come from the path arg
    expect(extractSnapshotPaths("apply_patch", { patch: "<<<<<<< SEARCH\nx\n=======\ny\n>>>>>>> REPLACE", filePath: "old.ts" })).toEqual([
      "old.ts",
    ]);
    expect(extractSnapshotPaths("write_file", { path: "p1.ts" })).toEqual(["p1.ts"]);
    expect(extractSnapshotPaths("edit_file", { filePath: "p2.ts", path: "ignored.ts" })).toEqual(["p2.ts"]);
    expect(extractSnapshotPaths("write_file", { content: "x" })).toEqual([]);
  });
});

describe("StepExecutor + FileSnapshotRecorder integration (G7.2)", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "vnt-snap-"));
  });
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  function makeDeps(overrides: Partial<StepExecutorDeps> = {}): { deps: StepExecutorDeps; events: KnownRunEvent[] } {
    const events: KnownRunEvent[] = [];
    const deps = {
      store: {
        emitEvent: vi.fn(async (event: KnownRunEvent) => {
          events.push(event);
        }),
      },
      addSessionMessage: vi.fn(),
      pluginManager: { fireHook: vi.fn() } as never,
      permissionGate: {
        checkTool: vi.fn().mockReturnValue({ allowed: true }),
        askForTool: vi.fn().mockResolvedValue("once" as const),
        checkSavedApproval: vi.fn().mockReturnValue(false),
        hasSavedRejection: vi.fn().mockReturnValue(false),
        saveApproval: vi.fn(),
      } as never,
      modelCaller: { callModelStream: vi.fn() } as never,
      maxToolCallsPerStep: 20,
      maxSelfCorrectAttempts: 2,
      selfCorrectOnFailure: false,
      currentAgent: undefined,
      saga: new (class {
        record(): void {}
        registerCompensation(): void {}
      })(),
      findTool: vi.fn(),
      hasTool: vi.fn().mockReturnValue(false),
      ...overrides,
    } as unknown as StepExecutorDeps;
    return { deps, events };
  }

  async function runOne(executor: StepExecutor, args: Record<string, unknown>): Promise<void> {
    await executor.executeToolCalls(
      [{ toolId: "tc1", toolName: "write_file", args }],
      [] as ChatMessage[],
      1,
      "run_snap" as RunId,
      { traceId: "trace1" } as never,
      new AbortController(),
      "sess1",
      { model: "fake" } as never,
    );
  }

  it("captures pre-image before execution, attaches refs to tool.completed metadata, undo restores", async () => {
    const file = join(tmp, "f.txt");
    await writeFile(file, "ORIG", "utf8");
    const recorder = createFileSnapshotRecorder({ workspaceRoot: tmp });

    const execute = vi.fn(async () => {
      await writeFile(file, "NEW", "utf8");
      return "wrote";
    });
    const { deps, events } = makeDeps({ fileSnapshots: recorder });
    (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "write" });
    const executor = new StepExecutor(deps);

    await runOne(executor, { filePath: file, content: "NEW" });

    // Pre-image captured (BEFORE the tool mutated the file).
    const [snapshot] = recorder.list();
    expect(snapshot).toMatchObject({ path: file, existed: true, content: "ORIG", step: 1, runId: "run_snap" });

    // tool.completed carries refs (never content) under metadata.fileSnapshots.
    const completed = events.find((e) => e.type === "tool.completed");
    const metadata = (completed?.data as { metadata?: { fileSnapshots?: FileSnapshotRef[] } }).metadata;
    expect(metadata?.fileSnapshots).toEqual([{ path: file, existed: true, hadPreImage: true }]);

    // Undo restores the pre-image.
    await writeFile(file, "NEWER", "utf8");
    const result = await recorder.undo({ runId: "run_snap" });
    expect(result.restored).toEqual([{ path: file, action: "restored" }]);
    expect(await readFile(file, "utf8")).toBe("ORIG");
  });

  it("non-snapshot tools produce no metadata and no snapshots", async () => {
    const recorder = createFileSnapshotRecorder({ workspaceRoot: tmp });
    const execute = vi.fn(async () => "ok");
    const { deps, events } = makeDeps({ fileSnapshots: recorder });
    (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "write" });
    const executor = new StepExecutor(deps);

    await executor.executeToolCalls(
      [{ toolId: "tc1", toolName: "echo_tool", args: { message: "hi" } }],
      [] as ChatMessage[],
      1,
      "run_snap" as RunId,
      { traceId: "trace1" } as never,
      new AbortController(),
      "sess1",
      { model: "fake" } as never,
    );

    expect(recorder.size).toBe(0);
    const completed = events.find((e) => e.type === "tool.completed");
    expect((completed?.data as { metadata?: unknown }).metadata).toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("no recorder configured → baseline behavior (no metadata)", async () => {
    const execute = vi.fn(async () => "ok");
    const { deps, events } = makeDeps();
    (deps.findTool as ReturnType<typeof vi.fn>).mockReturnValue({ execute, risk: "read" });
    const executor = new StepExecutor(deps);

    await executor.executeToolCalls(
      [{ toolId: "tc1", toolName: "write_file", args: { path: "x.txt" } }],
      [] as ChatMessage[],
      1,
      "run_snap" as RunId,
      { traceId: "trace1" } as never,
      new AbortController(),
      "sess1",
      { model: "fake" } as never,
    );

    const completed = events.find((e) => e.type === "tool.completed");
    expect((completed?.data as { metadata?: unknown }).metadata).toBeUndefined();
  });
});
