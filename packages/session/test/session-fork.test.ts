import { describe, expect, it } from "vitest";
import { ValidationError } from "@vinhnt-sdk/schema";
import type { ForkSessionHistoryOptions, ForkSessionHistoryResult } from "../src/index.js";
import { InMemorySessionStore, forkSessionHistory } from "../src/index.js";

async function seedSource(): Promise<{ store: InMemorySessionStore; sourceId: string }> {
  const store = new InMemorySessionStore();
  const source = await store.createSession("Source chat");
  await store.addMessage(source.id, { role: "user", content: "hello" });
  await store.addMessage(source.id, {
    role: "assistant",
    content: "",
    toolCalls: [{ id: "call-1", name: "read_file", args: { path: "a.txt" } }],
  });
  await store.addMessage(source.id, { role: "tool", toolCallId: "call-1", content: "FILE_BODY" });
  await store.addMessage(source.id, { role: "assistant", content: "done" });
  return { store, sourceId: source.id };
}

describe("forkSessionHistory", () => {
  it("copies the full transcript with pairing fidelity", async () => {
    const { store, sourceId } = await seedSource();

    const result: ForkSessionHistoryResult = await forkSessionHistory(store, sourceId);
    expect(result.copiedMessageCount).toBe(4);
    expect(result.session.parentSessionId).toBe(sourceId);
    expect(result.session.title).toBe("Fork of Source chat");

    const sourceRows = await store.listMessages(sourceId);
    const forkRows = await store.listMessages(result.session.id);
    expect(forkRows).toHaveLength(4);
    expect(forkRows.map((r) => r.role)).toEqual(sourceRows.map((r) => r.role));
    expect(forkRows.map((r) => r.content)).toEqual(sourceRows.map((r) => r.content));
    expect(forkRows[1]!.toolCalls).toEqual(sourceRows[1]!.toolCalls);
    expect(forkRows[2]!.toolCallId).toBe("call-1");

    // Fork is independent: mutating the source does not touch the copy.
    await store.addMessage(sourceId, { role: "user", content: "more" });
    expect(await store.listMessages(result.session.id)).toHaveLength(4);
  });

  it("preserves content blocks, tokens and attribution", async () => {
    const store = new InMemorySessionStore();
    const source = await store.createSession("Rich");
    await store.addMessage(source.id, {
      role: "assistant",
      content: "with blocks",
      contentBlocks: [{ type: "text", text: "with blocks" }],
      tokens: { input: 10, output: 5 },
      model: "gpt-x",
      provider: "openai",
      cost: 0.5,
      toolCalls: [{ id: "c1", name: "t", args: {} }],
    });

    const { session, copiedMessageCount } = await forkSessionHistory(store, source.id);
    expect(copiedMessageCount).toBe(1);
    const [row] = await store.listMessages(session.id);
    expect(row!.contentBlocks).toEqual([{ type: "text", text: "with blocks" }]);
    expect(row!.tokens).toEqual({ input: 10, output: 5 });
    expect(row!.model).toBe("gpt-x");
    expect(row!.provider).toBe("openai");
    expect(row!.cost).toBe(0.5);
    expect(row!.toolCalls).toEqual([{ id: "c1", name: "t", args: {} }]);
  });

  it("cuts at atMessageId (point-in-time fork)", async () => {
    const { store, sourceId } = await seedSource();
    const rows = await store.listMessages(sourceId);
    const cutId = rows[1]!.id;

    const { session, copiedMessageCount } = await forkSessionHistory(store, sourceId, { atMessageId: cutId });
    expect(copiedMessageCount).toBe(2);
    const forkRows = await store.listMessages(session.id);
    expect(forkRows.map((r) => r.content)).toEqual(["hello", ""]);
  });

  it("keeps only the tail with limit", async () => {
    const { store, sourceId } = await seedSource();
    const { session, copiedMessageCount } = await forkSessionHistory(store, sourceId, { limit: 2 });
    expect(copiedMessageCount).toBe(2);
    const forkRows = await store.listMessages(session.id);
    expect(forkRows.map((r) => r.content)).toEqual(["FILE_BODY", "done"]);
  });

  it("applies atMessageId first, then limit", async () => {
    const { store, sourceId } = await seedSource();
    const rows = await store.listMessages(sourceId);
    const options: ForkSessionHistoryOptions = { atMessageId: rows[2]!.id, limit: 1 };
    const { copiedMessageCount } = await forkSessionHistory(store, sourceId, options);
    expect(copiedMessageCount).toBe(1);
  });

  it("honors an explicit title", async () => {
    const { store, sourceId } = await seedSource();
    const { session } = await forkSessionHistory(store, sourceId, { title: "My branch" });
    expect(session.title).toBe("My branch");
  });

  it("throws when the source session does not exist", async () => {
    const store = new InMemorySessionStore();
    await expect(forkSessionHistory(store, "ses_missing")).rejects.toThrow(ValidationError);
  });

  it("throws when atMessageId is not in the source transcript", async () => {
    const { store, sourceId } = await seedSource();
    await expect(forkSessionHistory(store, sourceId, { atMessageId: "msg_nope" })).rejects.toThrow(ValidationError);
  });
});
