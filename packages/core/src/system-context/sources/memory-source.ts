import type { ContextSourceValue, ContextSourceKey } from "../types.js";

export interface MemorySourceOptions {
  /** Registry key — defaults to the app-conventional `agent.memory`. */
  readonly key?: string;
  /** Defaults to 45 (after instructions/agent/workspace, before the default-100 tier). */
  readonly priority?: number;
  /** Heading rendered above the block — defaults to `## Memory`. */
  readonly heading?: string;
}

export type MemorySourceLoader = () => string | undefined | Promise<string | undefined>;

export const DEFAULT_MEMORY_SOURCE_PRIORITY = 45;

/**
 * System-context source for an auto-memory block (Claude Code MEMORY.md
 * parity). The loader supplies the rendered block (empty/undefined = no
 * memory yet → nothing is injected); mid-run writes surface on the next
 * `reconcile()` as an update.
 *
 * @example
 * ```typescript
 * registry.register(createMemorySource(async () => (await autoMemory.load()).renderBlock()));
 * ```
 */
export function createMemorySource(load: MemorySourceLoader, options?: MemorySourceOptions): ContextSourceValue<string> {
  const heading = options?.heading ?? "## Memory";
  const render = (value: string): string => (value.trim().length > 0 ? `${heading}\n\n${value}` : "");
  const source: ContextSourceValue<string> = {
    key: (options?.key ?? "agent.memory") as ContextSourceKey,
    async load() {
      return (await load()) ?? "";
    },
    renderBaseline(value) {
      return render(value);
    },
    renderUpdate(value) {
      return render(value);
    },
    renderRemoval() {
      return "";
    },
  };
  if (options?.priority !== undefined) {
    (source as { priority: number }).priority = options.priority;
  } else {
    (source as { priority: number }).priority = DEFAULT_MEMORY_SOURCE_PRIORITY;
  }
  return source;
}
