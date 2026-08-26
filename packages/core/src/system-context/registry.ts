import type { ContextSourceKey, ContextSourceValue, ContextSnapshot, SystemContext, ReconcileResult, ContextRegistry } from "./types.js";

export function createContextRegistry(): ContextRegistry {
  const sources = new Map<ContextSourceKey, ContextSourceValue>();
  let initialized = false;
  let snapshots = new Map<ContextSourceKey, ContextSnapshot>();

  return {
    register(source: ContextSourceValue): void {
      sources.set(source.key, source);
    },

    unregister(key: ContextSourceKey): void {
      sources.delete(key);
    },

    async initialize(): Promise<SystemContext> {
      const entries: string[] = [];
      const newSnapshots = new Map<ContextSourceKey, ContextSnapshot>();

      const sorted = [...sources.values()].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
      for (const source of sorted) {
        const value = await source.load();
        const rendered = source.renderBaseline(value);
        if (rendered) {
          entries.push(rendered);
        }
        newSnapshots.set(source.key, { key: source.key, value, rendered });
      }

      snapshots = newSnapshots;
      initialized = true;

      return {
        baseline: entries.join("\n\n"),
        snapshots: snapshots,
      };
    },

    async reconcile(): Promise<ReconcileResult> {
      if (!initialized) {
        const ctx = await this.initialize();
        return { type: "replaced", systemContext: ctx };
      }

      const updates: string[] = [];
      let changed = false;
      const newSnapshots = new Map(snapshots);

      for (const [, source] of sources) {
        const current = await source.load();
        const prev = snapshots.get(source.key);
        if (prev && !shallowEqual(prev.value, current)) {
          const update = source.renderUpdate(current, prev.value);
          if (update) {
            updates.push(update);
            newSnapshots.set(source.key, { key: source.key, value: current, rendered: update });
            changed = true;
          }
        }
      }

      if (!changed) {
        return { type: "unchanged" };
      }

      return {
        type: "updated",
        update: updates.join("\n\n"),
        snapshot: { key: "" as ContextSourceKey, value: null, rendered: updates.join("\n\n") },
      };
    },
  };
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]);
}
