#!/usr/bin/env node
/**
 * Docs-vs-exports checker (P5.3).
 *
 * Extracts every `import { ... } from "@vinhnt-sdk/<pkg>"` in README/docs
 * files and diffs the imported names against the package's real exports
 * (src/index.ts). Fails (exit 1) on any phantom import — docs must match
 * reality (AGENTS.md "Docs khớp reality" rule).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const failures = [];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist" || e.name === ".git") continue;
      walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

/** Parse public export names of a package's src/index.ts. */
function parseExports(src) {
  const names = new Set();
  if (/export\s*\*/.test(src)) {
    throw new Error("index.ts uses `export *` — checker cannot resolve star exports");
  }
  // export { A, type B, C as D } [from "..."]
  for (const m of src.matchAll(/export\s+(?:type\s+)?\{([^}]+)\}\s*(?:from\s*["'][^"']+["'])?/g)) {
    for (let part of m[1].split(",")) {
      part = part.trim();
      if (!part) continue;
      part = part.replace(/^type\s+/, "");
      const asMatch = part.match(/^(.+?)\s+as\s+([A-Za-z_$][\w$]*)$/);
      names.add(asMatch ? asMatch[2] : part);
    }
  }
  // export const/function/class/interface/type/enum NAME
  for (const m of src.matchAll(/export\s+(?:declare\s+)?(?:async\s+function\*?|function\*?|const|let|var|class|interface|enum|type)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]);
  }
  return names;
}

/** Collect `import ... from "@vinhnt-sdk/<pkg>"` specifiers with line numbers. */
function extractImports(text) {
  const found = [];
  const importRe = /import\s+(type\s+)?([A-Za-z_$][\w$]*)?\s*(?:\{([^}]+)\})?\s*from\s*["'](@vinhnt-sdk\/[a-z0-9-]+)["']/g;
  for (const m of text.matchAll(importRe)) {
    const line = text.slice(0, m.index).split(/\r?\n/).length;
    const defaultImport = m[2];
    const named = m[3];
    const pkg = m[4];
    if (defaultImport && !named) {
      found.push({ line, pkg, name: `(default) ${defaultImport}` });
      continue;
    }
    if (!named) continue;
    for (let part of named.split(",")) {
      part = part.trim().replace(/^type\s+/, "");
      if (!part) continue;
      const asMatch = part.match(/^(.+?)\s+as\s+/);
      found.push({ line, pkg, name: asMatch ? asMatch[1] : part });
    }
  }
  return found;
}

// --- load package exports ---
const pkgDir = join(root, "packages");
const exportsByPkg = new Map();
for (const entry of readdirSync(pkgDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = join(pkgDir, entry.name);
  let pj;
  try {
    pj = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  } catch {
    continue;
  }
  if (!pj.name || !pj.name.startsWith("@vinhnt-sdk/")) continue;
  try {
    exportsByPkg.set(pj.name, parseExports(readFileSync(join(dir, "src", "index.ts"), "utf8")));
  } catch (err) {
    failures.push({ file: join(dir, "src", "index.ts"), line: "-", pkg: pj.name, name: err.message });
  }
}

// --- doc files: package READMEs + root README + docs/** ---
// docs/migration/** is skipped: "before" code snippets intentionally show old APIs.
const docFiles = [
  join(root, "README.md"),
  ...walk(join(root, "packages")).filter((f) => f.endsWith("README.md")),
  ...walk(join(root, "docs")).filter(
    (f) => /\.(md|mdx)$/.test(f) && !f.replace(/\\/g, "/").includes("/docs/migration/"),
  ),
];

for (const file of docFiles) {
  if (!statSync(file).isFile()) continue;
  const text = readFileSync(file, "utf8");
  for (const { line, pkg, name } of extractImports(text)) {
    const exports = exportsByPkg.get(pkg);
    if (!exports) {
      failures.push({ file, line, pkg, name: `unknown package ${pkg}` });
      continue;
    }
    if (!exports.has(name)) {
      failures.push({ file, line, pkg, name });
    }
  }
}

if (failures.length > 0) {
  console.error(`docs-vs-exports: ${failures.length} phantom import(s):\n`);
  for (const f of failures) {
    console.error(`  ${relative(root, f.file)}:${f.line}  ${f.pkg} has no export "${f.name}"`);
  }
  process.exit(1);
}
console.log(`docs-vs-exports: OK (${docFiles.length} docs checked, ${exportsByPkg.size} packages)`);
