/**
 * TC31 — AttachmentRef + BinaryAttachmentStore unit tests.
 *
 * Covers: createAttachmentRef, InMemoryBinaryAttachmentStore save/get/list/
 * delete/exists, binary roundtrip, error on missing attachment.
 */

import { describe, it, expect } from "vitest";
import {
  createAttachmentRef,
  InMemoryBinaryAttachmentStore,
  createInMemoryBinaryAttachmentStore,
} from "../src/attachment/attachment-ref.js";
import { AttachmentRefError } from "../src/errors.js";

describe("TC31_attachment_and_binary_store", () => {
  it("TC31_01_createAttachmentRef_generates_id_and_timestamp", () => {
    const ref = createAttachmentRef({
      sessionId: "session_1",
      path: "/uploads/session_1/img.png",
      name: "img.png",
      size: 1234,
      kind: "image",
      mimeType: "image/png",
    });
    expect(ref.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(ref.sessionId).toBe("session_1");
    expect(ref.path).toBe("/uploads/session_1/img.png");
    expect(ref.name).toBe("img.png");
    expect(ref.size).toBe(1234);
    expect(ref.kind).toBe("image");
    expect(ref.mimeType).toBe("image/png");
    expect(ref.createdAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("TC31_02_createAttachmentRef_custom_id_and_createdAt", () => {
    const ref = createAttachmentRef({
      id: "custom-id",
      sessionId: "session_1",
      path: "/x",
      name: "x",
      size: 1,
      kind: "file",
      createdAt: "2026-01-01T00:00:00Z",
    });
    expect(ref.id).toBe("custom-id");
    expect(ref.createdAt).toBe("2026-01-01T00:00:00Z");
  });

  it("TC31_03_store_save_and_get_roundtrip", async () => {
    const store = new InMemoryBinaryAttachmentStore();
    const content = new TextEncoder().encode("hello world");
    const ref = await store.save("session_1", "hello.txt", content, {
      mimeType: "text/plain",
      kind: "file",
    });
    expect(ref.sessionId).toBe("session_1");
    expect(ref.size).toBe(content.length);

    const got = await store.get(ref.id);
    expect(got.ref.id).toBe(ref.id);
    const chunks: Uint8Array[] = [];
    for await (const chunk of got.content) chunks.push(chunk);
    const decoded = new TextDecoder().decode(Buffer.concat(chunks));
    expect(decoded).toBe("hello world");
  });

  it("TC31_04_store_list_by_session", async () => {
    const store = new InMemoryBinaryAttachmentStore();
    await store.save("session_1", "a.txt", new TextEncoder().encode("a"), {
      kind: "file",
    });
    await store.save("session_1", "b.png", new TextEncoder().encode("b"), {
      kind: "image",
      mimeType: "image/png",
    });
    await store.save("session_2", "c.txt", new TextEncoder().encode("c"), {
      kind: "file",
    });

    const s1 = await store.list("session_1");
    expect(s1).toHaveLength(2);
    expect(s1.map((r) => r.name).sort()).toEqual(["a.txt", "b.png"]);

    const s2 = await store.list("session_2");
    expect(s2).toHaveLength(1);
    expect(s2[0]!.name).toBe("c.txt");
  });

  it("TC31_05_store_delete_and_exists", async () => {
    const store = new InMemoryBinaryAttachmentStore();
    const ref = await store.save(
      "session_1",
      "tmp.txt",
      new TextEncoder().encode("tmp"),
      { kind: "file" },
    );
    expect(await store.exists(ref.id)).toBe(true);
    await store.delete(ref.id);
    expect(await store.exists(ref.id)).toBe(false);
    await expect(store.get(ref.id)).rejects.toBeInstanceOf(AttachmentRefError);
    await expect(store.delete(ref.id)).rejects.toBeInstanceOf(
      AttachmentRefError,
    );
  });

  it("TC31_06_store_get_missing_throws", async () => {
    const store = new InMemoryBinaryAttachmentStore();
    await expect(store.get("nope")).rejects.toBeInstanceOf(AttachmentRefError);
  });

  it("TC31_07_createInMemoryBinaryAttachmentStore_factory", () => {
    const store = createInMemoryBinaryAttachmentStore();
    expect(store).toBeInstanceOf(InMemoryBinaryAttachmentStore);
  });
});
