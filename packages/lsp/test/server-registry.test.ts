import { describe, it, expect } from "vitest";
import { BUILTIN_SERVERS, findServerByExtension, findServerById, getLanguageId } from "../src/server-registry.js";

describe("server-registry", () => {
  describe("BUILTIN_SERVERS", () => {
    it("has at least 24 entries (18 original + 6 new)", () => {
      expect(BUILTIN_SERVERS.length).toBeGreaterThanOrEqual(24);
    });

    it("each entry has required fields", () => {
      for (const s of BUILTIN_SERVERS) {
        expect(s.id).toBeTruthy();
        expect(s.name).toBeTruthy();
        expect(s.languageId).toBeTruthy();
        expect(s.extensions.length).toBeGreaterThan(0);
        expect(s.command).toBeTruthy();
        expect(Array.isArray(s.args)).toBe(true);
        expect(Array.isArray(s.rootFiles)).toBe(true);
      }
    });

    it("has no duplicate ids", () => {
      const ids = BUILTIN_SERVERS.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("has no duplicate name+languageId pairs", () => {
      const pairs = BUILTIN_SERVERS.map((s) => `${s.name}::${s.languageId}`);
      expect(new Set(pairs).size).toBe(pairs.length);
    });

    it("has unique extension assignments (no two servers claim same extension)", () => {
      const extMap = new Map<string, string[]>();
      for (const s of BUILTIN_SERVERS) {
        for (const ext of s.extensions) {
          const existing = extMap.get(ext) ?? [];
          existing.push(s.id);
          extMap.set(ext, existing);
        }
      }
      const collisions = Array.from(extMap.entries()).filter(([, ids]) => ids.length > 1);
      expect(collisions).toEqual([]);
    });
  });

  describe("findServerByExtension", () => {
    it("finds TypeScript for .ts", () => {
      const s = findServerByExtension(".ts");
      expect(s).toBeDefined();
      expect(s!.id).toBe("typescript");
    });

    it("finds JavaScript for .js", () => {
      const s = findServerByExtension(".js");
      expect(s).toBeDefined();
      expect(s!.id).toBe("javascript");
    });

    it("finds Python for .py", () => {
      const s = findServerByExtension(".py");
      expect(s).toBeDefined();
      expect(s!.id).toBe("pyright");
    });

    it("finds Rust for .rs", () => {
      const s = findServerByExtension(".rs");
      expect(s).toBeDefined();
      expect(s!.id).toBe("rust");
    });

    it("finds Go for .go", () => {
      const s = findServerByExtension(".go");
      expect(s).toBeDefined();
      expect(s!.id).toBe("gopls");
    });

    it("finds Dart for .dart", () => {
      const s = findServerByExtension(".dart");
      expect(s).toBeDefined();
      expect(s!.id).toBe("dart");
    });

    it("finds Kotlin for .kt", () => {
      const s = findServerByExtension(".kt");
      expect(s).toBeDefined();
      expect(s!.id).toBe("kotlin");
    });

    it("finds Swift for .swift", () => {
      const s = findServerByExtension(".swift");
      expect(s).toBeDefined();
      expect(s!.id).toBe("swift");
    });

    it("finds Scala for .scala", () => {
      const s = findServerByExtension(".scala");
      expect(s).toBeDefined();
      expect(s!.id).toBe("scala");
    });

    it("finds Haskell for .hs", () => {
      const s = findServerByExtension(".hs");
      expect(s).toBeDefined();
      expect(s!.id).toBe("haskell");
    });

    it("finds Elixir for .ex", () => {
      const s = findServerByExtension(".ex");
      expect(s).toBeDefined();
      expect(s!.id).toBe("elixir");
    });

    it("finds Dockerfile", () => {
      const s = findServerByExtension("Dockerfile");
      expect(s).toBeDefined();
      expect(s!.id).toBe("docker");
    });

    it("returns undefined for unknown extension", () => {
      const s = findServerByExtension(".xyz");
      expect(s).toBeUndefined();
    });
  });

  describe("findServerById", () => {
    it("finds by id", () => {
      expect(findServerById("typescript")).toBeDefined();
      expect(findServerById("pyright")).toBeDefined();
      expect(findServerById("nonexistent")).toBeUndefined();
    });
  });

  describe("getLanguageId", () => {
    it("returns correct language for known extensions", () => {
      expect(getLanguageId(".ts")).toBe("typescript");
      expect(getLanguageId(".py")).toBe("python");
      expect(getLanguageId(".rs")).toBe("rust");
      expect(getLanguageId(".go")).toBe("go");
      expect(getLanguageId(".dart")).toBe("dart");
      expect(getLanguageId(".kt")).toBe("kotlin");
    });

    it("returns plaintext for unknown extensions", () => {
      expect(getLanguageId(".xyz")).toBe("plaintext");
    });
  });
});
