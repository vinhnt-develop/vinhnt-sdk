/**
 * JSONC (JSON with Comments) parser.
 *
 * Strips single-line (//) and multi-line (/* *​/) comments from JSON strings
 * before parsing. Also handles trailing commas.
 *
 * @example
 * ```ts
 * import { parseJsonc } from "@vinhnt-sdk/config";
 *
 * const config = parseJsonc(`
 *   {
 *     // This is a comment
 *     "model": "gpt-4o",
 *     "temperature": 0.7,  // trailing comma ok
 *   }
 * `);
 * ```
 */

/**
 * Strip comments and trailing commas from a JSONC string.
 * Does not handle all edge cases (e.g., comments inside strings) but
 * covers the vast majority of config file patterns.
 */
function stripJsonc(input: string): string {
  let result = "";
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    // String literal — skip entirely (preserve contents)
    if (ch === '"' || ch === "'") {
      const quote = ch;
      result += ch;
      i++;
      while (i < len && input[i] !== quote) {
        if (input[i] === "\\") {
          result += input[i];
          i++;
        }
        if (i < len) {
          result += input[i];
          i++;
        }
      }
      if (i < len) {
        result += input[i]; // closing quote
        i++;
      }
      continue;
    }

    // Single-line comment
    if (ch === "/" && i + 1 < len && input[i + 1] === "/") {
      while (i < len && input[i] !== "\n") {
        i++;
      }
      continue;
    }

    // Multi-line comment
    if (ch === "/" && i + 1 < len && input[i + 1] === "*") {
      i += 2;
      while (i < len && !(input[i] === "*" && i + 1 < len && input[i + 1] === "/")) {
        i++;
      }
      i += 2; // skip */
      continue;
    }

    result += ch;
    i++;
  }

  // Strip trailing commas before } or ]
  return result.replace(/,\s*([}\]])/g, "$1");
}

/**
 * Parse a JSONC (JSON with Comments) string.
 *
 * Supports:
 * - Single-line comments (`//`)
 * - Multi-line comments (`/* *​/`)
 * - Trailing commas
 *
 * @param input - JSONC string to parse
 * @returns Parsed value
 * @throws SyntaxError if the input is not valid JSON after stripping comments
 */
export function parseJsonc<T = unknown>(input: string): T {
  const stripped = stripJsonc(input);
  return JSON.parse(stripped) as T;
}

/**
 * Parse a JSONC file contents. Returns undefined if the input is empty or whitespace-only.
 */
export function parseJsoncFile<T = unknown>(input: string): T | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  return parseJsonc<T>(trimmed);
}
