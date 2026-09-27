import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@vinhnt-sdk/schema";
import { ContextCompressor } from "../src/compressor.js";

function toolMsg(text: string, id = "t1"): ChatMessage {
  return { role: "tool", toolCallId: id, content: text };
}

function userMsg(text: string): ChatMessage {
  return { role: "user", content: text };
}

function bigToolOutput(len: number): string {
  return "X".repeat(len);
}

describe("ContextCompressor.compress", () => {
  it("TC01_tail_messages_keep_full_tool_output_after_compress", () => {
    const messages: ChatMessage[] = [
      userMsg("head-0"),
      userMsg("head-1"),
      userMsg("head-2"),
      ...Array.from({ length: 16 }, (_, i) => userMsg(`middle-${i}`)),
      toolMsg(bigToolOutput(1_000), "big-middle"),
      ...Array.from({ length: 19 }, (_, i) => userMsg(`tail-${i}`)),
      toolMsg(bigToolOutput(1_000), "big-tail"),
    ];
    expect(messages.length).toBe(40);

    const { messages: result } = new ContextCompressor().compress(messages);
    const tools = result.filter((m) => m.role === "tool");
    expect(tools).toHaveLength(1);
    const text = typeof tools[0]!.content === "string" ? tools[0]!.content : "";
    expect(text).toHaveLength(1_000);
    expect(text).not.toContain("[truncated]");
  });

  it("TC02_head_messages_are_preserved_verbatim", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "system prompt" },
      userMsg("question"),
      { role: "assistant", content: "answer with toolCalls", toolCalls: [{ id: "c1", name: "read_file", args: { filePath: "a.ts" } }] },
      ...Array.from({ length: 10 }, (_, i) => userMsg(`middle-${i}`)),
      ...Array.from({ length: 20 }, (_, i) => userMsg(`tail-${i}`)),
    ];

    const { messages: result } = new ContextCompressor().compress(messages);
    expect(result[0]).toEqual(messages[0]);
    expect(result[1]).toEqual(messages[1]);
    expect(result[2]).toEqual(messages[2]);
  });

  it("TC03_middle_is_replaced_by_summary_and_count_drops", () => {
    const originalCount = 40;
    const messages: ChatMessage[] = [
      ...Array.from({ length: 3 }, (_, i) => userMsg(`head-${i}`)),
      ...Array.from({ length: 17 }, (_, i) => userMsg(`middle-${i}`)),
      ...Array.from({ length: 20 }, (_, i) => userMsg(`tail-${i}`)),
    ];
    expect(messages).toHaveLength(originalCount);

    const { messages: result, summary } = new ContextCompressor().compress(messages);
    expect(summary.originalMessageCount).toBe(originalCount);
    expect(summary.compressedMessageCount).toBeLessThan(originalCount);
    expect(summary.summary).toContain("Compressed 17 messages");
    expect(result.some((m) => typeof m.content === "string" && m.content.includes("compressed context"))).toBe(true);
  });

  it("TC04_messages_at_or_below_head_plus_tail_are_returned_with_same_length", () => {
    const messages: ChatMessage[] = Array.from({ length: 10 }, (_, i) => userMsg(`m-${i}`));
    const { messages: result, summary } = new ContextCompressor().compress(messages);
    expect(result).toHaveLength(10);
    expect(summary.compressedMessageCount).toBe(10);
  });

  it("TC05_needsCompression_uses_token_budget", () => {
    const c = new ContextCompressor({ tokenBudget: 100 });
    expect(c.needsCompression([userMsg("short")])).toBe(false);
    expect(c.needsCompression([userMsg("Y".repeat(404))])).toBe(true);
  });
});
