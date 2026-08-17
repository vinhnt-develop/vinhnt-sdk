import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const packagesDir = join(root, "packages");
const mojibake = /[\u00c2\u00c3\u00e2\u20ac\ufffd]/g;

const dirNames = readdirSync(packagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const files = [];
for (const dir of dirNames) {
  for (const sub of ["src", "test"]) {
    const base = join(packagesDir, dir, sub);
    if (!statSync(base, { throwIfNoEntry: false })) continue;
    const walk = (p) => {
      for (const entry of readdirSync(p, { withFileTypes: true })) {
        const fp = join(p, entry.name);
        if (entry.isDirectory()) {
          walk(fp);
        } else if (/\.ts$/.test(entry.name)) {
          files.push(fp);
        }
      }
    };
    walk(base);
  }
}

const bad = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  if (mojibake.test(text)) {
    bad.push(file);
    mojibake.lastIndex = 0;
  }
}

if (bad.length > 0) {
  console.error(`FAIL: mojibake/UTF-8 corruption found in ${bad.length} file(s):`);
  for (const f of bad) console.error(`  ${f}`);
  process.exit(1);
}

const licenseMissing = dirNames
  .filter((d) => !statSync(join(packagesDir, d, "LICENSE"), { throwIfNoEntry: false }))
  .map((d) => d);

if (licenseMissing.length > 0) {
  console.error(`FAIL: missing LICENSE in: ${licenseMissing.join(", ")}`);
  process.exit(1);
}

console.log(`OK: hygiene check passed (${files.length} ts files scanned, all packages have LICENSE)`);