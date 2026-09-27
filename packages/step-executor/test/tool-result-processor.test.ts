import { describe, it, expect } from "vitest";
import { processToolResults, truncateToolOutput } from "../src/tool-result-processor.js";
import type { ChatMessage } from "@vinhnt-sdk/schema";
import type { ToolExecutionPlan } from "../src/step-executor.js";

function plan(toolName = "shell", toolId = "t1"): ToolExecutionPlan {
  return { toolId, toolName, args: { cmd: "ls" } };
}

function fulfilled(tc: ToolExecutionPlan, result: string, output?: unknown, reason?: string) {
  return { status: "fulfilled" as const, value: { tc, result, ...(output !== undefined ? { output } : {}), ...(reason !== undefined ? { reason } : {}) } };
}

describe("processToolResults (P1-4 + P1-7)", () => {
  const noopAdd = async () => {};

  it("formats denied as RespondToModel envelope", async () => {
    const messages: ChatMessage[] = [];
    await processToolResults(
      [fulfilled(plan(), "denied", undefined, "not allowed")],
      3, messages, undefined, { model: "m" }, 0, [], [],
      { addSessionMessage: noopAdd },
    );
    const content = messages[0]!.content as string;
    const parsed = JSON.parse(content);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("not allowed");
    expect(parsed.hint).toBe("Ask the user for approval or choose a different approach.");
  });

  it("formats doom as envelope with doom_loop hint", async () => {
    const messages: ChatMessage[] = [];
    const r = await processToolResults(
      [fulfilled(plan(), "doom")],
      3, messages, undefined, { model: "m" }, 0, [], [],
      { addSessionMessage: noopAdd },
    );
    const parsed = JSON.parse(messages[0]!.content as string);
    expect(parsed.ok).toBe(false);
    expect(parsed.hint).toContain("change the approach");
    expect(r.breakBatch).toBe(true);
  });

  it("P1-3: formats doom-hint without breaking the batch", async () => {
    const messages: ChatMessage[] = [];
    const r = await processToolResults(
      [
        fulfilled(plan("shell", "t1"), "ok", "done"),
        fulfilled(plan("shell", "t2"), "doom-hint", undefined, "Doom loop: repeated"),
        fulfilled(plan("shell", "t3"), "ok", "done"),
      ],
      3, messages, undefined, { model: "m" }, 0, [], [],
      { addSessionMessage: noopAdd },
    );
    expect(r.breakBatch).toBe(false);
    expect(messages).toHaveLength(3);
    const parsed = JSON.parse(messages[1]!.content as string);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("Doom loop");
    expect(messages[0]!.content).toBe("done");
    expect(messages[2]!.content).toBe("done");
  });

  it("formats rejected promise as envelope", async () => {
    const messages: ChatMessage[] = [];
    const rejected = { status: "rejected" as const, reason: new Error("worker crashed") };
    await processToolResults(
      [rejected as never],
      3, messages, undefined, { model: "m" }, 0, [], [],
      { addSessionMessage: noopAdd },
    );
    const parsed = JSON.parse(messages[0]!.content as string);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("worker crashed");
  });

  it("redacts secrets from successful tool output by default (P1-7)", async () => {
    const messages: ChatMessage[] = [];
    const secret = "sk-proj-abcdefghijklmnopqrstuvwxyz123456";
    await processToolResults(
      [fulfilled(plan(), "ok", `token=${secret}`)],
      3, messages, undefined, { model: "m" }, 0, [], [],
      { addSessionMessage: noopAdd },
    );
    const content = messages[0]!.content as string;
    expect(content).not.toContain(secret);
    expect(content).toContain("[REDACTED");
  });

  it("keeps secrets when redactToolOutputs=false", async () => {
    const messages: ChatMessage[] = [];
    const secret = "sk-proj-abcdefghijklmnopqrstuvwxyz123456";
    await processToolResults(
      [fulfilled(plan(), "ok", `token=${secret}`)],
      3, messages, undefined, { model: "m" }, 0, [], [],
      { addSessionMessage: noopAdd, redactToolOutputs: false },
    );
    expect(messages[0]!.content as string).toContain(secret);
  });
});

describe("truncateToolOutput + live cap", () => {
  const noopAdd = async () => {};

  it("TC01_truncate_tool_output_keeps_head_and_tail_with_marker", () => {
    const text = "HEAD".repeat(50) + "MIDDLE".repeat(500) + "TAIL".repeat(50);
    const out = truncateToolOutput(text, 500);
    expect(out.length).toBeLessThan(text.length);
    expect(out).toContain("chars truncated");
    expect(out.startsWith("HEAD")).toBe(true);
    expect(out.endsWith("TAIL")).toBe(true);
    expect(out).toContain("[... ");
  });

  it("TC02_truncate_tool_output_returns_short_text_unchanged", () => {
    expect(truncateToolOutput("hello", 100)).toBe("hello");
    expect(truncateToolOutput("hello", 5)).toBe("hello");
  });

  it("TC03_process_tool_results_caps_model_view_but_persists_full_output", async () => {
    const messages: ChatMessage[] = [];
    const persisted: string[] = [];
    const add = async (_sid: string | undefined, _role: string, content: string) => {
      persisted.push(content);
    };
    const big = "A".repeat(5_000);
    await processToolResults(
      [fulfilled(plan(), "ok", big)],
      3, messages, undefined, { model: "m" }, 0, [], [],
      { addSessionMessage: add, maxToolOutputChars: 50 },
    );
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toHaveLength(5_000);
    const modelView = messages[0]!.content as string;
    expect(modelView).toContain("chars truncated");
    expect(modelView.length).toBeLessThan(5_000);
    expect(modelView.length).toBeLessThan(500);
  });
});
