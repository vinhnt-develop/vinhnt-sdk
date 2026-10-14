/** Default ratio used by the approximate token heuristics (4 characters/token). */
const DEFAULT_CHARS_PER_TOKEN = 4;

/**
 * Approximate token count from a character count (default 4 chars/token).
 * Canonical heuristic for contexts without a real tokenizer — models that
 * expose `countTokens` should prefer that.
 */
export function approximateTokensFromCharCount(
  charCount: number,
  charsPerToken: number = DEFAULT_CHARS_PER_TOKEN,
): number {
  return Math.ceil(charCount / charsPerToken);
}

/**
 * Approximate token count from text length (default 4 chars/token).
 * Canonical heuristic shared by every estimation call site (P5.9: single
 * source replacing the former inline copies).
 */
export function approximateTokens(
  text: string,
  charsPerToken: number = DEFAULT_CHARS_PER_TOKEN,
): number {
  return approximateTokensFromCharCount(text.length, charsPerToken);
}
