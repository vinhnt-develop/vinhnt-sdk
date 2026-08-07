import { existsSync } from "node:fs";
import { readFileSync, appendFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const ENV_FILENAME = ".env";

/**
 * Find the closest `.env` file by walking up from `startDir` to the filesystem
 * root. This lets `pnpm --filter @vinhnt-sdk/api dev` (which runs from apps/api) and
 * the CLI (which runs from the project root) share the same root `.env`.
 */
export function findEnvFile(startDir = process.cwd()): string | null {
  let dir = resolve(startDir);
  for (;;) {
    const candidate = join(dir, ENV_FILENAME);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Load the closest `.env` file into `process.env`. Existing env vars are NOT
 * overwritten (shell/CLI wins over the file). Returns the file path that was
 * loaded, or null when none was found.
 *
 * Uses Node's built-in `process.loadEnvFile` (>= 20.12) — no dotenv dependency.
 */
export function loadEnvFile(startDir = process.cwd()): string | null {
  const file = findEnvFile(startDir);
  if (!file) return null;
  try {
    process.loadEnvFile(file);
  } catch (err) {
    if (process.env.VNT_DEBUG === "1") {
      console.warn(`[env] Failed to load ${file}:`, err);
    }
  }
  return file;
}

/**
 * Return a stable API token for the daemon. On first run (no VNT_API_TOKEN in
 * env or `.env`) a token is generated and appended to the root `.env` so it
 * survives restarts — the client can re-use the same Bearer token every time.
 * A real `VNT_API_TOKEN` in the environment always wins.
 */
export function ensureVntApiToken(startDir = process.cwd()): string {
  if (process.env.VNT_API_TOKEN) return process.env.VNT_API_TOKEN;

  const file = findEnvFile(startDir);
  if (file) {
    try {
      const existing = readFileSync(file, "utf-8");
      const match = existing.match(/^\s*VNT_API_TOKEN\s*=\s*(.+?)\s*$/m);
      if (match?.[1] && match[1].length > 0) {
        const value = match[1];
        process.env.VNT_API_TOKEN = value;
        return value;
      }
    } catch { /* fall through to generate */ }
  }

  const token = randomUUID().replace(/-/g, "");
  process.env.VNT_API_TOKEN = token;

  // Persist so the next restart uses the same token.
  const target = file ?? (findEnvFile(dirname(startDir)) ? join(dirname(startDir), ENV_FILENAME) : resolve(startDir, ENV_FILENAME));
  try {
    appendFileSync(target, `\n# Auto-generated on first start. Set your own VNT_API_TOKEN to override.\nVNT_API_TOKEN=${token}\n`, { flag: "a" });
  } catch { /* non-fatal: token is still in-process */ }

  return token;
}
