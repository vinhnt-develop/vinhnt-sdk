import { describe, expect, it } from "vitest";
import { ValidationError } from "@vinhnt-sdk/schema";
import type { ChatMessage } from "@vinhnt-sdk/schema";
import type { SerializedRunState, SerializedRunStateInit } from "../src/index.js";
import {
  InMemorySessionState,
  RUN_STATE_VERSION,
  createRunState,
  parseRunState,
  runStateFromSessionState,
  serializeRunState,
  sessionStateFromRunState,
} from "../src/index.js";

const HISTORY: ChatMessage[] = [
  { role: "user", content: "first question" },
  {
    role: "assistant",
    content: "",
    toolCalls: [{ id: "call-1", name: "read_file", args: { path: "a.txt" } }],
  },
  { role: "tool", toolCallId: "call-1", content: "FILE_BODY" },
  { role: "assistant", content: "here it is" },
];

describe("createRunState", () => {
  it("applies defaults", () => {
    const state = createRunState({ prompt: "hello" });
    expect(state.version).toBe(RUN_STATE_VERSION);
    expect(state.step).toBe(0);
    expect(state.toolCallCount).toBe(0);
    expect(state.messages).toEqual([]);
    expect(typeof state.savedAt).toBe("string");
    expect(state.sessionId).toBeUndefined();
  });

  it("captures explicit fields", () => {
    const init: SerializedRunStateInit = {
      prompt: "next",
      messages: HISTORY,
      step: 3,
      toolCallCount: 7,
      sessionId: "ses_1",
      runId: "run_1",
      model: "gpt-x",
      provider: "openai",
      agentId: "agent-1",
      totalInputTokens: 100,
      totalOutputTokens: 50,
      finalOutput: "done",
    };
    const state = createRunState(init);
    expect(state.messages).toEqual(HISTORY);
    expect(state.step).toBe(3);
    expect(state.toolCallCount).toBe(7);
    expect(state.sessionId).toBe("ses_1");
    expect(state.runId).toBe("run_1");
    expect(state.model).toBe("gpt-x");
    expect(state.provider).toBe("openai");
    expect(state.agentId).toBe("agent-1");
    expect(state.totalInputTokens).toBe(100);
    expect(state.totalOutputTokens).toBe(50);
    expect(state.finalOutput).toBe("done");
  });
});

describe("serializeRunState / parseRunState", () => {
  it("round-trips through JSON", () => {
    const state = createRunState({
      prompt: "next",
      messages: HISTORY,
      step: 2,
      toolCallCount: 1,
      sessionId: "ses_1",
      model: "m",
      userContentParts: [{ type: "text", text: "part" }],
    });
    const parsed = parseRunState(serializeRunState(state));
    expect(parsed).toEqual(state);
  });

  it("accepts an already-decoded object", () => {
    const state = createRunState({ prompt: "x" });
    expect(parseRunState(JSON.parse(serializeRunState(state)))).toEqual(state);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseRunState("{nope")).toThrow(ValidationError);
  });

  it("rejects non-object payloads", () => {
    expect(() => parseRunState(42)).toThrow(ValidationError);
    expect(() => parseRunState("[1,2]")).toThrow(ValidationError);
    expect(() => parseRunState(null)).toThrow(ValidationError);
  });

  it("rejects unsupported versions", () => {
    const state = createRunState({ prompt: "x" });
    const bumped = { ...state, version: RUN_STATE_VERSION + 1 };
    expect(() => parseRunState(JSON.stringify(bumped))).toThrow(/unsupported version/);
  });

  it("rejects missing or malformed required fields", () => {
    expect(() => parseRunState(JSON.stringify({ version: RUN_STATE_VERSION }))).toThrow(/prompt/);
    expect(() => parseRunState(JSON.stringify({ version: RUN_STATE_VERSION, prompt: "x", savedAt: 1, step: 0 }))).toThrow(/savedAt/);
    expect(() => parseRunState(JSON.stringify({ version: RUN_STATE_VERSION, prompt: "x", savedAt: "now", step: "1" }))).toThrow(/step/);
    expect(() => parseRunState(JSON.stringify({ version: RUN_STATE_VERSION, prompt: "x", savedAt: "now", step: 0, messages: "no" }))).toThrow(/messages/);
    expect(() => parseRunState(
      JSON.stringify({ version: RUN_STATE_VERSION, prompt: "x", savedAt: "now", step: 0, messages: [{ role: "user" }] }),
    )).toThrow(/string role and string\/array content/);
  });
});

describe("session state bridges", () => {
  it("captures a live session state into a run state", () => {
    const sessionState = new InMemorySessionState();
    sessionState.resetMessages(HISTORY);
    sessionState.step = 4;
    sessionState.toolCallCount = 9;

    const state = runStateFromSessionState(sessionState, { prompt: "next turn", sessionId: "ses_1" });
    expect(state.prompt).toBe("next turn");
    expect(state.messages).toEqual(HISTORY);
    expect(state.step).toBe(4);
    expect(state.toolCallCount).toBe(9);
    expect(state.sessionId).toBe("ses_1");
  });

  it("restores a session state from a run state", () => {
    const state: SerializedRunState = createRunState({
      prompt: "p",
      messages: HISTORY,
      step: 5,
      toolCallCount: 11,
      sessionId: "ses_1",
    });
    const sessionState = sessionStateFromRunState(state);
    expect(sessionState).toBeInstanceOf(InMemorySessionState);
    expect(sessionState.messages).toEqual(HISTORY);
    expect(sessionState.step).toBe(5);
    expect(sessionState.toolCallCount).toBe(11);
    expect(sessionState.isRunning).toBe(false);
  });

  it("restores structured content parts verbatim", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: [{ type: "text", text: "hi" }, { type: "image_url", image_url: { url: "data:," } }] },
    ];
    const state = parseRunState(serializeRunState(createRunState({ prompt: "p", messages })));
    expect(state.messages).toEqual(messages);
    expect(sessionStateFromRunState(state).messages).toEqual(messages);
  });
});
