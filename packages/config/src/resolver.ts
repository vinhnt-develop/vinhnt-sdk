import { readFileSync, existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { VntConfig } from "./schema.js";

const ENV_PATTERN = /\{env:([^}]+)\}/g;
const FILE_PATTERN = /\{file:([^}]+)\}/g;

interface ResolveOptions {
  configDir?: string;
}

function hasPathTraversal(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  let depth = 0;
  for (const part of parts) {
    if (part === "..") depth--;
    else if (part !== "." && part !== "") depth++;
    if (depth < 0) return true;
  }
  return false;
}

function resolveFile(path: string, options?: ResolveOptions): string {
  if (hasPathTraversal(path)) {
    throw new Error(`Path traversal detected in file reference: ${path}`);
  }

  if (isAbsolute(path)) {
    // When a configDir is provided (non-default), reject absolute paths
    // to prevent reading arbitrary system files via {file:/etc/passwd}
    if (options?.configDir) {
      throw new Error(`Absolute path not allowed in file reference when configDir is set: ${path}`);
    }
  }

  let resolved: string;
  if (isAbsolute(path)) {
    resolved = path;
  } else {
    const baseDir = options?.configDir ?? process.cwd();
    resolved = resolve(baseDir, path);
  }

  if (!existsSync(resolved)) {
    throw new Error(`Referenced file not found: ${resolved}`);
  }

  const stat = readFileSync(resolved, "utf-8");
  return stat.trimEnd();
}

function resolveValue(value: string, options?: ResolveOptions): string {
  let resolved = value.replace(ENV_PATTERN, (_, name: string) => {
    return process.env[name] ?? "";
  });
  resolved = resolved.replace(FILE_PATTERN, (_, path: string) => {
    return resolveFile(path, options);
  });
  return resolved;
}

function walkAndResolve(value: unknown, options?: ResolveOptions): unknown {
  if (typeof value === "string") {
    return resolveValue(value, options);
  }
  if (Array.isArray(value)) {
    return value.map((item) => walkAndResolve(item, options));
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = walkAndResolve(v, options);
    }
    return result;
  }
  return value;
}

export function resolveConfig(config: VntConfig, options?: ResolveOptions): VntConfig {
  return walkAndResolve(config, options) as VntConfig;
}
