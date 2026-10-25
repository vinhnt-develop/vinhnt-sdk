/**
 * TC33 — Session adapter unit tests.
 *
 * Covers: runStateToSnapshot, snapshotToRunState roundtrip,
 * snapshotFromDefinition, applyDeltaToSnapshot, SessionStoreCheckpointer
 * with mock event store.
 */

import { describe, it, expect } from "vitest";
import {
  runStateToSnapshot,
  snapshotToRunState,
  snapshotFromDefinition,
  applyDeltaToSnapshot,
  SessionStoreCheckpointer,
} from "../src/state/session-adapter.js";
import { createRunState } from "@vinhnt-sdk/session";
import type { SerializedRunState } from "@vinhnt-sdk/session";
import {
  StateGraphBuilder,
} from "../src/state/graph-state.js";
import {
  createChannel,
  overwriteReducer,
} from "../src/state/channel.js";
import type { GraphConfig } from "../src/state/checkpoint.js";

const config: GraphConfig = { threadId: "session_1", checkpointNs: "" };

describe("TC33_session_adapter", () => {
  it("TC33_01_runStateToSnapshot_packs_fields", () => {
    const runState: SerializedRunState = createRunState({
      prompt: "hello",
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello there" },
      ],
      step: 3,
      toolCallCount: 2,
      model: "gpt-4",
      provider: "openai",
      agentId: "agent_1",
      totalInputTokens: 100,
      totalOutputTokens: 50,
      finalOutput: "done",
      sessionId: "session_1",
      runId: "run_1",
    });

    const snap = runStateToSnapshot(runState, config);
    expect(snap.config.threadId).toBe("session_1");
    expect(snap.values.messages).toEqual(runState.messages);
    expect(snap.values.step).toBe(3);
    expect(snap.values.toolCallCount).toBe(2);
    expect(snap.values.model).toBe("gpt-4");
    expect(snap.values.provider).toBe("openai");
    expect(snap.values.agentId).toBe("agent_1");
    expect(snap.values.totalInputTokens).toBe(100);
    expect(snap.values.totalOutputTokens).toBe(50);
    expect(snap.values.finalOutput).toBe("done");
    expect(snap.metadata.source).toBe("run-state");
    expect(snap.metadata.version).toBe(1);
    expect(snap.metadata.runId).toBe("run_1");
    expect(snap.next).toEqual([]);
  });

  it("TC33_02_snapshotToRunState_roundtrip", () => {
    const runState: SerializedRunState = createRunState({
      prompt: "hello",
      messages: [{ role: "user", content: "hi" }],
      step: 5,
      toolCallCount: 1,
      model: "claude-3",
      agentId: "agent_99",
      finalOutput: "final",
    });

    const snap = runStateToSnapshot(runState, config);
    const restored = snapshotToRunState(snap);

    expect(restored.messages).toEqual(runState.messages);
    expect(restored.step).toBe(5);
    expect(restored.toolCallCount).toBe(1);
    expect(restored.model).toBe("claude-3");
    expect(restored.agentId).toBe("agent_99");
    expect(restored.finalOutput).toBe("final");
    expect(restored.sessionId).toBe("session_1");
    expect(restored.version).toBe(1);
  });

  it("TC33_03_snapshotToRunState_minimal", () => {
    const snap = runStateToSnapshot(
      createRunState({ prompt: "x", messages: [], step: 0, toolCallCount: 0 }),
      config,
    );
    const restored = snapshotToRunState(snap);
    expect(restored.messages).toEqual([]);
    expect(restored.step).toBe(0);
    expect(restored.toolCallCount).toBe(0);
    expect(restored.sessionId).toBe("session_1");
  });

  it("TC33_04_snapshotFromDefinition_defaults", () => {
    const builder = new StateGraphBuilder("g1", "G1");
    builder.addChannel("counter", createChannel<number>("counter", 0, {
      reducer: overwriteReducer(),
      default: 0,
    }));
    builder.addChannel("log", createChannel<string[]>("log", [], {
      reducer: (cur, delta) => [...cur, ...delta],
      default: [],
    }));
    const def = builder.build();

    const snap = snapshotFromDefinition(def, config);
    expect(snap.config.threadId).toBe("session_1");
    expect(snap.values.counter).toBe(0);
    expect(snap.values.log).toEqual([]);
    expect(snap.next).toEqual([]);
    expect(snap.metadata.source).toBe("definition");
    expect(snap.metadata.graphId).toBe("g1");
  });

  it("TC33_05_applyDeltaToSnapshot_updates_values", () => {
    const builder = new StateGraphBuilder("g2", "G2");
    builder.addChannel("counter", createChannel<number>("counter", 0, {
      reducer: overwriteReducer(),
      default: 0,
    }));
    const def = builder.build();

    const snap = snapshotFromDefinition(def, config);
    const next = applyDeltaToSnapshot(def, snap, { counter: 42 });
    expect(next.values.counter).toBe(42);
    expect(next.metadata.source).toBe("definition");
    expect(next.createdAt).toBeDefined();
  });

  it("TC33_06_sessionStoreCheckpointer_save_and_get", async () => {
    const snapshots = new Map<string, Record<string, unknown>>();
    const eventStore = {
      saveSnapshot: async (_runId: string, state: Record<string, unknown>) => {
        snapshots.set(_runId, state);
      },
      getSnapshot: async (_runId: string) => {
        const s = snapshots.get(_runId);
        return s ? { state: s } : null;
      },
    };

    const cp = new SessionStoreCheckpointer(eventStore);
    const snap = runStateToSnapshot(
      createRunState({
        prompt: "p",
        messages: [{ role: "user", content: "m" }],
        step: 1,
        toolCallCount: 0,
      }),
      { threadId: "run_abc", checkpointNs: "" },
    );

    await cp.put({ threadId: "run_abc", checkpointNs: "" }, snap);
    const tuple = await cp.getTuple({ threadId: "run_abc", checkpointNs: "" });
    expect(tuple).not.toBeNull();
    expect(tuple!.values.step).toBe(1);
    expect(tuple!.values.messages).toEqual([
      { role: "user", content: "m" },
    ]);
    expect(tuple!.config.checkpointId).toBeDefined();

    const list = await cp.list("run_abc");
    expect(list).toHaveLength(1);
  });

  it("TC33_07_sessionStoreCheckpointer_get_missing_returns_null", async () => {
    const eventStore = {
      saveSnapshot: async () => {},
      getSnapshot: async () => null,
    };
    const cp = new SessionStoreCheckpointer(eventStore);
    const tuple = await cp.getTuple({
      threadId: "nope",
      checkpointNs: "",
    });
    expect(tuple).toBeNull();
  });
});
