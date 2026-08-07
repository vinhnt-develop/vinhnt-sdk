import { z } from "zod";

/**
 * ── Schema versioning primitives ──────────────────────────────────────────
 * Envelope-carried integer version + pure upcast chain + open (forward-tolerant)
 * records. Follows additive-only field rules by default:
 *   - Only ADD optional fields with defaults.
 *   - Records stay "open" (`.catchall(z.unknown())`), never `.strict()`.
 *   - Enums append values at the end, keeping an UNSPECIFIED/default member.
 *   - A semantic change is a NEW type, not a version bump.
 *   - Deprecate fields via `deprecated` notes; enforce removal with a sunset check.
 */

/** Envelope shape carrying an explicit data schema version. */
export const SchemaVersionedBaseSchema = z.object({
  /** Stable kind that never changes meaning once published. */
  type: z.string().min(1),
  /** Schema version of `data` — monotonic integer, increments on breaking change. */
  version: z.number().int().positive(),
  /** Payload — kept open so a newer version with added optional fields still parses. */
  data: z.unknown(),
});
export type SchemaVersionedBase = z.infer<typeof SchemaVersionedBaseSchema>;

/**
 * A single, pure, deterministic version transition N → N+1.
 * Each migration owns EXACTLY ONE version step so the upcast chain composes.
 */
export interface SchemaMigration<From = unknown, To = unknown> {
  from: number;
  to: number;
  /** Upcaster direction (stored v_old → current v_to). Must be pure & deterministic. */
  up: (old: From) => To;
  /** Only required if the old wire format must be re-written (rollback). */
  down?: (cur: To) => From;
  /** What changed and why — surfaced in errors / docs / CI. */
  note: string;
}

export interface DeprecationNote {
  since: string;
  removalDate: string;
  useInstead?: string;
}

/** Marker attached to a schema field that is deprecated but not yet removed. */
export const DEPRECATION_SYMBOL = Symbol.for("vnt.schema.deprecated");

/**
 * Wrap a Zod schema so its identifier/metadata registers a deprecation note.
 * Consumers can read it back via the DEPRECATION_SYMBOL.
 */
export function deprecated<T extends z.ZodTypeAny>(
  schema: T,
  note: DeprecationNote,
): T {
  (schema as z.ZodTypeAny & { [DEPRECATION_SYMBOL]?: DeprecationNote })[DEPRECATION_SYMBOL] = note;
  return schema;
}

export function isExpiredDeprecation(schema: z.ZodTypeAny, today = new Date()): boolean {
  const note = (schema as z.ZodTypeAny & { [DEPRECATION_SYMBOL]?: DeprecationNote })[DEPRECATION_SYMBOL];
  if (!note) return false;
  return today.toISOString().slice(0, 10) >= note.removalDate;
}

export interface VersionedSchemaOptions {
  /** Stable kind, e.g. "run-event", "session". */
  kind: string;
  /** Per-version Zod schemas keyed by version number. */
  versions: Record<number, z.ZodTypeAny>;
  /** Upcast chain: each entry transitions one version step (1→2, 2→3, ...). */
  migrations: SchemaMigration[];
  /** The current (highest) version to upcast toward. */
  current: number;
}

export interface VersionedSchema<T = unknown> {
  readonly kind: string;
  readonly current: number;
  readonly versions: Record<number, z.ZodTypeAny>;
  readonly migrations: SchemaMigration[];
  /**
   * Read a payload of ANY version (wrapped or raw) and upcast it to the
   * current version, validated against the current schema.
   */
  parse(data: unknown): T;
  /** Upcast a raw payload following only the migration chain (no envelope). */
  upcastFrom(version: number, payload: unknown): unknown;
}

export function versionedSchema<T = unknown>(opts: VersionedSchemaOptions): VersionedSchema<T> {
  const byStep = new Map<number, SchemaMigration>();
  for (const m of opts.migrations) {
    if (m.to !== m.from + 1) {
      throw new Error(
        `[${opts.kind}] migration must be a single step (from=${m.from}, to=${m.to}); got +${m.to - m.from}`,
      );
    }
    if (byStep.has(m.from)) {
      throw new Error(`[${opts.kind}] duplicate migration from version ${m.from}`);
    }
    byStep.set(m.from, m);
  }

  function upcastFrom(version: number, payload: unknown): unknown {
    if (version < 1) throw new Error(`[${opts.kind}] invalid version ${version}`);
    if (version > opts.current) {
      throw new Error(`[${opts.kind}] unknown version ${version} (current is ${opts.current})`);
    }
    let cur = payload;
    for (let v = version; v < opts.current; v++) {
      const m = byStep.get(v);
      if (!m) throw new Error(`[${opts.kind}] missing migration ${v} -> ${v + 1}`);
      cur = m.up(cur);
    }
    return cur;
  }

  return {
    kind: opts.kind,
    current: opts.current,
    versions: opts.versions,
    migrations: opts.migrations,
    parse(data: unknown): T {
      const isEnvelope =
        typeof data === "object" &&
        data !== null &&
        ("version" in data) &&
        ("data" in data) &&
        ("type" in data);
      const { version, data: payload } = isEnvelope
        ? (SchemaVersionedBaseSchema.parse(data) as SchemaVersionedBase)
        : { version: opts.current, data };
      const upcasted = upcastFrom(version, payload);
      const currentSchema = opts.versions[opts.current];
      if (!currentSchema) throw new Error(`[${opts.kind}] missing current schema v${opts.current}`);
      return currentSchema.parse(upcasted) as T;
    },
    upcastFrom,
  };
}

/**
 * Durable event envelope — the wire/storage identity of a persisted event.
 * `aggregateVersion` is state CONCURRENCY (ExpectedVersion), distinct from
 * `version` which identifies the DATA schema. Persisted events are immutable;
 * migrating shapes happens via `upcastToCurrent`, never in-place.
 */
export const DurableEventEnvelopeSchema = z.object({
  id: z.string().min(1),
  aggregate: z.string().min(1),
  /** Per-aggregate sequence, used for optimistic concurrency. Not a schema version. */
  aggregateVersion: z.number().int().nonnegative(),
  /** Stable kind, e.g. "run.completed". */
  type: z.string().min(1),
  /** Schema version of `data`. */
  version: z.number().int().positive(),
  occurredAt: z.string().datetime(),
  traceId: z.string().optional(),
  /** Open payload — tolerant of added optional fields. */
  data: z.unknown(),
});
export type DurableEventEnvelope = z.infer<typeof DurableEventEnvelopeSchema>;

export interface DurableEventDefinition<TData = unknown> {
  type: string;
  /** Current data schema version emitted by this producer. */
  version: number;
  /** Aggregate name this event appends to. */
  aggregate: string;
  /** Zod schema for the CURRENT payload shape. */
  dataSchema: z.ZodType<TData>;
  /** Upcast chain for historical versions of this event type. */
  migrations: SchemaMigration[];
}

/**
 * Upcast any historical durable event payload for `def` to the current shape.
 * Compatible with the immutable append-only log: old events are never rewritten.
 */
export function upcastEventToCurrent<TData = unknown>(def: DurableEventDefinition<TData>, payload: unknown): TData {
  let cur: unknown = payload;
  for (let v = 1; v < def.version; v++) {
    const m = def.migrations.find((mm) => mm.from === v && mm.to === v + 1);
    if (!m) throw new Error(`[${def.type}] missing migration ${v} -> ${v + 1}`);
    cur = m.up(cur);
  }
  return def.dataSchema.parse(cur) as TData;
}