import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const packagesDir = join(root, "packages");

const dirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const srcExportRe = /^\s*export\s+\{\s*([^}]+)\}\s*from\s*["']([^"']+)["']/gm;
const declRe = /export\s+(?:declare\s+)?(?:default\s+|abstract\s+)?(?:function|class|interface|type|enum|const|let|var)\s+([A-Za-z_$][\w$]*)/g;
const dtsReExportRe = /export\s+\{([^}]*)\}\s*(?:from|;)/g;

let failures = 0;

for (const dir of dirs) {
  const srcIndex = join(packagesDir, dir, "src", "index.ts");
  const distIndex = join(packagesDir, dir, "dist", "index.d.ts");
  if (!existsSync(srcIndex)) continue;
  if (!existsSync(distIndex)) {
    console.error(`FAIL: ${dir} missing dist/index.d.ts (run pnpm build first)`);
    failures += 1;
    continue;
  }

  const src = readFileSync(srcIndex, "utf8");
  const dts = readFileSync(distIndex, "utf8");

  const names = new Set();
  srcExportRe.lastIndex = 0;
  let m;
  while ((m = srcExportRe.exec(src))) {
    for (const name of m[1].split(",")) {
      const trimmed = name.trim().split(" as ")[0].trim();
      if (trimmed) names.add(trimmed);
    }
  }
  declRe.lastIndex = 0;
  while ((m = declRe.exec(src))) names.add(m[1]);

  const declaredInDts = new Set();
  dtsReExportRe.lastIndex = 0;
  while ((m = dtsReExportRe.exec(dts))) {
    for (const name of m[1].split(",")) {
      const trimmed = name.trim().split(" as ")[0].trim();
      if (trimmed) declaredInDts.add(trimmed);
    }
  }
  declRe.lastIndex = 0;
  while ((m = declRe.exec(dts))) declaredInDts.add(m[1]);
  const star = /\* from/.test(dts);

  const missingInDts = [...names].filter((n) => !declaredInDts.has(n) && !star);
  if (missingInDts.length > 0) {
    console.error(`FAIL: ${dir} exports missing in dist/index.d.ts: ${missingInDts.join(", ")}`);
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`${failures} package(s) failed export-map verification`);
  process.exit(1);
}
console.log(`OK: export-map verified across ${dirs.length} packages`);