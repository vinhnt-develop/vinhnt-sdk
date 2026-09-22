import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import { cpSync, mkdirSync, rmSync, existsSync } from "fs";

// Restore workspace:* for package.json files that were rewritten by fix-workspace-deps
// while preserving fixed descriptions / versions (mojibake already fixed on disk before rewrite).
// Prefer: backup of pre-fix-workspace files if present.
const PKGS = join(import.meta.dirname, "..", "packages");
const BACKUP = process.env.VINHNT_PKG_BACKUP;

if (!BACKUP) {
  console.error("Set VINHNT_PKG_BACKUP to a directory containing clean package.json backups");
  process.exit(1);
}

// Map: backup dir may hold core.json llm.json schema.json OR full tree
// Simpler approach: for each package, if backup has package.json restore it;
// if backup has <name>.json restore that as package.json.
let restored = 0;
for (const dir of readdirSync(PKGS)) {
  const target = join(PKGS, dir, "package.json");
  const cand1 = join(BACKUP, dir, "package.json");
  const cand2 = join(BACKUP, `${dir}.json`);
  if (existsSync(cand1)) {
    writeFileSync(target, readFileSync(cand1, "utf8"));
    restored++;
    console.log("restored", dir, "from tree backup");
  } else if (existsSync(cand2)) {
    writeFileSync(target, readFileSync(cand2, "utf8"));
    restored++;
    console.log("restored", dir, "from flat backup");
  }
}
console.log("restored", restored, "package.json files");
