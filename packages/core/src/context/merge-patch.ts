/**
 * RFC 7386 JSON Merge Patch — pure, zero-dep helpers.
 *
 * Semantics per RFC 7386:
 * - Object merge: keys present in patch merge into target recursively.
 * - null in an object-valued patch = delete that key.
 * - Arrays and scalars replace the target wholesale.
 * - A patch that is not an object replaces the entire target.
 *
 * Used by {@link WorldState} to compute compact context deltas between
 * turns (Codex-style) instead of re-sending full system context.
 *
 * @module context/merge-patch
 */

/**
 * Compute the RFC 7386 merge patch that transforms `previous` into `current`.
 * Returns `undefined` when the two values are deeply equal (no patch needed).
 */
export function createMergePatch(previous: unknown, current: unknown): unknown | undefined {
  if (deepEqual(previous, current)) return undefined;

  // Non-object current (scalar/array/null): replace wholesale.
  if (!isPlainObject(current)) return current;

  const prev = isPlainObject(previous) ? previous : undefined;
  const patch: Record<string, unknown> = {};

  // Removals first: keys in previous but absent from current → null.
  if (prev) {
    for (const key of Object.keys(prev)) {
      if (!(key in current)) patch[key] = null;
    }
  }

  for (const [key, currentValue] of Object.entries(current)) {
    const previousValue = prev?.[key];
    if (!(key in (prev ?? {}))) {
      patch[key] = currentValue;
      continue;
    }
    const valuePatch = createMergePatch(previousValue, currentValue);
    if (valuePatch !== undefined) patch[key] = valuePatch;
  }

  return Object.keys(patch).length > 0 ? patch : undefined;
}

/**
 * Apply an RFC 7386 merge patch to `target`, returning the merged result.
 * Mutates plain-object targets in place when possible; otherwise returns
 * a new value (patch replaces non-object targets wholesale).
 */
export function applyMergePatch(target: unknown, patch: unknown): unknown {
  // Non-object patch replaces the entire target.
  if (!isPlainObject(patch)) return patch;

  // RFC 7386: non-object target is replaced with an empty object before merge.
  const result: Record<string, unknown> = isPlainObject(target) ? { ...target } : {};

  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
    } else if (key in result) {
      result[key] = applyMergePatch(result[key], value);
    } else {
      // New key: apply patch value (may itself be a nested patch object).
      result[key] = isPlainObject(value) ? applyMergePatch(undefined, value) : value;
    }
  }

  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}
