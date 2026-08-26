import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

const root = process.env.SDK_ROOT || process.cwd();
const packagesDir = join(root, "packages");
const baselineFile = join(root, "scripts", ".export-jsdoc-baseline.json");

const minPct = Number(process.argv.find((a) => a.startsWith("--min="))?.split("=")[1] ?? 0);
const writeBaseline = process.argv.includes("--baseline");

const dirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const declRe =
  /^\s*export\s+(?:declare\s+)?(?:default\s+|abstract\s+)?(?:function|class|interface|type|enum|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
const namedRe = /^\s*export\s*{\s*([^}]+?)\s*}\s*(?:from\s*["']([^"']+)["'])?/gm;
const starRe = /^\s*export\s*\*\s*from\s*["']([^"']+)["']/gm;

function getAdjacentJsDoc(text, exportIndex) {
  const upTo = text.slice(0, exportIndex);
  const blockEnd = upTo.lastIndexOf("*/");
  if (blockEnd === -1) return null;
  const between = upTo.slice(blockEnd + 2);
  if (/\S/.test(between)) return null;
  const blockStart = upTo.lastIndexOf("/**", blockEnd);
  if (blockStart === -1) return null;
  const inside = upTo.slice(blockStart + 3, blockEnd);
  if (inside.includes("/**")) return null;
  return inside;
}

function hasAdjacentJsDoc(text, exportIndex) {
  return getAdjacentJsDoc(text, exportIndex) !== null;
}

/** A symbol is package-internal when its JSDoc block carries `@internal` (RV-16). */
function isInternal(doc) {
  return doc !== null && /\b@internal\b/.test(doc);
}

function resolveSpec(dir, spec) {
  if (spec.startsWith("@vinhnt-sdk/")) {
    const name = spec.split("/").slice(0, 2).join("/").replace("@vinhnt-sdk/", "");
    const idx = join(packagesDir, name, "src", "index.ts");
    return existsSync(idx) ? idx : null;
  }
  let p = join(dir, spec.replace(/\.js$/, ""));
  for (const cand of [p + ".ts", p + ".tsx", join(p, "index.ts")]) {
    if (existsSync(cand)) return cand;
  }
  return null;
}

function collectReachables(file, visited, srcExports) {
  if (!file || visited.has(file)) return;
  visited.add(file);
  const text = readFileSync(file, "utf8");
  const local = new Map();
  declRe.lastIndex = 0;
  let m;
  while ((m = declRe.exec(text))) {
    const doc = getAdjacentJsDoc(text, m.index);
    // RV-16: @internal symbols are not part of the public API surface — neither
    // documented-count nor total-count includes them.
    if (isInternal(doc)) continue;
    local.set(m[1], doc !== null);
  }
  srcExports.set(file, local);

  const targets = [];
  starRe.lastIndex = 0;
  while ((m = starRe.exec(text))) {
    if (!m[1].startsWith(".")) continue;
    targets.push(m[1]);
  }
  namedRe.lastIndex = 0;
  while ((m = namedRe.exec(text))) {
    const from = m[2];
    if (!from) continue;
    if (!from.startsWith(".")) continue;
    targets.push(from);
  }
  for (const t of targets) {
    const target = resolveSpec(dirname(file), t);
    if (target) collectReachables(target, visited, srcExports);
  }
}

const perPackage = {};
let total = 0;
let documented = 0;
const missing = [];

for (const dir of dirs) {
  const index = join(packagesDir, dir, "src", "index.ts");
  if (!existsSync(index)) {
    perPackage[dir] = { files: 0, exports: 0, documented: 0, pct: 100 };
    continue;
  }
  const visited = new Set();
  const srcExports = new Map();
  collectReachables(index, visited, srcExports);

  let pkgTotal = 0;
  let pkgDoc = 0;
  for (const [file, local] of srcExports) {
    for (const [name, hasDoc] of local) {
      pkgTotal += 1;
      total += 1;
      if (hasDoc) {
        pkgDoc += 1;
        documented += 1;
      } else {
        missing.push(`${dir} ${file.replaceAll("\\", "/").replace(/^.*\/packages\//, "")}:${name}`);
      }
    }
  }
  perPackage[dir] = {
    files: srcExports.size,
    exports: pkgTotal,
    documented: pkgDoc,
    pct: pkgTotal === 0 ? 100 : Math.round((pkgDoc / pkgTotal) * 1000) / 10,
  };
}

const pct = total === 0 ? 100 : Math.round((documented / total) * 1000) / 10;

if (writeBaseline) {
  writeFileSync(
    baselineFile,
    JSON.stringify({ total, documented, pct, perPackage, missing }, null, 2),
    "utf8",
  );
  console.log(`baseline written: ${documented}/${total} public exports (${pct}%)`);
  process.exit(0);
}

console.log(`Public exported symbols: ${documented}/${total} documented (${pct}%)`);
console.log("Per package:");
for (const [name, v] of Object.entries(perPackage)) {
  const flag = v.exports === 0 ? "  " : v.pct >= 50 ? "ok" : "!!";
  console.log(`  ${name.padEnd(26)} ${String(v.documented).padStart(4)}/${String(v.exports).padEnd(4)} ${String(v.pct).padStart(5)}%  ${flag}`);
}

if (missing.length > 0) {
  console.log(`\nMissing JSDoc (first 30 of ${missing.length}):`);
  for (const m of missing.slice(0, 30)) console.log(`  ${m}`);
}

if (pct < minPct) {
  console.error(`\nFAIL: JSDoc coverage ${pct}% < --min=${minPct}%`);
  process.exit(1);
}
console.log(`\nOK: public-API JSDoc coverage >= ${minPct}%`);