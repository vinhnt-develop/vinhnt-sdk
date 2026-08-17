import { describe, expect, it } from "vitest";
import { InMemorySessionState } from "../src/in-memory-session-state.js";
import type { ChatMessage } from "@vinhnt-sdk/schema";

function msg(role: string, content: string): ChatMessage {
  return { role: role as ChatMessage["role"], content };
}

describe("InMemorySessionState", () => {
  it("starts with empty messages and step 0", () => {
    const s = new InMemorySessionState();
    expect(s.messages).toHaveLength(0);
    expect(s.step).toBe(0);
    expect(s.isRunning).toBe(false);
  });

  it("pushMessage appends to conversation", () => {
    const s = new InMemorySessionState();
    s.pushMessage(msg("user", "hello"));
    s.pushMessage(msg("assistant", "hi"));
    expect(s.messages).toHaveLength(2);
    expect(s.messages[1]!.content).toBe("hi");
  });

  it("resetMessages replaces all messages", () => {
    const s = new InMemorySessionState();
    s.pushMessage(msg("user", "a"));
    s.resetMessages([msg("assistant", "b")]);
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]!.content).toBe("b");
  });

  it("setContext and context map work", () => {
    const s = new InMemorySessionState();
    s.setContext("tools", ["read", "write"]);
    s.setContext("agent", "primary");
    expect(s.context.get("tools")).toEqual(["read", "write"]);
    expect(s.context.get("agent")).toBe("primary");
  });

  it("clearContext removes all context", () => {
    const s = new InMemorySessionState();
    s.setContext("key", "val");
    s.clearContext();
    expect(s.context.size).toBe(0);
  });

  it("snapshot and restore round-trips state", () => {
    const s = new InMemorySessionState();
    s.pushMessage(msg("user", "hi"));
    s.step = 3;
    s.toolCallCount = 5;
    s.isRunning = true;
    s.setContext("env", "test");

    const snap = s.snapshot();

    const s2 = new InMemorySessionState();
    s2.restore(snap);
    expect(s2.messages).toHaveLength(1);
    expect(s2.messages[0]!.content).toBe("hi");
    expect(s2.step).toBe(3);
    expect(s2.toolCallCount).toBe(5);
    expect(s2.context.get("env")).toBe("test");
    expect(s2.isRunning).toBe(true);
  });

  it("snapshot is immutable copy", () => {
    const s = new InMemorySessionState();
    s.pushMessage(msg("user", "original"));
    const snap = s.snapshot();
    s.pushMessage(msg("user", "extra"));
    expect(snap.messages).toHaveLength(1);
    expect(s.messages).toHaveLength(2);
  });
});
