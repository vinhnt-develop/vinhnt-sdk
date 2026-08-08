import { describe, it, expect } from "vitest";
import type { RAGConfig, Chunk, SearchResult } from "../src/types.js";

describe("RAG Package", () => {
  it("TC01_exports_main_types", async () => {
    const mod = await import("../src/index.js");
    expect(mod).toBeDefined();
  });

  it("TC02_RAGConfig_type_is_valid", () => {
    const config: RAGConfig = {
      chunkSize: 1000,
      chunkOverlap: 200,
    };
    expect(config.chunkSize).toBe(1000);
    expect(config.chunkOverlap).toBe(200);
  });

  it("TC03_Chunk_type_is_valid", () => {
    const chunk: Chunk = {
      id: "chunk-1",
      content: "test content",
      metadata: { filePath: "test.ts" },
    };
    expect(chunk.id).toBe("chunk-1");
    expect(chunk.content).toBe("test content");
  });

  it("TC04_SearchResult_type_is_valid", () => {
    const result: SearchResult = {
      chunk: {
        id: "chunk-1",
        content: "test",
        metadata: {},
      },
      score: 0.95,
    };
    expect(result.score).toBe(0.95);
  });
});
