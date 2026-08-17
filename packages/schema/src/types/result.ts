/** Discriminated union of success (value) or failure (error). */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/** Wrap a value in a successful {@link Result}. */
export function ok<T, E = never>(value: T): Result<T, E> {
  return { ok: true, value };
}

/** Wrap an error in a failed {@link Result}. */
export function fail<T = never, E = Error>(error: E): Result<T, E> {
  return { ok: false, error };
}
