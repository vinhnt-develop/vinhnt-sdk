import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const packagesDir = join(root, "packages");
const baselineFile = join(root, "scripts", ".export-jsdoc-baseline.json");

const minPct = Number(process.argv.find((a) => a.startsWith("--min="))?.split("=")[1] ?? 0);
const writeBaseline = process.argv.includes("--baseline");

const dirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const exportRe =
  /^\s*export\s+(?:declare\s+)?(?:default\s+|abstract\s+)?(?:function|class|interface|type|enum|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;

function walk(p, files) {
  for (const e of readdirSync(p, { withFileTypes: true })) {
    const fp = join(p, e.name);
    if (e.isDirectory()) walk(fp, files);
    else if (/\.ts$/.test(e.name) && !/\.d\.ts$/.test(e.name)) files.push(fp);
  }
}

function hasAdjacentJsDoc(text, exportIndex) {
  const upTo = text.slice(0, exportIndex);
  const blockEnd = upTo.lastIndexOf("*/");
  if (blockEnd === -1) return false;
  const between = upTo.slice(blockEnd + 2);
  if (/\S/.test(between)) return false;
  const blockStart = upTo.lastIndexOf("/**", blockEnd);
  if (blockStart === -1) return false;
  const inside = upTo.slice(blockStart + 3, blockEnd);
  return !inside.includes("/**");
}

let total = 0;
let documented = 0;
const missing = [];

for (const dir of dirs) {
  const base = join(packagesDir, dir, "src");
  if (!existsSync(base)) continue;
  const files = [];
  walk(base, files);
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    exportRe.lastIndex = 0;
    let m;
    while ((m = exportRe.exec(text))) {
      total += 1;
      if (hasAdjacentJsDoc(text, m.index)) {
        documented += 1;
      } else {
        missing.push(`${dir}/${file.replaceAll("\\", "/").split("/packages/")[1] || ""}:${m[1]}`);
      }
    }
  }
}

const pct = total === 0 ? 100 : Math.round((documented / total) * 1000) / 10;

if (writeBaseline) {
  writeFileSync(baselineFile, JSON.stringify({ total, documented, pct, missing }, null, 2), "utf8");
  console.log(`baseline written: ${documented}/${total} exported symbols (${pct}%)`);
  process.exit(0);
}

console.log(`Exported symbols: ${documented}/${total} documented (${pct}%)`);
if (missing.length > 0) {
  console.log(`Missing JSDoc (first 20):`);
  for (const m of missing.slice(0, 20)) console.log(`  ${m}`);
}

if (pct < minPct) {
  console.error(`FAIL: JSDoc coverage ${pct}% < --min=${minPct}%`);
  process.exit(1);
}
console.log(`OK: JSDoc coverage >= ${minPct}%`);