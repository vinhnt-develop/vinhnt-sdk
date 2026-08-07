import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, extname, sep } from "node:path";

const IGNORE_DIRS = new Set(["node_modules", ".git", ".next", "dist", ".turbo", "coverage", ".vscode", ".venv", "__pycache__"]);
const PARSE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rs", ".go"]);

export interface SymbolEntry {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "variable" | "component" | "export";
  file: string;
  line: number;
}

export interface ImportEntry {
  source: string;
  imported: string[];
  file: string;
  line: number;
}

export interface CodebaseMap {
  symbols: SymbolEntry[];
  imports: ImportEntry[];
  files: string[];
  fileCount: number;
}

type SymbolKind = SymbolEntry["kind"];

interface SymbolPattern {
  regex: RegExp;
  kind: SymbolKind;
}

const PATTERNS: SymbolPattern[] = [
  { regex: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm, kind: "function" },
  { regex: /^(?:export\s+)?class\s+(\w+)/gm, kind: "class" },
  { regex: /^(?:export\s+)?interface\s+(\w+)/gm, kind: "interface" },
  { regex: /^(?:export\s+)?type\s+(\w+)/gm, kind: "type" },
  { regex: /^export\s+(?:const|let|var)\s+(\w+)/gm, kind: "export" },
  { regex: /^(?:export\s+)?(?:default\s+)?function\s+([A-Z]\w+)/gm, kind: "component" },
];

const IMPORT_TS_RE = /import\s+(?:\{[^}]*\}|[^;{]+)\s+from\s+['"]([^'"]+)['"]/gm;

function parseSymbols(content: string, file: string): SymbolEntry[] {
  const symbols: SymbolEntry[] = [];
  for (const { regex, kind } of PATTERNS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const name = match[1]!;
      const line = content.slice(0, match.index).split("\n").length;
      if (!symbols.some((s) => s.name === name && s.file === file)) {
        symbols.push({ name, kind, file, line });
      }
    }
  }
  return symbols;
}

function parseImports(content: string, file: string): ImportEntry[] {
  const imports: ImportEntry[] = [];
  let match: RegExpExecArray | null;
  while ((match = IMPORT_TS_RE.exec(content)) !== null) {
    const source = match[1]!;
    const line = content.slice(0, match.index).split("\n").length;
    const named = match[0].match(/\{\s*([^}]+)\s*\}/);
    const imported = named
      ? named[1]!.split(",").map((s) => s.trim()).filter(Boolean)
      : match[0].includes("* as ")
        ? [match[0].match(/\*\s+as\s+(\w+)/)?.[1] ?? source]
        : [source.split("/").pop() ?? source];
    imports.push({ source, imported, file, line });
  }
  return imports;
}

export class CodebaseMapper {
  private map: CodebaseMap = { symbols: [], imports: [], files: [], fileCount: 0 };

  async build(rootDir: string): Promise<CodebaseMap> {
    this.map = { symbols: [], imports: [], files: [], fileCount: 0 };
    await this.collectFiles(rootDir, rootDir);
    this.map.fileCount = this.map.files.length;
    return this.map;
  }

  private async collectFiles(dir: string, root: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.collectFiles(fullPath, root);
      } else if (PARSE_EXTS.has(extname(entry.name))) {
        const relPath = relative(root, fullPath).split(sep).join("/");
        this.map.files.push(relPath);
        try {
          const st = await stat(fullPath);
          if (st.size > 200_000) continue;
          const content = await readFile(fullPath, "utf-8");
          this.map.symbols.push(...parseSymbols(content, relPath));
          this.map.imports.push(...parseImports(content, relPath));
        } catch {
          continue;
        }
      }
    }
  }

  searchSymbol(query: string, maxResults = 10): SymbolEntry[] {
    const q = query.toLowerCase();
    const scored = this.map.symbols
      .map((s) => ({ s, score: this.similarity(s.name, q) }))
      .filter((x) => x.score > 0.2)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults).map((x) => x.s);
  }

  getFileSymbols(file: string): SymbolEntry[] {
    return this.map.symbols.filter((s) => s.file === file);
  }

  findReferences(symbolName: string): { file: string; line: number }[] {
    const results: { file: string; line: number }[] = [];
    const lower = symbolName.toLowerCase();
    for (const imp of this.map.imports) {
      if (imp.imported.some((i) => i.toLowerCase() === lower)) {
        results.push({ file: imp.file, line: imp.line });
      }
    }
    for (const sym of this.map.symbols) {
      if (sym.name.toLowerCase() === lower && !results.some((r) => r.file === sym.file)) {
        results.push({ file: sym.file, line: sym.line });
      }
    }
    return results;
  }

  private similarity(name: string, query: string): number {
    const n = name.toLowerCase();
    if (n === query) return 1;
    if (n.includes(query)) return 0.8;
    if (query.includes(n)) return 0.6;
    const nWords = n.split(/[_\s/.-]+/);
    const qWords = query.split(/[_\s/.-]+/);
    const matches = qWords.filter((w) => nWords.some((nw) => nw.includes(w) || w.includes(nw)));
    return (matches.length / Math.max(qWords.length, 1)) * 0.5;
  }

  getSummary(): string {
    const byKind = new Map<string, number>();
    for (const s of this.map.symbols) {
      byKind.set(s.kind, (byKind.get(s.kind) ?? 0) + 1);
    }
    const kinds = [...byKind.entries()].map(([k, v]) => `${k}:${v}`).join(", ");
    return `📁 ${this.map.fileCount} files, ${this.map.symbols.length} symbols (${kinds})`;
  }
}
