import { readdirSync, copyFileSync, mkdirSync } from "fs";
import { join } from "path";

const PKGS = join(import.meta.dirname, "..", "packages");
const bak = `.pkg-backup-${Date.now()}`;
const bakPath = join(import.meta.dirname, "..", "..", bak);
mkdirSync(bakPath, { recursive: true });
for (const d of readdirSync(PKGS)) {
  try {
    copyFileSync(join(PKGS, d, "package.json"), join(bakPath, `${d}.json`));
  } catch {}
}
console.log("backup to", bakPath);
