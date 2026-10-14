import { describe, expect, it } from "vitest";
import type { RunEvent, RunId, TraceId } from "@vinhnt-sdk/schema";
import { isToolFailureEnvelope } from "@vinhnt-sdk/schema";
import type { ReplayOptions } from "../src/index.js";
import {
  InMemoryRunEventStore,
  replayRunFromStore,
  replayRunToMessages,
  replaySessionToMessages,
} from "../src/index.js";

const traceId = "trace_replay" as TraceId;

function makeEvent(
  runId: string,
  sequence: number,
  type: string,
  data: Record<string, unknown>,
  occurredAt?: string,
): RunEvent {
  return {
    id: `evt_${runId}_${sequence}`,
    runId: runId as RunId,
    sequence,
    type,
    occurredAt: occurredAt ?? new Date(1_700_000_000_000 + sequence * 1000).toISOString(),
    traceId,
    data,
  };
}

const READ_CALL = { id: "call-1", name: "read_file", args: { path: "a.txt" } };

describe("replayRunToMessages", () => {
  it("replays a full tool-calling run into a paired transcript", () => {
    const events = [
      makeEvent("run_1", 1, "run.started", { prompt: "read it", model: "m", provider: "p", sessionId: "ses_1" }),
      makeEvent("run_1", 2, "turn.started", { turn: 0 }),
      makeEvent("run_1", 3, "step.started", { turn: 0, step: 0 }),
      makeEvent("run_1", 4, "llm.request", { step: 0, model: "m" }),
      makeEvent("run_1", 5, "llm.response", {
        step: 0,
        content: "",
        toolCalls: [READ_CALL],
        usage: { inputTokens: 1, outputTokens: 1 },
        durationMs: 5,
      }),
      makeEvent("run_1", 6, "tool.invoked", { toolId: "call-1", toolName: "read_file", input: { path: "a.txt" } }),
      makeEvent("run_1", 7, "tool.completed", { toolId: "call-1", toolName: "read_file", output: "FILE_BODY" }),
      makeEvent("run_1", 8, "llm.response", {
        step: 1,
        content: "It says FILE_BODY",
        usage: { inputTokens: 2, outputTokens: 3 },
        durationMs: 4,
      }),
      makeEvent("run_1", 9, "run.completed", { status: "succeeded" }),
    ];

    const messages = replayRunToMessages(events);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant", "tool", "assistant"]);
    expect(messages[0]).toEqual({ role: "user", content: "read it" });
    expect(messages[1]!.toolCalls).toEqual([READ_CALL]);
    expect(messages[2]).toEqual({ role: "tool", toolCallId: "call-1", content: "FILE_BODY" });
    expect(messages[3]!.content).toBe("It says FILE_BODY");
  });

  it("sorts events by sequence before folding (out-of-order input)", () => {
    const response = makeEvent("run_1", 3, "llm.response", { content: "done", usage: {}, durationMs: 1 });
    const started = makeEvent("run_1", 1, "run.started", { prompt: "go" });
    const messages = replayRunToMessages([response, started]);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(messages[1]!.content).toBe("done");
  });

  it("redacts secrets from tool outputs by default (P1-7 parity)", () => {
    const rawKey = "sk-abc123def456ghi789jkl0";
    const events = [
      makeEvent("run_1", 1, "run.started", { prompt: "leak" }),
      makeEvent("run_1", 2, "llm.response", { content: "", toolCalls: [READ_CALL], usage: {}, durationMs: 1 }),
      makeEvent("run_1", 3, "tool.completed", { toolId: "call-1", toolName: "read_file", output: `key=${rawKey}` }),
      makeEvent("run_1", 4, "llm.response", { content: "ok", usage: {}, durationMs: 1 }),
    ];
    const [tool] = replayRunToMessages(events).filter((m) => m.role === "tool");
    expect(String(tool!.content)).toContain("[REDACTED");
    expect(String(tool!.content)).not.toContain(rawKey);
  });

  it("keeps raw tool output when redactToolOutputs is false", () => {
    const rawKey = "sk-abc123def456ghi789jkl0";
    const events = [
      makeEvent("run_1", 1, "run.started", { prompt: "leak" }),
      makeEvent("run_1", 2, "llm.response", { content: "", toolCalls: [READ_CALL], usage: {}, durationMs: 1 }),
      makeEvent("run_1", 3, "tool.completed", { toolId: "call-1", toolName: "read_file", output: `key=${rawKey}` }),
    ];
    const opts: ReplayOptions = { redactToolOutputs: false };
    const [tool] = replayRunToMessages(events, opts).filter((m) => m.role === "tool");
    expect(String(tool!.content)).toContain(rawKey);
  });

  it("maps tool.failed to a failure envelope (deny -> permission_denied hint)", () => {
    const events = [
      makeEvent("run_1", 1, "run.started", { prompt: "do it" }),
      makeEvent("run_1", 2, "llm.response", { content: "", toolCalls: [READ_CALL], usage: {}, durationMs: 1 }),
      makeEvent("run_1", 3, "tool.failed", { toolId: "call-1", toolName: "read_file", error: "boom", decision: "deny" }),
    ];
    const [tool] = replayRunToMessages(events).filter((m) => m.role === "tool");
    expect(isToolFailureEnvelope(String(tool!.content))).toBe(true);
    expect(String(tool!.content)).toContain('"error":"boom"');
    expect(String(tool!.content)).toContain("Ask the user for approval");
  });

  it("uses the generic unknown hint for failures without decision deny", () => {
    const events = [
      makeEvent("run_1", 1, "run.started", { prompt: "do it" }),
      makeEvent("run_1", 2, "llm.response", { content: "", toolCalls: [READ_CALL], usage: {}, durationMs: 1 }),
      makeEvent("run_1", 3, "tool.failed", { toolId: "call-1", toolName: "read_file", error: "kaput" }),
    ];
    const [tool] = replayRunToMessages(events).filter((m) => m.role === "tool");
    expect(String(tool!.content)).toContain('"error":"kaput"');
    expect(String(tool!.content)).toContain("Inspect the error");
  });

  it("strips dangling toolCalls and drops empty assistant turns", () => {
    const events = [
      makeEvent("run_1", 1, "run.started", { prompt: "hi" }),
      makeEvent("run_1", 2, "llm.response", { content: "", toolCalls: [READ_CALL], usage: {}, durationMs: 1 }),
      makeEvent("run_1", 3, "run.completed", { status: "cancelled" }),
    ];
    const messages = replayRunToMessages(events);
    expect(messages.map((m) => m.role)).toEqual(["user"]);
  });

  it("keeps partial toolCalls: strips only unresolved entries", () => {
    const second = { id: "call-2", name: "write_file", args: { path: "b.txt" } };
    const events = [
      makeEvent("run_1", 1, "run.started", { prompt: "hi" }),
      makeEvent("run_1", 2, "llm.response", { content: "working", toolCalls: [READ_CALL, second], usage: {}, durationMs: 1 }),
      makeEvent("run_1", 3, "tool.completed", { toolId: "call-1", toolName: "read_file", output: "A" }),
    ];
    const messages = replayRunToMessages(events);
    const assistant = messages.find((m) => m.role === "assistant");
    expect(assistant!.toolCalls).toEqual([READ_CALL]);
    expect(assistant!.content).toBe("working");
  });

  it("drops orphan tool results with no preceding declaration", () => {
    const events = [
      makeEvent("run_1", 1, "run.started", { prompt: "hi" }),
      makeEvent("run_1", 2, "tool.completed", { toolId: "call-9", toolName: "ghost", output: "x" }),
      makeEvent("run_1", 3, "llm.response", { content: "ok", usage: {}, durationMs: 1 }),
    ];
    const messages = replayRunToMessages(events);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("ignores tool.cancelled (aborted runs persist no tool message)", () => {
    const events = [
      makeEvent("run_1", 1, "run.started", { prompt: "hi" }),
      makeEvent("run_1", 2, "llm.response", { content: "", toolCalls: [READ_CALL], usage: {}, durationMs: 1 }),
      makeEvent("run_1", 3, "tool.cancelled", { toolId: "call-1", toolName: "read_file" }),
    ];
    const messages = replayRunToMessages(events);
    expect(messages.map((m) => m.role)).toEqual(["user"]);
  });

  it("skips empty llm.response events", () => {
    const events = [
      makeEvent("run_1", 1, "run.started", { prompt: "hi" }),
      makeEvent("run_1", 2, "llm.response", { content: "", usage: {}, durationMs: 1 }),
      makeEvent("run_1", 3, "llm.response", { content: "answer", usage: {}, durationMs: 1 }),
    ];
    const messages = replayRunToMessages(events);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(messages[1]!.content).toBe("answer");
  });

  it("handles runs without run.started (resume fragments)", () => {
    const events = [
      makeEvent("run_2", 4, "llm.response", { content: "continued", usage: {}, durationMs: 1 }),
    ];
    const messages = replayRunToMessages(events);
    expect(messages.map((m) => m.role)).toEqual(["assistant"]);
    expect(messages[0]!.content).toBe("continued");
  });

  it("keeps duplicate declarations guarded against double results", () => {
    const events = [
      makeEvent("run_1", 1, "run.started", { prompt: "hi" }),
      makeEvent("run_1", 2, "llm.response", { content: "", toolCalls: [READ_CALL], usage: {}, durationMs: 1 }),
      makeEvent("run_1", 3, "tool.completed", { toolId: "call-1", toolName: "read_file", output: "A" }),
      makeEvent("run_1", 4, "tool.completed", { toolId: "call-1", toolName: "read_file", output: "B" }),
      makeEvent("run_1", 5, "llm.response", { content: "done", usage: {}, durationMs: 1 }),
    ];
    const messages = replayRunToMessages(events);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant", "tool", "assistant"]);
    expect(messages[2]!.content).toBe("A");
  });
});

describe("replayRunFromStore", () => {
  it("replays a run from the event store", async () => {
    const store = new InMemoryRunEventStore();
    await store.append(makeEvent("run_1", 1, "run.started", { prompt: "read it", sessionId: "ses_1" }));
    await store.append(makeEvent("run_1", 2, "llm.response", { content: "ok", usage: {}, durationMs: 1 }));

    const messages = await replayRunFromStore(store, "run_1" as RunId);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
  });
});

describe("replaySessionToMessages", () => {
  it("merges a session's runs chronologically and filters other sessions", async () => {
    const store = new InMemoryRunEventStore();
    // Legacy run: no sessionId on run.started — attributed via snapshot.
    await store.append(makeEvent("run_legacy", 1, "run.started", { prompt: "first" }, "2026-01-01T00:00:00.000Z"));
    await store.append(makeEvent("run_legacy", 2, "llm.response", { content: "answer 1", usage: {}, durationMs: 1 }, "2026-01-01T00:00:01.000Z"));
    await store.saveSnapshot("run_legacy", { sessionId: "ses_A" });

    // Modern run: sessionId on run.started.
    await store.append(makeEvent("run_a", 1, "run.started", { prompt: "second", sessionId: "ses_A" }, "2026-01-02T00:00:00.000Z"));
    await store.append(makeEvent("run_a", 2, "llm.response", { content: "answer 2", usage: {}, durationMs: 1 }, "2026-01-02T00:00:01.000Z"));

    // Other session — must not leak in.
    await store.append(makeEvent("run_b", 1, "run.started", { prompt: "other", sessionId: "ses_B" }, "2026-01-03T00:00:00.000Z"));

    const messages = await replaySessionToMessages(store, "ses_A");
    expect(messages.map((m) => `${m.role}:${String(m.content)}`)).toEqual([
      "user:first",
      "assistant:answer 1",
      "user:second",
      "assistant:answer 2",
    ]);
  });

  it("includes resumed run fragments attributed only by snapshot", async () => {
    const store = new InMemoryRunEventStore();
    await store.append(makeEvent("run_resume", 7, "llm.response", { content: "fragment", usage: {}, durationMs: 1 }, "2026-01-05T00:00:00.000Z"));
    await store.saveSnapshot("run_resume", { sessionId: "ses_A" });

    const messages = await replaySessionToMessages(store, "ses_A");
    expect(messages.map((m) => m.role)).toEqual(["assistant"]);
    expect(messages[0]!.content).toBe("fragment");
  });

  it("returns empty for a session with no runs", async () => {
    const store = new InMemoryRunEventStore();
    const messages = await replaySessionToMessages(store, "ses_none");
    expect(messages).toEqual([]);
  });
});
