/**
 * Wildcard pattern matching — "*" matches any sequence, "**" matches any sequence
 * (same as * in non-path patterns), "?" matches a single char, "\*" and "\?"
 * match literal * and ? characters.
 * Supports last-match-wins semantics for permission rules.
 */
export function wildcardMatch(pattern: string, value: string): boolean {
  if (pattern === "*" || pattern === "**") return true;

  // Protect escaped wildcards (\* → literal *, \? → literal ?)
  const ESC_STAR = "\x00S";
  const ESC_QMARK = "\x00Q";
  let p = pattern
    .replace(/\\\*/g, ESC_STAR)
    .replace(/\\\?/g, ESC_QMARK);

  // Convert ** to * (same semantics: match any sequence)
  p = p.replace(/\*\*/g, "*");

  // Build regex from *-separated segments
  const regexStr = p
    .split("*")
    .map(s => s
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\?/g, "."))
    .join(".*");

  // Restore literal wildcards
  const final = regexStr
    .replace(/\x00S/g, "\\*")
    .replace(/\x00Q/g, "\\?");

  return new RegExp(`^${final}$`).test(value);
}
