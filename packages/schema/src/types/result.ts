export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T, E = never>(value: T): Result<T, E> {
  return { ok: true, value };
}

export function fail<T = never, E = Error>(error: E): Result<T, E> {
  return { ok: false, error };
}
