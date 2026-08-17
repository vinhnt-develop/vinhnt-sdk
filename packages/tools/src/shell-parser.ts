/**
 * Shell command parsing utility.
 * Extracts file and args from a command string, handling quotes and escapes.
 */

export function parseCommand(cmd: string): { file: string; args: string[] } {
  const trimmed = cmd.trim();
  if (!trimmed) return { file: "", args: [] };

  const tokens: string[] = [];
  let i = 0;
  let current = "";
  let inSingle = false;
  let inDouble = false;

  while (i < trimmed.length) {
    const ch = trimmed[i] ?? "";
    if (inSingle) {
      if (ch === "'") { inSingle = false; }
      else { current += ch; }
      i++;
    } else if (inDouble) {
      if (ch === '"') { inDouble = false; i++; }
      else if (ch === "\\" && i + 1 < trimmed.length) { current += trimmed[i + 1]; i += 2; }
      else { current += ch; i++; }
    } else if (ch === "'") { inSingle = true; i++; }
    else if (ch === '"') { inDouble = true; i++; }
    else if (ch === "\\" && i + 1 < trimmed.length) { current += trimmed[i + 1]; i += 2; }
    else if (/\s/.test(ch)) {
      if (current) { tokens.push(current); current = ""; }
      i++;
    }
    else { current += ch; i++; }
  }
  if (current) tokens.push(current);

  if (tokens.length === 0) return { file: "", args: [] };
  return { file: tokens[0]!, args: tokens.slice(1) };
}
