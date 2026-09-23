import { describe, it, expect } from "vitest";
import { processToolResults } from "../src/tool-result-processor.js";
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
