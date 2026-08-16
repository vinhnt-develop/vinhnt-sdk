import { describe, it, expect } from "vitest";
import { InMemoryMemoryStore, SessionMemory, BoundedMemory, ContextCompressor, WriteApprovalQueue, BackgroundReview, LearningEngine, buildPrompt } from "@vinhnt-sdk/knowledge";
import { FakeModelProvider } from "../src/fakes/fake-model.js";

describe("InMemoryMemoryStore", () => {
  it("stores and retrieves by key", async () => {
    const store = new InMemoryMemoryStore();
    await store.set({ key: "test-key", value: "test-value", sessionId: "s1", tier: "session", tags: ["t1"] });
    const item = await store.get("test-key", "s1");
    expect(item).toBeDefined();
    expect(item!.value).toBe("test-value");
  });

  it("returns undefined for missing key", async () => {
    const store = new InMemoryMemoryStore();
    const item = await store.get("nonexistent", "s1");
    expect(item).toBeUndefined();
  });

  it("updates existing entry", async () => {
    const store = new InMemoryMemoryStore();
    const created = await store.set({ key: "k1", value: "v1", sessionId: "s1", tier: "session", tags: [] });
    const updated = await store.set({ key: "k1", value: "v2", sessionId: "s1", tier: "session", tags: ["updated"] });
    expect(updated.value).toBe("v2");
    expect(updated.tags).toEqual(["updated"]);
    expect(updated.id).toBe(created.id);
  });

  it("deletes entry", async () => {
    const store = new InMemoryMemoryStore();
    await store.set({ key: "k1", value: "v1", sessionId: "s1", tier: "session", tags: [] });
    await store.delete("k1", "s1");
    const item = await store.get("k1", "s1");
    expect(item).toBeUndefined();
  });

  it("search by key match", async () => {
    const store = new InMemoryMemoryStore();
    await store.set({ key: "user-name", value: "Alice", sessionId: "s1", tier: "session", tags: [] });
    await store.set({ key: "user-age", value: "30", sessionId: "s1", tier: "session", tags: [] });
    const results = await store.search("name", "s1");
    expect(results).toHaveLength(1);
    expect(results[0]!.value).toBe("Alice");
  });

  it("search by tag match", async () => {
    const store = new InMemoryMemoryStore();
    await store.set({ key: "k1", value: "v1", sessionId: "s1", tier: "session", tags: ["important", "user"] });
    const results = await store.search("important", "s1");
    expect(results).toHaveLength(1);
  });

  it("search scoped to session", async () => {
    const store = new InMemoryMemoryStore();
    await store.set({ key: "k1", value: "v1", sessionId: "s1", tier: "session", tags: [] });
    await store.set({ key: "k1", value: "v2", sessionId: "s2", tier: "session", tags: [] });
    const results = await store.search("v1", "s1");
    expect(results).toHaveLength(1);
  });

  it("listByTier returns sorted by updatedAt desc", async () => {
    const store = new InMemoryMemoryStore();
    await store.set({ key: "a", value: "1", sessionId: "s1", tier: "session", tags: [] });
    await new Promise((r) => setTimeout(r, 10));
    await store.set({ key: "b", value: "2", sessionId: "s1", tier: "session", tags: [] });
    const items = await store.listByTier("session", "s1");
    expect(items).toHaveLength(2);
    expect(items[0]!.key).toBe("b");
    expect(items[1]!.key).toBe("a");
  });

  it("listByTier with empty sessionId lists across all sessions", async () => {
    const store = new InMemoryMemoryStore();
    await store.set({ key: "k1", value: "v1", sessionId: "s1", tier: "working", tags: [] });
    await store.set({ key: "k2", value: "v2", sessionId: "global", tier: "working", tags: [] });
    await store.set({ key: "k3", value: "v3", sessionId: "global", tier: "session", tags: [] });
    const items = await store.listByTier("working", "");
    expect(items.map((i) => i.key).sort()).toEqual(["k1", "k2"]);
  });

  it("search with empty sessionId matches across all sessions", async () => {
    const store = new InMemoryMemoryStore();
    await store.set({ key: "user-name", value: "Alice", sessionId: "s1", tier: "session", tags: [] });
    await store.set({ key: "user-mail", value: "alice@x.dev", sessionId: "global", tier: "session", tags: [] });
    const results = await store.search("alice", "");
    expect(results.map((i) => i.key).sort()).toEqual(["user-mail", "user-name"]);
  });
});

describe("SessionMemory", () => {
  it("remember and recall", async () => {
    const sm = new SessionMemory("s1");
    await sm.remember("color", "blue");
    const val = await sm.recall("color");
    expect(val).toBe("blue");
  });

  it("forget removes entry", async () => {
    const sm = new SessionMemory("s1");
    await sm.remember("color", "blue");
    await sm.forget("color");
    const val = await sm.recall("color");
    expect(val).toBeUndefined();
  });

  it("search across session", async () => {
    const sm = new SessionMemory("s1");
    await sm.remember("name", "Alice", ["user"]);
    const results = await sm.search("Alice");
    expect(results).toHaveLength(1);
  });

  it("getWorkingMemory returns working tier items", async () => {
    const sm = new SessionMemory("s1");
    await sm.setWorkingMemory({ task: "fix bug" });
    const items = await sm.getWorkingMemory();
    expect(items).toHaveLength(1);
    expect(items[0]!.value).toBe("fix bug");
  });
});

describe("BoundedMemory", () => {
  it("setProfile truncates at 1400 chars", async () => {
    const bm = new BoundedMemory();
    const long = "x".repeat(1500);
    const result = await bm.setProfile(long);
    expect(result.value.length).toBe(1400);
    expect(result.value.endsWith("...")).toBe(true);
  });

  it("setProfile returns MemoryEntry with tier stable", async () => {
    const bm = new BoundedMemory();
    const result = await bm.setProfile("user likes Python");
    expect(result.tier).toBe("stable");
    expect(result.charLimit).toBe(1400);
  });

  it("setWorkingFact appends to working memory", async () => {
    const bm = new BoundedMemory();
    await bm.setWorkingFact("lang", "TypeScript");
    await bm.setWorkingFact("framework", "React");
    const working = bm.getWorking();
    expect(working).toContain("lang: TypeScript");
    expect(working).toContain("framework: React");
  });

  it("setWorkingFact truncates at 2200 chars", async () => {
    const bm = new BoundedMemory();
    const longVal = "x".repeat(1000);
    await bm.setWorkingFact("a", longVal);
    await bm.setWorkingFact("b", longVal);
    await bm.setWorkingFact("c", longVal);
    const working = bm.getWorking();
    expect(working.length).toBeLessThanOrEqual(2203);
  });

  it("clearWorking resets working memory", async () => {
    const bm = new BoundedMemory();
    await bm.setWorkingFact("test", "value");
    bm.clearWorking();
    expect(bm.getWorking()).toBe("");
  });

  it("getAllBounded returns profile and working entries", async () => {
    const bm = new BoundedMemory();
    await bm.setProfile("profile data");
    await bm.setWorkingFact("fact", "data");
    const entries = bm.getAllBounded();
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.key === "_profile")?.value).toBe("profile data");
    expect(entries.find((e) => e.key === "_working")?.value).toContain("fact: data");
  });

  it("totalChars returns sum of profile and working", async () => {
    const bm = new BoundedMemory();
    await bm.setProfile("12345");
    await bm.setWorkingFact("k", "67890");
    expect(bm.totalChars()).toBeGreaterThan(0);
  });
});

describe("WriteApprovalQueue", () => {
  it("requestApproval creates pending request", async () => {
    const q = new WriteApprovalQueue();
    const req = await q.requestApproval({
      type: "memory.write",
      description: "Test fact",
      payload: { key: "color", value: "blue" },
    });
    expect(req.status).toBe("pending");
    expect(req.id).toBeDefined();
  });

  it("approve changes status to approved", async () => {
    const q = new WriteApprovalQueue();
    const req = await q.requestApproval({ type: "memory.write", description: "test", payload: {} });
    const approved = await q.approve(req.id);
    expect(approved?.status).toBe("approved");
    expect(approved?.resolvedAt).toBeDefined();
  });

  it("reject changes status to rejected", async () => {
    const q = new WriteApprovalQueue();
    const req = await q.requestApproval({ type: "memory.write", description: "test", payload: {} });
    const rejected = await q.reject(req.id);
    expect(rejected?.status).toBe("rejected");
  });

  it("listPending returns only pending requests", async () => {
    const q = new WriteApprovalQueue();
    const req1 = await q.requestApproval({ type: "memory.write", description: "a", payload: {} });
    const req2 = await q.requestApproval({ type: "memory.write", description: "b", payload: {} });
    await q.approve(req1.id);
    const pending = q.listPending();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.id).toBe(req2.id);
  });

  it("getRequest returns request by id", async () => {
    const q = new WriteApprovalQueue();
    const req = await q.requestApproval({ type: "memory.write", description: "test", payload: {} });
    const found = q.getRequest(req.id);
    expect(found?.description).toBe("test");
  });

  it("approve non-existent returns undefined", async () => {
    const q = new WriteApprovalQueue();
    const result = await q.approve("nonexistent");
    expect(result).toBeUndefined();
  });

  it("expirePending marks expired requests", async () => {
    const q = new WriteApprovalQueue();
    await q.requestApproval({ type: "memory.write", description: "test", payload: {}, expiresAt: new Date(Date.now() - 1000).toISOString() });
    const count = q.expirePending();
    expect(count).toBe(1);
    expect(q.listPending()).toHaveLength(0);
  });
});

describe("BackgroundReview", () => {
  it("extracts facts from assistant messages with remember pattern", async () => {
    const bm = new BoundedMemory();
    const review = new BackgroundReview("s1", bm);
    const result = await review.reviewTurn(
      [{ role: "assistant", content: "remember that user prefers dark mode" }],
      { requireApproval: false },
    );
    expect(result.extracted.length).toBeGreaterThan(0);
  });

  it("extracts facts with I learned pattern", async () => {
    const bm = new BoundedMemory();
    const review = new BackgroundReview("s1", bm);
    const result = await review.reviewTurn(
      [{ role: "assistant", content: "I learned that the project uses React" }],
    );
    expect(result.extracted.length).toBeGreaterThan(0);
  });

  it("extracts key fact pattern", async () => {
    const bm = new BoundedMemory();
    const review = new BackgroundReview("s1", bm);
    const result = await review.reviewTurn(
      [{ role: "assistant", content: "key fact: port = 3000" }],
    );
    expect(result.extracted.length).toBeGreaterThan(0);
  });

  it("ignores system role messages", async () => {
    const bm = new BoundedMemory();
    const review = new BackgroundReview("s1", bm);
    const result = await review.reviewTurn(
      [{ role: "system", content: "remember that this is system" }],
    );
    expect(result.extracted).toHaveLength(0);
  });

  it("returns staged count when requireApproval is true", async () => {
    const bm = new BoundedMemory();
    const aq = new WriteApprovalQueue();
    const review = new BackgroundReview("s1", bm, undefined, aq);
    const result = await review.reviewTurn(
      [{ role: "assistant", content: "remember that user likes cats" }],
      { requireApproval: true },
    );
    expect(result.extracted.length).toBeGreaterThan(0);
    expect(aq.listPending().length).toBeGreaterThan(0);
  });
});

describe("ContextCompressor", () => {
  it("pruneToolOutputs truncates long tool messages", () => {
    const cc = new ContextCompressor({ maxToolOutputLength: 10 });
    const msgs = [
      { role: "user" as const, content: "hi" },
      { role: "tool" as const, content: "x".repeat(100), toolCallId: "t1" },
    ];
    const pruned = cc.pruneToolOutputs(msgs);
    expect(pruned[1]!.content.length).toBeLessThan(50);
    expect(pruned[1]!.content).toContain("[truncated]");
  });

  it("needsCompression returns false for small messages", () => {
    const cc = new ContextCompressor({ tokenBudget: 10000 });
    const msgs = Array.from({ length: 5 }, () => ({ role: "user" as const, content: "short" }));
    expect(cc.needsCompression(msgs)).toBe(false);
  });

  it("needsCompression returns true for large messages", () => {
    const cc = new ContextCompressor({ tokenBudget: 10 });
    const msgs = [{ role: "user" as const, content: "x".repeat(100) }];
    expect(cc.needsCompression(msgs)).toBe(true);
  });

  it("compress does nothing when under head+tail threshold", () => {
    const cc = new ContextCompressor({ headCount: 2, tailCount: 2 });
    const msgs = Array.from({ length: 4 }, (_, i) => ({ role: "user" as const, content: `msg ${i}` }));
    const result = cc.compress(msgs);
    expect(result.messages).toHaveLength(4);
    expect(result.summary.compressedMessageCount).toBe(4);
  });

  it("compress protects head and tail, summarizes middle", () => {
    const cc = new ContextCompressor({ headCount: 2, tailCount: 2, maxToolOutputLength: 500, tokenBudget: 32000, charsPerToken: 4 });
    const msgs = Array.from({ length: 10 }, (_, i) => ({ role: "user" as const, content: `Message number ${i}` }));
    const result = cc.compress(msgs);
    expect(result.messages.length).toBeLessThan(10);
    expect(result.summary.originalMessageCount).toBe(10);
    expect(result.summary.compressedMessageCount).toBe(result.messages.length);
    expect(result.summary.summary).toBeDefined();
  });

  it("compact delegates to compress", async () => {
    const cc = new ContextCompressor();
    const msgs = [{ role: "user" as const, content: "hello" }];
    const result = await cc.compact(msgs);
    expect(result.messages).toHaveLength(1);
  });

  it("handles empty messages", () => {
    const cc = new ContextCompressor();
    const result = cc.compress([]);
    expect(result.messages).toHaveLength(0);
  });
});

describe("buildPrompt", () => {
  it("assembles prompt with all sections", () => {
    const result = buildPrompt({
      identity: "You are a helpful assistant",
      toolGuidance: "Use tools when needed",
      skillsIndex: "Available: coding, research",
      projectContext: "Project: VNT Agent",
      memoryEntries: [
        { key: "user-name", value: "Alice", tier: "stable", charLimit: 1400 },
        { key: "current-task", value: "fix bug", tier: "volatile", charLimit: 2200 },
      ],
      sessionMetadata: "Session started at 12:00",
    });
    expect(result.stable).toContain("helpful assistant");
    expect(result.context).toContain("VNT Agent");
    expect(result.volatile).toContain("current-task");
    expect(result.assembled).toContain("<memory>");
    expect(result.assembled).toContain("<context>");
    expect(result.version).toBe("1.0.0");
  });

  it("handles empty fields gracefully", () => {
    const result = buildPrompt({
      identity: "", toolGuidance: "", skillsIndex: "",
      projectContext: "", memoryEntries: [], sessionMetadata: "",
    });
    expect(result.assembled).toBe("");
  });

  it("omits memory block when no volatile entries", () => {
    const result = buildPrompt({
      identity: "Bot", toolGuidance: "", skillsIndex: "",
      projectContext: "", memoryEntries: [], sessionMetadata: "",
    });
    expect(result.assembled).not.toContain("<memory>");
  });
});

describe("LearningEngine", () => {
  const defaultConfig = {
    enabled: true,
    backgroundReview: true,
    memoryWriteApproval: false,
    skillWriteApproval: false,
    memoryCharLimit: 2200,
    userCharLimit: 1400,
  };

  it("processTurn extracts facts when enabled", async () => {
    const engine = new LearningEngine({ config: defaultConfig, sessionId: "s1" });
    const result = await engine.processTurn([
      { role: "user", content: "my name is Alice" },
      { role: "assistant", content: "remember that user prefers dark mode" },
    ]);
    expect(result.extracted).toBeGreaterThan(0);
  });

  it("processTurn returns 0 when disabled", async () => {
    const engine = new LearningEngine({ config: { ...defaultConfig, enabled: false }, sessionId: "s1" });
    const result = await engine.processTurn([
      { role: "assistant", content: "remember that user likes cats" },
    ]);
    expect(result.extracted).toBe(0);
    expect(result.staged).toBe(0);
  });

  it("processTurn returns 0 when backgroundReview disabled", async () => {
    const engine = new LearningEngine({ config: { ...defaultConfig, backgroundReview: false, enabled: true }, sessionId: "s1" });
    const result = await engine.processTurn([
      { role: "assistant", content: "remember that user likes cats" },
    ]);
    expect(result.extracted).toBe(0);
  });

  it("setEnabled toggles processing", async () => {
    const engine = new LearningEngine({ config: defaultConfig, sessionId: "s1" });
    expect(engine.isEnabled).toBe(true);
    engine.setEnabled(false);
    expect(engine.isEnabled).toBe(false);
    const result = await engine.processTurn([
      { role: "assistant", content: "remember that user likes cats" },
    ]);
    expect(result.extracted).toBe(0);
  });

  it("approveMemory rejects unknown id", async () => {
    const engine = new LearningEngine({ config: { ...defaultConfig, memoryWriteApproval: true }, sessionId: "s1" });
    const ok = await engine.approveMemory("nonexistent");
    expect(ok).toBe(false);
  });

  it("rejectMemory returns false for unknown id", async () => {
    const engine = new LearningEngine({ config: defaultConfig, sessionId: "s1" });
    const ok = await engine.rejectMemory("nonexistent");
    expect(ok).toBe(false);
  });

  it("buildMemoryBlock returns bounded entries", async () => {
    const engine = new LearningEngine({ config: defaultConfig, sessionId: "s1" });
    await engine.setProfile("Python developer");
    const block = engine.buildMemoryBlock();
    expect(block.some((e) => e.key === "_profile")).toBe(true);
    expect(block.some((e) => e.key === "_working")).toBe(true);
  });

  it("getBoundedMemory returns BoundedMemory instance", () => {
    const engine = new LearningEngine({ config: defaultConfig, sessionId: "s1" });
    expect(engine.getBoundedMemory()).toBeDefined();
  });

  it("getApprovalQueue returns WriteApprovalQueue instance", () => {
    const engine = new LearningEngine({ config: defaultConfig, sessionId: "s1" });
    expect(engine.getApprovalQueue()).toBeDefined();
  });

  it("getCompressor returns ContextCompressor instance", () => {
    const engine = new LearningEngine({ config: defaultConfig, sessionId: "s1" });
    expect(engine.getCompressor()).toBeDefined();
  });

  it("setWorkingFact stores fact", async () => {
    const engine = new LearningEngine({ config: defaultConfig, sessionId: "s1" });
    await engine.setWorkingFact("os", "Linux");
    const block = engine.buildMemoryBlock();
    expect(block.some((e) => e.value.includes("os: Linux"))).toBe(true);
  });

  it("clearWorking resets working memory", async () => {
    const engine = new LearningEngine({ config: defaultConfig, sessionId: "s1" });
    await engine.setWorkingFact("test", "value");
    engine.clearWorking();
    const block = engine.buildMemoryBlock();
    const working = block.find((e) => e.key === "_working");
    expect(working?.value).toBe("");
  });
});
