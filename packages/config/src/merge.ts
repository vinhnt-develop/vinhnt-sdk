import type { VntConfig } from "./schema.js";

/**
 * Deep merge two VntConfig objects.
 * Later sources override earlier ones at the top level.
 * Objects are merged (not replaced); arrays are replaced.
 */
export function mergeConfig(base: VntConfig, override: Partial<VntConfig>): VntConfig {
  return deepMerge(base, override);
}

/**
 * Deep merge two partial configs — generic version.
 * Handles nested objects recursively, arrays by replacement.
 */
export function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const baseVal = base[key as keyof T];
    if (isRecord(baseVal) && isRecord(value)) {
      result[key] = deepMerge(baseVal as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
