import type { ContextSourceValue, ContextSourceKey } from "../types.js";

/**
 * Create a simple static context source from a string value.
 * Useful for user-provided prompts or custom context that doesn't need
 * dynamic loading or reconciliation.
 *
 * @example
 * ```typescript
 * registry.register(createCustomSource({
 *   key: "my.custom-context",
 *   value: "You are a helpful assistant.",
 *   priority: 0,
 * }));
 * ```
 */
export function createCustomSource(config: {
  key: string;
  value: string;
  priority?: number;
}): ContextSourceValue<string> {
  const source: ContextSourceValue<string> = {
    key: config.key as ContextSourceKey,
    async load() {
      return config.value;
    },
    renderBaseline(value) {
      return value;
    },
    renderUpdate() {
      return null;
    },
    renderRemoval() {
      return "";
    },
  };
  if (config.priority !== undefined) {
    (source as { priority: number }).priority = config.priority;
  }
  return source;
}
