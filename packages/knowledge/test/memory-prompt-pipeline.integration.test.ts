/**
 * P5.10 (S15) — knowledge integration gate.
 *
 * The unit tests cover BoundedMemory, buildPrompt, ContextCompressor and the
 * memory search tool in isolation. This file chains them as the real pipeline
 * they form in core: bounded memory → prompt assembly → compression budget →
 * and exercises createMemorySearchTool against the SessionStore seam.
 */

import { describe, it, expect } from "vitest";
import type { ChatMessage, SessionStore } from "@vinhnt-sdk/schema";
import {
  BoundedMemory,
  buildPrompt,
  ContextCompressor,
  createMemorySearchTool,
} from "../src/index.js";
import type { MemoryStore } from "../src/index.js";

function userMsg(text: string): ChatMessage {
  return { role: "user", content: text };
}

/** Records every set() so the test can assert what reached the store seam. */
function recordingStore(): { saved: Array<{ key: string; value: string; sessionId: string; tier: string }>; store: MemoryStore } {
  const saved: Array<{ key: string; value: string; sessionId: string; tier: string }> = [];
  const store = {
    async set(item: { key: string; value: string; sessionId: string; tier: string }) {
      saved.push(item);
      return { ...item, id: item.key, createdAt: 0, updatedAt: 0 };
    },
  } as unknown as MemoryStore;
  return { saved, store };
}

function toolCtx(): Parameters<ReturnType<typeof createMemorySearchTool>["execute"]>[1] {
  return {
    sessionId: "sess-wire",
    runId: "run-wire",
    agentId: "agent-wire",
    agentName: "wire-agent",
    signal: new AbortController().signal,
    env: {},
    ask: async () => "once",
    metadata: () => undefined,
    setCompensation: () => undefined,
  } as unknown as Parameters<ReturnType<typeof createMemorySearchTool>["execute"]>[1];
}

/** Shape createMemorySearchTool.execute maps its store rows into (TOutput = unknown). */
interface SearchHit {
  sessionId: string;
  role: string;
  content: string;
  createdAt: string;
}

describe("P5.10 knowledge memory→prompt→compression pipeline (S15)", () => {
  it("TC01_bounded_memory_truncates_persists_and_feeds_build_prompt", async () => {
    const { saved, store } = recordingStore();
    const memory = new BoundedMemory(store, { profileLimit: 100, workingLimit: 60 });
    await memory.setProfile("P".repeat(300));
    await memory.setWorkingFact("cwd", "/w".repeat(100));
    await memory.setWorkingFact("branch", "main");

    // Sections are truncated to their limits, not rejected.
    expect(memory.getProfile().value).toHaveLength(100);
    expect(memory.getWorking().length).toBeLessThanOrEqual(60);
    expect(memory.totalChars()).toBe(100 + memory.getWorking().length);
    // Both writes reached the store seam with the bounded markers.
    expect(saved.map((s) => s.key)).toEqual(["_profile", "_working:cwd", "_working:branch"]);

    const entries = memory.getAllBounded();
    expect(entries.map((e) => e.key)).toEqual(["_profile", "_working"]);
    expect(entries[0]!.charLimit).toBe(100);

    const assembly = buildPrompt({
      identity: "You are a helpful agent.",
      toolGuidance: "Use tools carefully.",
      skillsIndex: "",
      projectContext: "Repo: vinhnt-sdk",
      memoryEntries: entries,
      sessionMetadata: "session=s1",
    });

    // Empty parts are filtered, sections stay stable/ordered.
    expect(assembly.stable).toBe("You are a helpful agent.\n\nUse tools carefully.");
    expect(assembly.context).toBe("Repo: vinhnt-sdk");
    expect(assembly.volatile).toContain("[long-term] _profile:");
    expect(assembly.volatile).toContain("session=s1");
    expect(assembly.assembled.startsWith("You are a helpful agent.")).toBe(true);
    expect(assembly.assembled).toContain("<context>\nRepo: vinhnt-sdk\n</context>");
    expect(assembly.assembled).toContain("<memory>");
    expect(assembly.version).toBe("1.0.0");
  });

  it("TC02_assembled_prompt_plus_history_flows_into_compressor", async () => {
    const memory = new BoundedMemory(undefined, { profileLimit: 200, workingLimit: 200 });
    await memory.setProfile("Operator persona for the wire test.");
    await memory.setWorkingFact("cwd", "/repo");

    const assembly = buildPrompt({
      identity: "You are a helpful agent.",
      toolGuidance: "",
      skillsIndex: "",
      projectContext: "",
      memoryEntries: memory.getAllBounded(),
      sessionMetadata: "",
    });

    const history: ChatMessage[] = [
      { role: "system", content: assembly.assembled },
      ...Array.from({ length: 3 }, (_, i) => userMsg(`head ${i}`)),
      ...Array.from({ length: 20 }, (_, i) => userMsg(`mid ${i} ${"x".repeat(200)}`)),
      ...Array.from({ length: 20 }, (_, i) => userMsg(`tail ${i}`)),
    ];
    expect(history).toHaveLength(44);

    const compressor = new ContextCompressor({ tokenBudget: 1_000 });
    expect(compressor.needsCompression(history)).toBe(true);

    const { messages: compressed, summary } = await compressor.compact(history);
    expect(summary.originalMessageCount).toBe(44);
    expect(compressed.length).toBeLessThan(44);
    // head(3: system+head0+head1) + summary + tail(20)
    expect(summary.summary).toContain("Compressed 21 messages");
    // The assembled system prompt (with its <memory> block) survives verbatim.
    expect(compressed[0]).toEqual(history[0]);
    expect(String(compressed[0]!.content)).toContain("<memory>");
    expect(compressed.length).toBe(24);

    // Budget respected after compression.
    expect(compressor.needsCompression(compressed)).toBe(false);
  });

  it("TC03_memory_search_tool_maps_limits_and_caps_store_results", async () => {
    const store = {
      searchMessages: async (query: string, options?: { limit?: number }) =>
        [
          {
            sessionId: "session-12345678-aaa",
            role: "user",
            content: `about ${query} details`,
            createdAt: "2026-10-11T00:00:00Z",
          },
          {
            sessionId: "s2",
            role: "assistant",
            content: "x".repeat(600),
            createdAt: "2026-10-11T00:00:01Z",
          },
        ].slice(0, options?.limit ?? 10),
    } as unknown as SessionStore;

    const tool = createMemorySearchTool(store);
    expect(tool.risk).toBe("read");
    expect(tool.metadata?.source).toBe("knowledge");

    const ctx = toolCtx();
    const limited = (await tool.execute({ query: "deploy", limit: 1 }, ctx)) as SearchHit[];
    expect(limited).toHaveLength(1);
    expect(limited[0]).toMatchObject({
      sessionId: "session-",
      role: "user",
      content: "about deploy details",
    });

    const all = (await tool.execute({ query: "deploy" }, ctx)) as SearchHit[];
    expect(all).toHaveLength(2);
    // Content is capped at 500 chars before it reaches the model.
    expect(all[1]!.content).toHaveLength(500);
    expect(all[1]!.content).not.toContain("x".repeat(501));
  });

  it("TC04_store_without_search_seam_returns_empty_results", async () => {
    const tool = createMemorySearchTool({} as unknown as SessionStore);
    const ctx = toolCtx();
    expect(await tool.execute({ query: "anything" }, ctx)).toEqual([]);
  });
});
