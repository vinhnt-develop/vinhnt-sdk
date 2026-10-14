import { describe, it, expect } from "vitest";
import { createMergePatch, applyMergePatch } from "../src/context/merge-patch.js";

describe("RFC 7386 merge-patch", () => {
  describe("createMergePatch", () => {
    it("returns undefined when values are deeply equal", () => {
      expect(createMergePatch({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).toBeUndefined();
      expect(createMergePatch([1, 2, 3], [1, 2, 3])).toBeUndefined();
      expect(createMergePatch("x", "x")).toBeUndefined();
    });

    it("scalar change replaces wholesale", () => {
      expect(createMergePatch({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
    });

    it("added key appears in patch", () => {
      expect(createMergePatch({ a: 1 }, { a: 1, b: 2 })).toEqual({ b: 2 });
    });

    it("removed key becomes null", () => {
      expect(createMergePatch({ a: 1, b: 2 }, { a: 1 })).toEqual({ b: null });
    });

    it("nested object diffs recursively", () => {
      const patch = createMergePatch(
        { env: { cwd: "/a", branch: "main" } },
        { env: { cwd: "/b", branch: "main" } },
      );
      expect(patch).toEqual({ env: { cwd: "/b" } });
    });

    it("nested removal emits null", () => {
      const patch = createMergePatch(
        { env: { cwd: "/a", branch: "main" } },
        { env: { cwd: "/a" } },
      );
      expect(patch).toEqual({ env: { branch: null } });
    });

    it("array replaces wholesale (RFC 7386)", () => {
      expect(createMergePatch({ files: ["a", "b"] }, { files: ["c"] })).toEqual({ files: ["c"] });
    });

    it("object → scalar replaces wholesale", () => {
      expect(createMergePatch({ a: { b: 1 } }, { a: 5 })).toEqual({ a: 5 });
    });

    it("scalar → object emits full object", () => {
      expect(createMergePatch({ a: 5 }, { a: { b: 1 } })).toEqual({ a: { b: 1 } });
    });

    it("non-object previous treated as empty (all keys added)", () => {
      expect(createMergePatch(undefined, { a: 1 })).toEqual({ a: 1 });
      expect(createMergePatch(null, { a: 1 })).toEqual({ a: 1 });
    });
  });

  describe("applyMergePatch", () => {
    it("applies nested patch correctly", () => {
      const prev = { env: { cwd: "/a", branch: "main" }, files: ["x"] };
      const patch = { env: { cwd: "/b" }, files: ["y"] };
      expect(applyMergePatch(prev, patch)).toEqual({
        env: { cwd: "/b", branch: "main" },
        files: ["y"],
      });
    });

    it("null deletes the key", () => {
      expect(applyMergePatch({ a: 1, b: 2 }, { b: null })).toEqual({ a: 1 });
    });

    it("nested null deletes nested key", () => {
      expect(
        applyMergePatch({ env: { cwd: "/a", branch: "main" } }, { env: { branch: null } }),
      ).toEqual({ env: { cwd: "/a" } });
    });

    it("non-object patch replaces target wholesale", () => {
      expect(applyMergePatch({ a: 1 }, [1, 2])).toEqual([1, 2]);
      expect(applyMergePatch({ a: 1 }, "str")).toEqual("str");
    });

    it("non-object target replaced with empty object before merge", () => {
      expect(applyMergePatch(5, { a: 1 })).toEqual({ a: 1 });
    });

    it("new key with object patch expands", () => {
      expect(applyMergePatch({}, { nested: { a: 1, b: 2 } })).toEqual({ nested: { a: 1, b: 2 } });
    });

    it("round-trips: create → apply restores current", () => {
      const previous = { env: { cwd: "/a", branch: "main" }, files: ["x"], keep: true };
      const current = { env: { cwd: "/b" }, files: ["x", "y"] }; // keep removed
      const patch = createMergePatch(previous, current);
      expect(patch).toBeDefined();
      expect(applyMergePatch(previous, patch)).toEqual(current);
    });
  });
});
