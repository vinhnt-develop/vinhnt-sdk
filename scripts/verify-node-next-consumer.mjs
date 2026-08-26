/**
 * Verify that built package declarations are consumable by a standard external
 * TypeScript ESM project using NodeNext resolution, and that built declaration
 * files contain no extensionless relative specifiers.
 *
 * Run after `pnpm build` has emitted declaration files under `dist/`.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(root, "packages");

function walkDir(base, ext) {
  const out = [];
  const walk = (p) => {
    for (const entry of readdirSync(p, { withFileTypes: true })) {
      const fp = join(p, entry.name);
      if (entry.isDirectory()) walk(fp);
      else if (entry.name.endsWith(ext)) out.push(fp);
    }
  };
  walk(base);
  return out;
}

const pkgDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(packagesDir, d.name));

const packages = pkgDirs
  .map((dir) => {
    const pkgJson = join(dir, "package.json");
    if (!existsSync(pkgJson)) return null;
    const manifest = JSON.parse(readFileSync(pkgJson, "utf8"));
    if (!manifest.name) return null;
    return { dir, name: manifest.name, manifest };
  })
  .filter((p) => p !== null)
  .sort((a, b) => a.name.localeCompare(b.name));

const declarationSpecifierPattern = /(?:from\s*|import\s*\(\s*|import\s+|declare\s+module\s*)["'](\.{0,2}(?:\/[^"']*)?)["']/g;
const hasExtension = /\.[^/.]+$/;

function relativeSpecifiersMissingExtensions() {
  const errors = [];
  for (const pkg of packages) {
    const dist = join(pkg.dir, "dist");
    if (!existsSync(dist)) continue;
    for (const file of walkDir(dist, ".d.ts")) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(declarationSpecifierPattern)) {
        const specifier = match[1];
        if (!specifier) continue;
        const isRelative = specifier === "." || specifier.startsWith("./") || specifier.startsWith("../");
        if (isRelative && !hasExtension.test(specifier)) {
          errors.push(`${relative(root, file)}: ${specifier}`);
        }
      }
    }
  }
  return errors;
}

function publicSpecifiers(pkg) {
  const specifiers = new Set();
  if (pkg.manifest.types) specifiers.add(pkg.name);
  for (const [key, target] of Object.entries(pkg.manifest.exports ?? {})) {
    if (key.includes("*") || key === "./package.json") continue;
    if (typeof target !== "object" || target === null || !target.types) continue;
    specifiers.add(key === "." ? pkg.name : `${pkg.name}/${key.slice(2)}`);
  }
  return [...specifiers].sort();
}

function linkPackage(pkg, nodeModules) {
  const parts = pkg.name.split("/");
  const link = resolve(nodeModules, ...parts);
  mkdirSync(dirname(link), { recursive: true });
  symlinkSync(pkg.dir, link, "dir");
}

const badSpecifiers = relativeSpecifiersMissingExtensions();
if (badSpecifiers.length > 0) {
  console.error("verify-node-next-consumer: declaration files still contain relative specifiers without file extensions.");
  console.error(badSpecifiers.join("\n"));
  process.exit(1);
}

const missingOutputs = packages
  .filter((pkg) => pkg.manifest.types && !existsSync(resolve(pkg.dir, pkg.manifest.types)))
  .map((pkg) => `${pkg.name}: missing ${pkg.manifest.types}`);

if (missingOutputs.length > 0) {
  console.error("verify-node-next-consumer: build outputs are missing; run `pnpm build` first.");
  console.error(missingOutputs.join("\n"));
  process.exit(1);
}

const tmp = mkdtempSync(join(root, ".node-next-types-"));
let failed = false;

try {
  const nodeModules = resolve(tmp, "node_modules");
  mkdirSync(nodeModules, { recursive: true });
  for (const pkg of packages) linkPackage(pkg, nodeModules);

  const rootTypes = resolve(root, "node_modules/@types/node");
  if (existsSync(rootTypes)) {
    const typesDir = resolve(nodeModules, "@types");
    mkdirSync(typesDir, { recursive: true });
    symlinkSync(rootTypes, resolve(typesDir, "node"), "dir");
  }

  writeFileSync(resolve(tmp, "package.json"), `${JSON.stringify({ type: "module", private: true }, null, 2)}\n`);
  writeFileSync(resolve(tmp, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      target: "es2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      skipLibCheck: true,
      preserveSymlinks: true,
      noEmit: true,
      types: ["node"],
    },
    include: ["index.ts"],
  }, null, 2)}\n`);

  const imports = packages
    .flatMap(publicSpecifiers)
    .map((specifier, index) => `import * as mod${index} from ${JSON.stringify(specifier)};\nvoid mod${index};`)
    .join("\n");
  writeFileSync(resolve(tmp, "index.ts"), `${imports}\n`);

  execFileSync(process.execPath, [resolve(root, "node_modules/typescript/bin/tsc"), "-p", resolve(tmp, "tsconfig.json"), "--pretty", "false"], {
    stdio: "pipe",
  });
  console.log(`verify-node-next-consumer: ${packages.length} workspace package declaration API(s) compile under NodeNext.`);
} catch (error) {
  failed = true;
  const output = error;
  console.error("verify-node-next-consumer: NodeNext consumer typecheck failed.\n");
  console.error(`${output.stdout?.toString() ?? ""}${output.stderr?.toString() ?? ""}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failed) process.exit(1);