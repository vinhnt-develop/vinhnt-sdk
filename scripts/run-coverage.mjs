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

// Conservative floors (~1.5% under the current baseline). Ratchet these up as
// the suite grows; override per-run via env (e.g. COVERAGE_MIN_LINES=80).
const FLOORS = {
  lines: Number(process.env.COVERAGE_MIN_LINES ?? 72),
  statements: Number(process.env.COVERAGE_MIN_STATEMENTS ?? 72),
  branches: Number(process.env.COVERAGE_MIN_BRANCHES ?? 78),
  functions: Number(process.env.COVERAGE_MIN_FUNCTIONS ?? 62),
};

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
// Respect vitest's exit code: a failing test suite must fail the coverage run
// even when a partial summary was still written (reportOnFailure=true).
if ((r.status ?? 0) !== 0) {
  process.exit(r.status);
}
if (!existsSync(summaryPath)) {
  process.exit(1);
}

const t = JSON.parse(readFileSync(summaryPath, "utf8")).total;
const below = Object.entries(FLOORS).filter(([metric, floor]) => t[metric].pct < floor);
if (below.length > 0) {
  console.error(
    `\nCOVERAGE_BELOW_FLOOR: ${below
      .map(([metric, floor]) => `${metric} ${t[metric].pct}% < ${floor}%`)
      .join(", ")}`,
  );
  process.exit(1);
}
console.log(
  `coverage: floors OK (lines≥${FLOORS.lines} branches≥${FLOORS.branches} functions≥${FLOORS.functions})`,
);
process.exit(0);
