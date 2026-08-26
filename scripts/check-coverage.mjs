import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const summaryFile = join(root, "coverage", "coverage-summary.json");
const baselineFile = join(root, "scripts", ".coverage-baseline.json");

const METRICS = ["lines", "functions", "statements", "branches"];
const TOLERANCE = 10;
const NEW_FILE_FLOOR = 50;
const TOTAL_FLOORS = { lines: 70, functions: 70, branches: 75 };

if (!existsSync(summaryFile)) {
  console.error(`No ${summaryFile}. Run: pnpm test:coverage`);
  process.exit(1);
}
const summary = JSON.parse(readFileSync(summaryFile, "utf8"));

const files = new Map(
  Object.entries(summary)
    .filter(([p]) => p !== "total" && /packages[\\/][^\\/]+[\\/]src[\\/]/.test(p))
    .map(([p, s]) => [p.replaceAll("\\", "/"), s]),
);

if (process.argv.includes("--baseline")) {
  const baseline = {};
  for (const [file, s] of files) {
    baseline[file] = {};
    for (const m of METRICS) baseline[file][m] = s[m]?.pct ?? 100;
  }
  writeFileSync(baselineFile, JSON.stringify(baseline, null, 2), "utf8");
  console.log(`Baseline written for ${files.size} files`);
  process.exit(0);
}

if (!existsSync(baselineFile)) {
  console.error(`No ${baselineFile}. Run: pnpm test:coverage && pnpm check:coverage --baseline`);
  process.exit(1);
}
const baseline = JSON.parse(readFileSync(baselineFile, "utf8"));

const total = summary.total;
let failures = 0;
const failList = [];

for (const m of METRICS) {
  const pct = total[m]?.pct ?? 100;
  if (pct < TOTAL_FLOORS[m]) {
    failures += 1;
    failList.push(`total ${m} ${pct}% < floor ${TOTAL_FLOORS[m]}%`);
  }
}

for (const [file, s] of files) {
  const rel = file.replace(`${root.replaceAll("\\", "/")}/`, "");
  const prev = baseline[file];
  for (const m of METRICS) {
    const pct = s[m]?.pct ?? 100;
    if (!prev) {
      if (pct < NEW_FILE_FLOOR) {
        failures += 1;
        failList.push(`${rel} NEW ${m} ${pct}% < floor ${NEW_FILE_FLOOR}%`);
      }
      continue;
    }
    if (pct < prev[m] - TOLERANCE) {
      failures += 1;
      failList.push(`${rel} ${m} regressed ${prev[m]}% -> ${pct}%`);
    }
  }
}

const t = (m) => `${m.pct}%`;
console.log(`Coverage totals: lines ${t(total.lines)}, functions ${t(total.functions)}, statements ${t(total.statements)}, branches ${t(total.branches)}`);
console.log(`Per-file checked: ${files.size}`);

if (failures > 0) {
  console.error(`FAIL: ${failures} violation(s)`);
  for (const f of failList.slice(0, 50)) console.error(`  ${f}`);
  process.exit(1);
}
console.log("OK: no coverage regressions, floors met");