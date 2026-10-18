#!/usr/bin/env node
/**
 * Version-sync gate — keeps the `fixed` changesets group honest.
 *
 * The SDK publishes every non-private `@vinhnt-sdk/*` package as one aligned
 * release (changesets `fixed: [["@vinhnt-sdk/*"]]`). Drift creeps in silently
 * when someone edits a single package.json by hand, so this gate fails when:
 *
 *   1. publishable (non-private) packages do not share one version
 *   2. any in-repo `@vinhnt-sdk/*` dependency is not `workspace:*`
 *      (a concrete range would publish a stale pin and duplicate types)
 *
 * Exit code 1 on any finding (gate); pass --no-gate to only report.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const packagesDir = join(root, "packages");
const gate = !process.argv.includes("--no-gate");

const DEP_FIELDS = ["dependencies", "peerDependencies", "optionalDependencies", "devDependencies"];

if (!existsSync(packagesDir)) {
  console.error(`version-sync: no packages directory at ${packagesDir}`);
  process.exit(gate ? 1 : 0);
}

const issues = [];
const publishable = [];

const pkgDirs = readdirSync(packagesDir).filter((name) =>
  existsSync(join(packagesDir, name, "package.json")),
);

const manifests = [];
for (const dir of pkgDirs) {
  const file = join(packagesDir, dir, "package.json");
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  manifests.push({ dir, file, pkg });
}

for (const { dir, file, pkg } of manifests) {
  const rel = relative(root, file);
  if (!pkg.private) publishable.push({ dir, name: pkg.name, version: pkg.version });

  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const [name, range] of Object.entries(deps)) {
      if (!name.startsWith("@vinhnt-sdk/")) continue;
      if (!range.startsWith("workspace:")) {
        issues.push(`${rel}  ${field}.${name} must use "workspace:*" (found "${range}")`);
      }
    }
  }
}

const versions = [...new Set(publishable.map((p) => p.version))];
if (versions.length > 1) {
  issues.push(
    `publishable packages have divergent versions: ${publishable
      .map((p) => `${p.name}@${p.version}`)
      .sort()
      .join(", ")}`,
  );
}

console.log(
  `version-sync: ${publishable.length} publishable package(s)` +
    (versions.length === 1 ? ` @ ${versions[0]}` : ""),
);

if (issues.length === 0) {
  console.log("version-sync: OK — versions aligned, internal deps use workspace:");
  process.exit(0);
}

console.error(`version-sync: ${issues.length} issue(s):`);
for (const line of issues) console.error(`  ${line}`);
process.exit(gate ? 1 : 0);
