#!/usr/bin/env node
/**
 * Hygiene gate — fails when published/source artifacts contain encoding defects.
 *
 * Detects (byte-level, so it works regardless of how the file is edited):
 *   - UTF-8 BOM at the start of a file
 *   - Unicode replacement char U+FFFD (0xEF 0xBF 0xBD)
 *   - double-encoded em-dash mojibake "â€" (0xC3 0xA2 0xE2 0x82 0xAC …)
 *
 * Scans `packages/<pkg>/src`, `packages/<pkg>/test` and `packages/<pkg>/dist`.
 * Exit code 1 on any finding (gate); pass --no-gate to only report.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname, relative } from "node:path";

const root = process.cwd();
const packagesDir = join(root, "packages");
const gate = !process.argv.includes("--no-gate");

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const REPLACEMENT = Buffer.from([0xef, 0xbf, 0xbd]);
const MOJI = [
  { label: "double-encoded em-dash", pat: Buffer.from([0xc3, 0xa2, 0xe2, 0x82, 0xac]) },
];

const SCAN_EXT = new Set([".ts", ".js", ".mjs", ".cjs", ".d.ts", ".md"]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(p, out);
    } else if (SCAN_EXT.has(extname(p)) || p.endsWith(".d.ts")) {
      out.push(p);
    }
  }
  return out;
}

function count(buf, pat) {
  let n = 0;
  let i = buf.indexOf(pat);
  while (i !== -1) {
    n++;
    i = buf.indexOf(pat, i + 1);
  }
  return n;
}

const targets = [];
if (existsSync(packagesDir)) {
  for (const pkg of readdirSync(packagesDir)) {
    const base = join(packagesDir, pkg);
    if (!statSync(base).isDirectory()) continue;
    for (const sub of ["src", "test", "dist"]) {
      targets.push(...walk(join(base, sub)));
    }
  }
}
const issues = [];
for (const f of targets) {
  const buf = readFileSync(f);
  const rel = relative(root, f);
  if (buf.subarray(0, 3).equals(BOM)) issues.push(`${rel}  BOM at start of file`);
  const rep = count(buf, REPLACEMENT);
  if (rep > 0) issues.push(`${rel}  U+FFFD replacement char x${rep}`);
  for (const { label, pat } of MOJI) {
    const c = count(buf, pat);
    if (c > 0) issues.push(`${rel}  ${label} x${c}`);
  }
}

console.log(`hygiene: scanned ${targets.length} files`);
if (issues.length === 0) {
  console.log("hygiene: OK — no encoding defects");
  process.exit(0);
}
console.error(`hygiene: ${issues.length} issue(s):`);
for (const line of issues) console.error(`  ${line}`);
process.exit(gate ? 1 : 0);
