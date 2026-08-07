import { randomUUID } from "node:crypto";
import type { Chunk, ChunkOptions, Document } from "./types.js";

const DEFAULT_MAX_LINES = 50;
const DEFAULT_OVERLAP_LINES = 10;

function approximateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function extractHeadingPath(lines: string[], startIdx: number): string {
  const headings: string[] = [];
  for (let i = startIdx; i >= 0 && i >= startIdx - 100; i--) {
    const line = lines[i]?.trim();
    if (line && /^#{1,6}\s/.test(line)) {
      const level = line.match(/^#+/)?.[0].length ?? 1;
      headings.unshift(line.replace(/^#+\s*/, ""));
      if (level === 1) break;
    }
  }
  return headings.join(" > ");
}

export function chunkDocument(
  doc: Document,
  content: string,
  options: ChunkOptions = {},
): Chunk[] {
  const maxLines = options.maxLines ?? DEFAULT_MAX_LINES;
  const overlapLines = options.overlapLines ?? DEFAULT_OVERLAP_LINES;
  const lines = content.split("\n");
  const chunks: Chunk[] = [];
  let ordinal = 0;
  let start = 0;

  while (start < lines.length) {
    const end = Math.min(start + maxLines, lines.length);
    const chunkText = lines.slice(start, end).join("\n");
    const tokenCount = approximateTokenCount(chunkText);
    let headingPath = "";
    if (start > 0) {
      headingPath = extractHeadingPath(lines, start);
    }
    const chunk: Chunk = {
      id: randomUUID(),
      documentId: doc.id,
      ordinal,
      text: chunkText,
      tokenCount,
      headingPath,
      charRange: {
        start,
        end: end - 1,
      },
    };
    chunks.push(chunk);
    ordinal++;
    if (end >= lines.length) break;
    start = end - overlapLines;
    if (start < 0) start = 0;
  }
  return chunks;
}
