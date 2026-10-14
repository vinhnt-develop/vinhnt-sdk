/**
 * WorldState — Codex-style typed context sections with RFC 7386 diff.
 *
 * Instead of re-sending the full system context every turn, WorldState
 * maintains per-section snapshots and computes:
 * - a **render diff** (text fragments the model needs to see for changed
 *   sections only), and
 * - an **RFC 7386 merge patch** (compact JSON delta for persistence —
 *   full snapshot after compaction, patch on later advances).
 *
 * Sections are keyed by stable string IDs (e.g. `"env"`, `"instructions"`,
 * `"git"`). Snapshot values must be JSON-serializable and MUST NOT contain
 * top-level `null` fields (RFC 7386 reserves object nulls for deletion).
 *
 * @module context/world-state
 */

import { createMergePatch, applyMergePatch } from "./merge-patch.js";

/** A named portion of model-visible state with a serializable snapshot. */
export interface WorldStateSection {
  /** Stable ID — persisted in rollouts; must remain stable across versions. */
  readonly id: string;
  /** Current JSON-serializable snapshot (no top-level null fields). */
  readonly snapshot: unknown;
  /**
   * Render the model-visible fragment for this section given the previous
   * snapshot (if any). Return `null`/`undefined` when nothing needs to be
   * sent (unchanged or no visible representation).
   */
  renderDiff(previousSnapshot: unknown | undefined): string | null | undefined;
}

/** Full snapshot of every section — the comparison baseline. */
export interface WorldStateSnapshot {
  readonly sections: Readonly<Record<string, unknown>>;
}

/** Result of advancing the WorldState against a previous baseline. */
export interface WorldStateAdvance {
  /** Text fragments for changed sections only (empty when nothing changed). */
  readonly rendered: string;
  /** RFC 7386 merge patch (undefined when no JSON delta). */
  readonly patch: Readonly<Record<string, unknown>> | undefined;
  /** True when at least one section changed. */
  readonly changed: boolean;
}

export interface WorldState {
  /** Register a section (throws on duplicate ID). */
  addSection(section: WorldStateSection): void;
  /** Replace/update a section by ID (no-op when ID unknown). */
  setSection(section: WorldStateSection): void;
  /** Remove a section by ID. */
  removeSection(id: string): void;
  /** Current full snapshot (every section). */
  snapshot(): WorldStateSnapshot;
  /** Render every section from scratch (no previous state). */
  renderFull(): string;
  /**
   * Advance against a previous baseline: compute render diff + RFC 7386
   * patch for sections that changed. Updates the internal baseline.
   */
  advance(): WorldStateAdvance;
  /**
   * Advance against an explicit external baseline (e.g. restored from a
   * rollout). Does NOT mutate the internal baseline — call {@link reset}
   * separately when the external baseline becomes the new truth.
   */
  advanceFrom(baseline: WorldStateSnapshot): WorldStateAdvance;
  /** Replace the internal baseline (e.g. after compaction). */
  reset(baseline: WorldStateSnapshot): void;
}

export function createWorldState(): WorldState {
  const sections = new Map<string, WorldStateSection>();
  let baseline: WorldStateSnapshot = { sections: {} };

  function currentSnapshot(): WorldStateSnapshot {
    const out: Record<string, unknown> = {};
    for (const [id, section] of sections) {
      // Skip sections whose snapshot is undefined (not yet loaded).
      if (section.snapshot !== undefined) out[id] = section.snapshot;
    }
    return { sections: out };
  }

  function renderAgainst(prevSections: Readonly<Record<string, unknown>>): {
    rendered: string;
    patch: Readonly<Record<string, unknown>> | undefined;
    changed: boolean;
  } {
    const current = currentSnapshot();
    const fragments: string[] = [];

    for (const [id, section] of sections) {
      if (section.snapshot === undefined) continue;
      const previous = prevSections[id];
      const fragment = section.renderDiff(previous);
      if (fragment) fragments.push(fragment);
    }

    const patch = createMergePatch(prevSections, current.sections) as
      | Readonly<Record<string, unknown>>
      | undefined;
    const changed = fragments.length > 0 || patch !== undefined;
    return { rendered: fragments.join("\n\n"), patch, changed };
  }

  return {
    addSection(section) {
      if (sections.has(section.id)) {
        throw new Error(`duplicate world-state section ID: ${section.id}`);
      }
      sections.set(section.id, section);
    },

    setSection(section) {
      sections.set(section.id, section);
    },

    removeSection(id) {
      sections.delete(id);
    },

    snapshot() {
      return currentSnapshot();
    },

    renderFull() {
      const fragments: string[] = [];
      for (const section of sections.values()) {
        if (section.snapshot === undefined) continue;
        const fragment = section.renderDiff(undefined);
        if (fragment) fragments.push(fragment);
      }
      return fragments.join("\n\n");
    },

    advance() {
      const result = renderAgainst(baseline.sections);
      baseline = currentSnapshot();
      return result;
    },

    advanceFrom(externalBaseline) {
      return renderAgainst(externalBaseline.sections);
    },

    reset(newBaseline) {
      baseline = newBaseline;
    },
  };
}

/** Apply an RFC 7386 patch to a WorldState snapshot (standalone helper). */
export function applyWorldStatePatch(
  snapshot: WorldStateSnapshot,
  patch: Readonly<Record<string, unknown>>,
): WorldStateSnapshot {
  return { sections: applyMergePatch(snapshot.sections, patch) as Record<string, unknown> };
}

/** Compute the RFC 7386 patch between two WorldState snapshots. */
export function diffWorldStateSnapshots(
  previous: WorldStateSnapshot,
  current: WorldStateSnapshot,
): Readonly<Record<string, unknown>> | undefined {
  return createMergePatch(previous.sections, current.sections) as Readonly<Record<string, unknown>> | undefined;
}
