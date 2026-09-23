#!/usr/bin/env node
/** Run vitest coverage and print totals from json-summary (Windows-safe). */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, "coverage");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const args = [
  "vitest",
  "run",
  "--coverage",
  "--coverage.reportOnFailure=true",
  "--coverage.reporter=text-summary",
  "--coverage.reporter=json-summary",
  ...process.argv.slice(2),
];

const r = spawnSync("npx", args, { stdio: "inherit", shell: true, cwd: root });
const summaryPath = join(outDir, "coverage-summary.json");
if (existsSync(summaryPath)) {
  const s = JSON.parse(readFileSync(summaryPath, "utf8"));
  const t = s.total;
  console.log(
    `\nCOVERAGE_TOTAL lines=${t.lines.pct}% statements=${t.statements.pct}% branches=${t.branches.pct}% functions=${t.functions.pct}%`,
  );
} else {
  console.error("NO_COVERAGE_SUMMARY");
}
process.exit(existsSync(summaryPath) ? 0 : (r.status ?? 1));
