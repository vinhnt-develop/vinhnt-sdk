#!/usr/bin/env node
/**
 * Dead-export checker + fixer for package barrels (P5.6 / S9).
 *
 * A name exported from `packages/<pkg>/src/index.ts` counts as DEAD when it
 * is referenced NOWHERE:
 *   1. in any `import/export ... from "@vinhnt-sdk/<pkg>"` clause across the
 *      SDK (packages, scripts, evals, docs examples) and the sibling app
 *      repos (vinhnt-agent, vinhnt-webui, vinhnt-api),
 *   2. as `import("@vinhnt-sdk/<pkg>").Name` (dynamic type reference),
 *   3. in docs/README prose (word-boundary mention — docs must not lie),
 *   4. as a non-declaration reference anywhere in the package's own `src/**`
 *      (signature usage of surviving exports keeps their types alive).
 *
 * `export *` barrels are rejected (same rule as check-docs-exports).
 *
 * Usage:
 *   node scripts/check-dead-exports.mjs          # report
 *   node scripts/check-dead-exports.mjs --fix    # remove dead names from `export { }` blocks
 *   node scripts/check-dead-exports.mjs --gate   # exit 1 if any dead export remains
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const siblingRepos = ["vinhnt-agent", "vinhnt-webui", "vinhnt-api"]
  .map((d) => join(root, "..", d))
  .filter((d) => {
    try {
      readdirSync(d);
      return true;
    } catch {
      return false;
    }
  });

const SKIP_DIRS = new Set([
  "node_modules", "dist", ".git", "build", "coverage", ".turbo",
  ".next", "out", ".svelte-kit", "vendor", ".agents",
]);
const CODE_EXT = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|vue|svelte|astro)$/;
const DOC_EXT = /\.(md|mdx)$/;

function walk(dir, filter = () => true, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(p, filter, out);
    } else if (filter(p)) {
      out.push(p);
    }
  }
  return out;
}

function isGeneratedApiDoc(p) {
  return p.replace(/\\/g, "/").includes("/docs/api-reference/");
}

/** Parse public export names of a package's src/index.ts (same rules as check-docs-exports). */
function parseExports(rawSrc) {
  if (/export\s*\*/.test(rawSrc)) {
    throw new Error("index.ts uses `export *` — checker cannot resolve star exports");
  }
  // Strip comments inside `export { ... }` blocks so names don't get glued to
  // trailing `// comment` text (parse-only copy — source files are untouched).
  const src = rawSrc.replace(/export\s+(?:type\s+)?\{[^}]*\}/g, (blk) =>
    blk.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, ""),
  );
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:type\s+)?\{([^}]+)\}\s*(?:from\s*["'][^"']+["'])?/g)) {
    for (let part of m[1].split(",")) {
      part = part.trim();
      if (!part) continue;
      part = part.replace(/^type\s+/, "");
      const asMatch = part.match(/^(.+?)\s+as\s+([A-Za-z_$][\w$]*)$/);
      names.add(asMatch ? asMatch[2] : part);
    }
  }
  for (const m of src.matchAll(/export\s+(?:declare\s+)?(?:async\s+function\*?|function\*?|const|let|var|class|interface|enum|type)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]);
  }
  return names;
}

/** Extract names imported/re-exported from a package barrel in one file's text. */
const CLAUSE_RE =
  /(?:import|export)\s+(?:type\s+)?(?:([A-Za-z_$][\w$]*)\s*,\s*)?(?:\{([^}]+)\})?\s*from\s*["']([^"']+)["']/g;
const NAMESPACE_RE = /import\s+\*\s+as\s+[A-Za-z_$][\w$]*\s+from\s*["']([^"']+)["']/g;
const DYNAMIC_RE = /import\(\s*["'](@vinhnt-sdk\/[a-z0-9-]+)["']\s*\)\s*\.\s*([A-Za-z_$][\w$]*)/g;

/** Map an import specifier (package name or relative path) to a package barrel, else null. */
const barrelPathToPkg = new Map();
function registerBarrel(pkgName, indexFile) {
  const norm = indexFile.replace(/\\/g, "/").replace(/\.(ts|tsx|js|mjs)$/, "");
  barrelPathToPkg.set(norm, pkgName);
}

function resolveBarrelPkg(file, spec) {
  if (spec.startsWith("@vinhnt-sdk/")) return spec.split("/").slice(0, 2).join("/");
  if (!spec.startsWith(".")) return null;
  const abs = join(file.replace(/\\/g, "/").replace(/\/[^/]+$/, ""), spec).replace(/\\/g, "/");
  const norm = abs.replace(/\.(ts|tsx|js|mjs|jsx|cjs)$/, "");
  return barrelPathToPkg.get(norm) ?? barrelPathToPkg.get(norm.replace(/\/$/, "")) ?? null;
}

function extractClauseNames(text, into, file) {
  for (const m of text.matchAll(CLAUSE_RE)) {
    const pkg = resolveBarrelPkg(file, m[3]);
    const named = m[2];
    if (!pkg || !named) continue;
    const set = into.get(pkg) ?? new Set();
    for (let part of named.split(",")) {
      part = part.trim().replace(/^type\s+/, "");
      if (!part) continue;
      const asMatch = part.match(/^([A-Za-z_$][\w$]*)\s+as\s+/);
      set.add(asMatch ? asMatch[1] : part);
    }
    into.set(pkg, set);
  }
  for (const m of text.matchAll(NAMESPACE_RE)) {
    const pkg = resolveBarrelPkg(file, m[1]);
    if (!pkg) continue;
    const set = into.get(pkg) ?? new Set();
    set.add("*NAMESPACE*");
    into.set(pkg, set);
  }
  for (const m of text.matchAll(DYNAMIC_RE)) {
    const set = into.get(m[1]) ?? new Set();
    set.add(m[2]);
    into.set(m[1], set);
  }
}

// --- 1. load barrels ---
const exportedByPkg = new Map(); // "@vinhnt-sdk/x" -> Set(names)
const indexSrcByPkg = new Map();
for (const entry of readdirSync(join(root, "packages"), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = join(root, "packages", entry.name);
  let pj;
  try {
    pj = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  } catch {
    continue;
  }
  if (!pj.name || !pj.name.startsWith("@vinhnt-sdk/")) continue;
  const src = readFileSync(join(dir, "src", "index.ts"), "utf8");
  exportedByPkg.set(pj.name, parseExports(src));
  indexSrcByPkg.set(pj.name, { src, file: join(dir, "src", "index.ts") });
  registerBarrel(pj.name, join(dir, "src", "index.ts"));
}
const allNames = new Set();
for (const set of exportedByPkg.values()) for (const n of set) allNames.add(n);
const nameList = [...allNames].sort();

// --- 2. import-clause usage (SDK code + docs examples + scripts + evals + app repos) ---
const importedByPkg = new Map();
const sdkFiles = [
  ...walk(join(root, "packages"), (p) => CODE_EXT.test(p) || DOC_EXT.test(p)),
  ...walk(join(root, "scripts"), (p) => CODE_EXT.test(p) || DOC_EXT.test(p)),
  ...walk(join(root, "evals"), (p) => CODE_EXT.test(p) || DOC_EXT.test(p)),
  ...walk(join(root, "docs"), (p) => !isGeneratedApiDoc(p) && DOC_EXT.test(p)),
  ...walk(root, (p) => DOC_EXT.test(p) && !relative(root, p).replace(/\\/g, "/").includes("/")),
];
const appFiles = siblingRepos.flatMap((d) => walk(d, (p) => CODE_EXT.test(p) || DOC_EXT.test(p)));
for (const file of [...sdkFiles, ...appFiles]) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  extractClauseNames(text, importedByPkg, file);
}

// --- 3. prose mentions in docs / READMEs / app docs (word boundary) ---
const mentionFiles = [
  ...walk(join(root, "docs"), (p) => !isGeneratedApiDoc(p) && DOC_EXT.test(p)),
  ...walk(join(root, "packages"), (p) => DOC_EXT.test(p)),
  ...walk(root, (p) => DOC_EXT.test(p) && !relative(root, p).replace(/\\/g, "/").includes("/")),
  ...siblingRepos.flatMap((d) => walk(d, (p) => DOC_EXT.test(p))),
];
const mentionRe = new RegExp(`\\b(${nameList.join("|")})\\b`, "g");
const mentioned = new Set();
for (const file of mentionFiles) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const m of text.matchAll(mentionRe)) mentioned.add(m[1]);
}

// --- 4. own-src non-declaration references (signature usage etc.) ---
const DECL_PREFIX = /(?:^|[^\w$])(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:function\*?|class|interface|type|const|let|var|enum)\s+$/;
const EXPORT_BLOCK_RE = /export\s+(?:type\s+)?\{[^}]*\}\s*(?:from\s*["'][^"']*["'])?\s*;?/g;
function srcUsedNames(pkgName) {
  const pkgDir = join(root, "packages", pkgName.replace("@vinhnt-sdk/", ""));
  const files = walk(join(pkgDir, "src"), (p) => p.endsWith(".ts"));
  const localNames = [...(exportedByPkg.get(pkgName) ?? [])];
  const used = new Set();
  if (localNames.length === 0) return used;
  const localRe = new RegExp(`\\b(${localNames.join("|")})\\b`, "g");
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    text = text.replace(EXPORT_BLOCK_RE, "");
    for (const m of text.matchAll(localRe)) {
      const before = text.slice(Math.max(0, m.index - 90), m.index);
      if (DECL_PREFIX.test(before)) continue; // the declaration itself
      used.add(m[1]);
    }
  }
  return used;
}

// --- 5. classify ---
const report = [];
let deadTotal = 0;
let exportTotal = 0;
for (const [pkgName, names] of exportedByPkg) {
  const imported = importedByPkg.get(pkgName) ?? new Set();
  const usedInSrc = srcUsedNames(pkgName);
  const dead = [];
  for (const name of names) {
    exportTotal++;
    if (name === "*NAMESPACE*") continue;
    const keep =
      imported.has(name) ||
      imported.has("*NAMESPACE*") ||
      mentioned.has(name) ||
      usedInSrc.has(name);
    if (!keep) dead.push(name);
  }
  dead.sort();
  deadTotal += dead.length;
  report.push({ pkgName, total: names.size, dead });
}

// --- 6. output / fix ---
const args = new Set(process.argv.slice(2));
const mode = args.has("--fix") ? "fix" : args.has("--gate") ? "gate" : "report";

if (mode === "fix") {
  for (const { pkgName, dead } of report) {
    if (dead.length === 0) continue;
    const { src, file } = indexSrcByPkg.get(pkgName);
    const deadSet = new Set(dead);
    let out = src;
    const manual = [];
    // rebuild ONLY blocks that contain dead names (other blocks stay verbatim,
    // preserving their inline comments); comments inside touched blocks drop.
    out = out.replace(/export\s+(type\s+)?\{([^}]+)\}(\s*from\s*["'][^"']+["'])?\s*;?/g, (full, typeKw = "", body, from = "") => {
      const cleanBody = body.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
      const parts = cleanBody.split(",").map((p) => p.trim()).filter(Boolean);
      const kept = parts.filter((trimmed) => {
        const bare = trimmed.replace(/^type\s+/, "").match(/^(.+?)\s+as\s+/)?.[1] ?? trimmed.replace(/^type\s+/, "");
        return !deadSet.has(bare);
      });
      if (kept.length === parts.length) return full; // no dead name in this block
      if (kept.length === 0) return "";
      return `export ${typeKw ?? ""}{ ${kept.join(", ")} }${from};`;
    });
    // inline declarations: only single-line-safe removal (`export type X = ...;` style left in place is manual)
    for (const name of dead) {
      const inlineRe = new RegExp(`^export\\s+(?:type|interface|enum|const|let|var)\\s+${name}\\b[^;]*;\\s*$`, "m");
      if (inlineRe.test(out)) {
        out = out.replace(inlineRe, "");
      } else if (new RegExp(`^export\\s+(?:async\\s+)?function\\s+${name}\\b`, "m").test(out) ||
                 new RegExp(`^export\\s+class\\s+${name}\\b`, "m").test(out) ||
                 new RegExp(`^export\\s+interface\\s+${name}\\b`, "m").test(out)) {
        manual.push(name);
      }
    }
    out = out.replace(/\n{3,}/g, "\n\n");
    writeFileSync(file, out, "utf8");
    const stillManual = manual.filter((n) => new RegExp(`\\b${n}\\b`).test(out));
    console.log(`fix: ${pkgName} — removed ${dead.length - stillManual.length}/${dead.length} dead export(s)${stillManual.length ? `, MANUAL: ${stillManual.join(", ")}` : ""}`);
    deadTotal -= dead.length - stillManual.length;
  }
  console.log(`dead-exports fix pass: ${deadTotal} remaining (inline blocks need manual edit)`);
} else {
  console.log(`dead-exports: ${deadTotal} dead / ${exportTotal} exported names across ${exportedByPkg.size} packages`);
  for (const { pkgName, total, dead } of report) {
    if (dead.length === 0) continue;
    console.log(`  ${pkgName}: ${dead.length}/${total} dead`);
    console.log(`    ${dead.join(", ")}`);
  }
  if (mode === "gate" && deadTotal > 0) {
    console.error(`\ndead-exports: FAIL (${deadTotal} dead export(s) — run --fix or document/import them)`);
    process.exit(1);
  }
  if (mode === "gate") console.log("dead-exports: OK (0 dead)");
}
