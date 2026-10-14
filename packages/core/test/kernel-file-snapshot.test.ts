import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AgentKernel } from "../src/kernel/kernel.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeTool } from "../src/fakes/fake-tool.js";
import type {
  FileSnapshot,
  FileSnapshotRef,
  FileSnapshotConfig,
  FileSnapshotFilter,
  FileSnapshotUndoResult,
} from "../src/index.js";
import type { RequestContext, RequestId, TraceId } from "@vinhnt-sdk/schema";

const testCtx: RequestContext = {
  requestId: "req_g72" as RequestId,
  traceId: "trace_g72" as TraceId,
  actorId: "test",
  tenantId: "default",
};

describe("kernel fileSnapshot config (G7.2 / P2-3)", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "vnt-kernel-snap-"));
  });
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  function offKernel(overrides: Record<string, unknown> = {}): AgentKernel {
    return new AgentKernel({
      model: new FakeModelProvider([{ content: "hi", provider: "fake" }]),
      store: new FakeRunEventStore(),
      tools: [],
      maxSteps: 2,
      ...overrides,
    });
  }

  it("config omitted → accessors return empty results", async () => {
    const kernel = offKernel();
    expect(kernel.getFileSnapshots()).toEqual([]);
    const filter: FileSnapshotFilter = { toolCallId: "tc1" };
    expect(kernel.getFileSnapshots(filter)).toEqual([]);
    const undo: FileSnapshotUndoResult = await kernel.undoFileSnapshots({});
    expect(undo).toEqual({ restored: [], skipped: [] });
  });

  it("fileSnapshot:false behaves like off", async () => {
    const kernel = offKernel({ fileSnapshot: false });
    expect(kernel.getFileSnapshots()).toEqual([]);
    expect(await kernel.undoFileSnapshots()).toEqual({ restored: [], skipped: [] });
  });

  it("opt-in captures the pre-image during a run; undo restores the file", async () => {
    const file = join(tmp, "f.txt");
    await writeFile(file, "ORIG", "utf8");

    const writeTool = new FakeTool(
      "write_file",
      async () => {
        await writeFile(file, "NEW", "utf8");
        return "wrote";
      },
      undefined,
      "write",
    );
    const model = new FakeModelProvider([
      { content: "", provider: "fake", toolCalls: [{ id: "c1", name: "write_file", args: { filePath: "f.txt" } }] },
      { content: "done", provider: "fake", toolCalls: [] },
    ]);
    const kernel = new AgentKernel({
      model,
      store: new FakeRunEventStore(),
      tools: [writeTool],
      maxSteps: 3,
      fileSnapshot: { workspaceRoot: tmp } satisfies FileSnapshotConfig,
      permissions: { permissionMode: "acceptEdits" },
    });

    const handle = kernel.createRunHandle("write f.txt", testCtx);
    const result = await handle.completed;
    expect(result.status).toBe("succeeded");

    // Pre-image captured before the tool overwrote the file.
    const snaps = kernel.getFileSnapshots();
    expect(snaps).toHaveLength(1);
    const snap: FileSnapshot | undefined = snaps[0];
    expect(snap).toMatchObject({ path: file, existed: true, content: "ORIG", toolCallId: "c1", runId: handle.runId });
    expect(await readFile(file, "utf8")).toBe("NEW");

    // Refs (no content) reconstructible from a snapshot — what rides tool.completed.
    const refs: FileSnapshotRef[] = snaps.map((s) => ({
      path: s.path,
      existed: s.existed,
      hadPreImage: s.content !== undefined,
    }));
    expect(refs).toEqual([{ path: file, existed: true, hadPreImage: true }]);

    // Undo via the kernel accessor restores the original content.
    const undo = await kernel.undoFileSnapshots({ runId: handle.runId });
    expect(undo.restored).toEqual([{ path: file, action: "restored" }]);
    expect(await readFile(file, "utf8")).toBe("ORIG");
    expect(kernel.getFileSnapshots()[0]?.undone).toBe(true);
  });

  it("opt-in with a boolean true works (default tool ids, no workspaceRoot needed)", async () => {
    const file = join(tmp, "created.txt");
    const writeTool = new FakeTool(
      "write_file",
      async () => {
        await writeFile(file, "content", "utf8");
        return "created";
      },
      undefined,
      "write",
    );
    const model = new FakeModelProvider([
      { content: "", provider: "fake", toolCalls: [{ id: "c1", name: "write_file", args: { path: file } }] },
      { content: "done", provider: "fake", toolCalls: [] },
    ]);
    const kernel = new AgentKernel({
      model,
      store: new FakeRunEventStore(),
      tools: [writeTool],
      maxSteps: 3,
      fileSnapshot: true,
      permissions: { permissionMode: "acceptEdits" },
    });

    const result = await kernel.createRunHandle("create file", testCtx).completed;
    expect(result.status).toBe("succeeded");

    // Tool created a NEW file → existed:false → undo removes it.
    const snaps = kernel.getFileSnapshots();
    expect(snaps[0]).toMatchObject({ path: file, existed: false });
    expect(await readFile(file, "utf8")).toBe("content");
    const undo = await kernel.undoFileSnapshots({});
    expect(undo.restored).toEqual([{ path: file, action: "removed" }]);
    await expect(readFile(file, "utf8")).rejects.toThrow();
  });
});
