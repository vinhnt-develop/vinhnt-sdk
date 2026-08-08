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

export interface LanguageMap {
  [extension: string]: string;
}

export interface CodeBoundaryPattern {
  pattern: RegExp;
  language: string[];
}

export interface ChunkerConfig {
  /** Custom language map for file extension → language detection */
  languageMap?: LanguageMap;
  /** Custom code boundary patterns for chunking */
  codeBoundaryPatterns?: CodeBoundaryPattern[];
  /** Default max lines per chunk */
  defaultMaxLines?: number;
  /** Default overlap lines */
  defaultOverlapLines?: number;
}

/**
 * Default language map — convenience only.
 * User tự extend: `config.languageMap = { ...DEFAULT_LANGUAGE_MAP, mylang: "my-language" }`
 */
export const DEFAULT_LANGUAGE_MAP: LanguageMap = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  rs: "rust",
  go: "go",
  java: "java",
  cpp: "cpp",
  c: "c",
  cs: "csharp",
  rb: "ruby",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  zig: "zig",
  elixir: "elixir",
  ex: "elixir",
  hs: "haskell",
  scala: "scala",
};

/**
 * Default code boundary patterns — convenience only.
 * User tự extend: `config.codeBoundaryPatterns = [...DEFAULT_CODE_BOUNDARY_PATTERNS, { pattern: /my-pattern/, language: ["my-lang"] }]`
 */
export const DEFAULT_CODE_BOUNDARY_PATTERNS: CodeBoundaryPattern[] = [
  // TypeScript/JavaScript function declarations
  { pattern: /^(?:export\s+)?(?:async\s+)?function\s+\w+/, language: ["typescript", "javascript"] },
  // TypeScript/JavaScript arrow functions (top-level)
  { pattern: /^(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?\(/, language: ["typescript", "javascript"] },
  // TypeScript/JavaScript class declarations
  { pattern: /^(?:export\s+)?(?:abstract\s+)?class\s+\w+/, language: ["typescript", "javascript"] },
  // Python function/class declarations
  { pattern: /^(?:def|class)\s+\w+/, language: ["python"] },
  // Rust function/struct/enum declarations
  { pattern: /^(?:pub\s+)?(?:fn|struct|enum|impl|trait)\s+\w+/, language: ["rust"] },
  // Go function/type declarations
  { pattern: /^(?:func|type)\s+\w+/, language: ["go"] },
  // Java class/method declarations
  { pattern: /^(?:public|private|protected)?\s*(?:static\s+)?(?:class|interface|enum)\s+\w+/, language: ["java"] },
  // C/C++ function declarations
  { pattern: /^(?:static\s+)?(?:inline\s+)?(?:void|int|float|double|char|bool|unsigned|signed|const)\s+\w+\s*\(/, language: ["c", "cpp"] },
  // Generic function-like patterns
  { pattern: /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*/, language: [] },
];

/**
 * Detect the programming language from a filename.
 */
function detectLanguage(filename: string, languageMap: LanguageMap): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? (languageMap[ext] ?? null) : null;
}

/**
 * Check if a line is a code boundary based on language patterns.
 */
function isCodeBoundary(line: string, language: string | null, patterns: CodeBoundaryPattern[]): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  for (const { pattern, language: langs } of patterns) {
    // If pattern has specific languages, check if current language matches
    if (langs.length > 0 && language && !langs.includes(language)) {
      continue;
    }
    if (pattern.test(trimmed)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a line is a comment or empty.
 */
function isCommentOrEmpty(line: string): boolean {
  const trimmed = line.trim();
  return !trimmed || /^\/\//.test(trimmed) || /^#/.test(trimmed) || /^\/\*/.test(trimmed) || /^\*/.test(trimmed);
}

/**
 * Split content at code boundaries (function/class declarations).
 * Returns arrays of line indices where chunks should be split.
 */
function findCodeBoundaries(lines: string[], language: string | null, patterns: CodeBoundaryPattern[]): number[] {
  const boundaries: number[] = [0]; // Always start at line 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line && isCodeBoundary(line, language, patterns)) {
      // Don't split in the middle of comments
      if (!isCommentOrEmpty(line)) {
        boundaries.push(i);
      }
    }
  }

  return boundaries;
}

export function chunkDocument(
  doc: Document,
  content: string,
  options: ChunkOptions = {},
  config?: ChunkerConfig,
): Chunk[] {
  const maxLines = options.maxLines ?? config?.defaultMaxLines ?? DEFAULT_MAX_LINES;
  const overlapLines = options.overlapLines ?? config?.defaultOverlapLines ?? DEFAULT_OVERLAP_LINES;
  const languageMap = config?.languageMap ?? DEFAULT_LANGUAGE_MAP;
  const codeBoundaryPatterns = config?.codeBoundaryPatterns ?? DEFAULT_CODE_BOUNDARY_PATTERNS;
  const lines = content.split("\n");
  const chunks: Chunk[] = [];
  let ordinal = 0;

  // Detect language from document source URI
  const language = detectLanguage(doc.sourceUri, languageMap);

  // Use code-aware chunking for code files
  if (language) {
    return chunkCodeDocument(doc, content, lines, language, options, codeBoundaryPatterns);
  }

  // Default: line-based chunking for non-code files
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

/**
 * Code-aware chunking that splits at function/class boundaries.
 * Optimal chunk size for code: 50-200 tokens, no overlap.
 */
function chunkCodeDocument(
  doc: Document,
  content: string,
  lines: string[],
  language: string,
  options: ChunkOptions,
  codeBoundaryPatterns: CodeBoundaryPattern[],
): Chunk[] {
  const maxTokensPerChunk = options.chunkSize ?? 150; // 150 tokens for code
  const boundaries = findCodeBoundaries(lines, language, codeBoundaryPatterns);
  const chunks: Chunk[] = [];
  let ordinal = 0;

  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i];
    if (start === undefined) continue;

    const end = i + 1 < boundaries.length ? (boundaries[i + 1] ?? lines.length) : lines.length;
    const chunkText = lines.slice(start, end).join("\n");
    const tokenCount = approximateTokenCount(chunkText);

    // If chunk is too large, split it further
    if (tokenCount > maxTokensPerChunk * 1.5) {
      // Split large chunks by lines
      const subChunks = splitLargeChunk(doc, lines, start, end, maxTokensPerChunk, ordinal);
      chunks.push(...subChunks);
      ordinal += subChunks.length;
    } else {
      // Prepend file path + class signature to chunk metadata
      const contextPrefix = buildContextPrefix(lines, start, language);
      const enrichedText = contextPrefix ? `${contextPrefix}\n${chunkText}` : chunkText;

      const chunk: Chunk = {
        id: randomUUID(),
        documentId: doc.id,
        ordinal,
        text: enrichedText,
        tokenCount: approximateTokenCount(enrichedText),
        headingPath: buildHeadingPath(lines, start, language),
        charRange: { start, end: end - 1 },
      };
      chunks.push(chunk);
      ordinal++;
    }
  }

  return chunks;
}

/**
 * Split a large chunk into smaller pieces.
 */
function splitLargeChunk(
  doc: Document,
  lines: string[],
  start: number,
  end: number,
  maxTokens: number,
  startOrdinal: number,
): Chunk[] {
  const chunks: Chunk[] = [];
  let currentStart = start;
  let ordinal = startOrdinal;

  while (currentStart < end) {
    let currentEnd = currentStart;
    let tokenCount = 0;

    // Find how many lines fit in the token budget
    while (currentEnd < end && tokenCount < maxTokens) {
      const line = lines[currentEnd];
      if (line) {
        tokenCount += approximateTokenCount(line);
      }
      currentEnd++;
    }

    const chunkText = lines.slice(currentStart, currentEnd).join("\n");
    const chunk: Chunk = {
      id: randomUUID(),
      documentId: doc.id,
      ordinal,
      text: chunkText,
      tokenCount: approximateTokenCount(chunkText),
      headingPath: "",
      charRange: { start: currentStart, end: currentEnd - 1 },
    };
    chunks.push(chunk);
    ordinal++;
    currentStart = currentEnd;
  }

  return chunks;
}

/**
 * Build context prefix with file path and enclosing class/function signature.
 */
function buildContextPrefix(lines: string[], lineIndex: number, language: string): string {
  const parts: string[] = [];

  // Look for enclosing class/struct/type declaration
  for (let i = lineIndex - 1; i >= 0 && i >= lineIndex - 100; i--) {
    const line = lines[i]?.trim();
    if (!line) continue;

    // Check for class/struct/type declarations
    if (/^(?:export\s+)?(?:abstract\s+)?class\s+\w+/.test(line) ||
        /^(?:pub\s+)?(?:struct|enum|impl)\s+\w+/.test(line) ||
        /^(?:export\s+)?type\s+\w+/.test(line)) {
      parts.unshift(line.replace(/\s*{?\s*$/, ""));
      break;
    }
  }

  return parts.length > 0 ? `// Context: ${parts[0]}` : "";
}

/**
 * Build heading path for code chunks (section comments, etc.).
 */
function buildHeadingPath(lines: string[], lineIndex: number, _language: string): string {
  const parts: string[] = [];

  // Look for section comments
  for (let i = lineIndex - 1; i >= 0 && i >= lineIndex - 50; i--) {
    const line = lines[i]?.trim();
    if (!line) continue;

    // Check for section comments (e.g., "// --- Section ---", "# Region")
    if (/^\/\/\s*[-=]{3,}/.test(line) || /^#\s*Region/i.test(line)) {
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && /^\/\/\s*(.+)/.test(nextLine)) {
        const sectionName = nextLine.replace(/^\/\/\s*/, "");
        parts.unshift(sectionName);
        break;
      }
    }
  }

  return parts.length > 0 ? parts.join(" > ") : "";
}
