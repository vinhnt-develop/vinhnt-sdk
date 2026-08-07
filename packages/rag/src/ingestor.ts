import { readFileSync, statSync } from "node:fs";
import { readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, relative, extname } from "node:path";
import type { Document, IngestOptions } from "./types.js";

const DEFAULT_EXCLUDE = [
  "node_modules",
  ".git",
  "dist",
  ".turbo",
  "coverage",
  ".vscode",
  "target",
  "build",
  ".next",
];

const TEXT_MIME: Record<string, string> = {
  ".ts": "text/typescript",
  ".tsx": "text/typescript-jsx",
  ".js": "text/javascript",
  ".jsx": "text/javascript-jsx",
  ".json": "application/json",
  ".jsonc": "application/jsonc",
  ".md": "text/markdown",
  ".html": "text/html",
  ".css": "text/css",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".toml": "text/toml",
  ".py": "text/python",
  ".rs": "text/rust",
  ".go": "text/go",
  ".java": "text/java",
  ".c": "text/c",
  ".cpp": "text/cpp",
  ".h": "text/c-header",
  ".sh": "text/shell",
  ".ps1": "text/powershell",
  ".env": "text/env",
  ".gitignore": "text/gitignore",
  ".sql": "text/sql",
  ".xml": "text/xml",
  ".svg": "text/svg",
  ".txt": "text/plain",
};

function isTextFile(ext: string): string | null {
  return TEXT_MIME[ext.toLowerCase()] ?? null;
}

function shouldExclude(name: string, excludePatterns: string[]): boolean {
  return excludePatterns.some(
    (p) => name === p || name.startsWith(p + "/") || name.endsWith("/" + p),
  );
}

function collectFiles(
  dir: string,
  rootDir: string,
  excludePatterns: string[],
  includePatterns: string[] | undefined,
): string[] {
  const files: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const fullPath = resolve(dir, entry);
    const relPath = relative(rootDir, fullPath);
    let stats;
    try {
      stats = statSync(fullPath);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      if (shouldExclude(entry, excludePatterns)) continue;
      files.push(...collectFiles(fullPath, rootDir, excludePatterns, includePatterns));
    } else if (stats.isFile()) {
      if (shouldExclude(entry, excludePatterns)) continue;
      const ext = extname(entry);
      if (!isTextFile(ext)) continue;
      if (includePatterns && includePatterns.length > 0) {
        const matches = includePatterns.some((p) => {
          if (p.startsWith("*.")) return ext === p.slice(1);
          if (p.endsWith("/*")) return entry === p.slice(0, -2);
          return relPath.includes(p) || fullPath.includes(p);
        });
        if (!matches) continue;
      }
      files.push(fullPath);
    }
  }
  return files;
}

export function ingestDirectory(options: IngestOptions): Document[] {
  const rootDir = resolve(options.rootDir);
  const excludePatterns = [
    ...DEFAULT_EXCLUDE,
    ...(options.excludePatterns ?? []),
  ];
  const filePaths = collectFiles(
    rootDir,
    rootDir,
    excludePatterns,
    options.includePatterns,
  );
  const documents: Document[] = [];
  for (const filePath of filePaths) {
    const content = readFileSync(filePath, "utf-8");
    const checksum = createHash("sha256").update(content).digest("hex");
    const ext = extname(filePath);
    const mimeType = isTextFile(ext) ?? "text/plain";
    const relPath = relative(rootDir, filePath);
    documents.push({
      id: relPath.replace(/\\/g, "/"),
      sourceUri: filePath,
      title: relPath,
      mimeType,
      checksum,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  }
  return documents;
}
