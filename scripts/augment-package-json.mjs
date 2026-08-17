import { readdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packagesDir = join(root, "packages");
const rootLicense = join(root, "LICENSE");

const dirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

let copiedLicense = 0;
let exportsUpdated = 0;

for (const dir of dirs) {
  const pkgDir = join(packagesDir, dir);
  const licensePath = join(pkgDir, "LICENSE");
  if (!existsSync(licensePath)) {
    copyFileSync(rootLicense, licensePath);
    copiedLicense += 1;
  }

  const pkgPath = join(pkgDir, "package.json");
  const json = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (!json.exports) continue;

  const exports = json.exports;
  for (const key of Object.keys(exports)) {
    if (key === "." && typeof exports[key] === "object") {
      if (exports[key].default === undefined) {
        exports[key].default = exports[key].import ?? exports[key].types ?? "./dist/index.js";
        exportsUpdated += 1;
      }
    }
  }
  if (exports["./package.json"] === undefined) {
    exports["./package.json"] = "./package.json";
    exportsUpdated += 1;
  }
  writeFileSync(pkgPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
}

console.log(
  `OK: license copied to ${copiedLicense} package(s), exports touched in ${exportsUpdated} places`,
);