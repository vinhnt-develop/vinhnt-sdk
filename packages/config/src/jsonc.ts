export function parseJsonc<T = unknown>(text: string): T {
  const cleaned = stripJsoncComments(text);
  return JSON.parse(cleaned) as T;
}

function stripJsoncComments(text: string): string {
  const chars = [...text];
  const out: string[] = [];
  let i = 0;

  while (i < chars.length) {
    const c = chars[i]!;
    const next = chars[i + 1];

    // String literal — copy verbatim until closing quote
    if (c === '"') {
      out.push(c);
      i++;
      while (i < chars.length) {
        const sc = chars[i]!;
        out.push(sc);
        if (sc === '\\') {
          i++;
          if (i < chars.length) {
            out.push(chars[i]!);
            i++;
          }
          continue;
        }
        if (sc === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Single-line comment
    if (c === '/' && next === '/') {
      i += 2;
      while (i < chars.length && chars[i] !== '\n' && chars[i] !== '\r') {
        i++;
      }
      continue;
    }

    // Multi-line comment
    if (c === '/' && next === '*') {
      i += 2;
      while (i < chars.length - 1) {
        if (chars[i] === '*' && chars[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      if (i >= chars.length - 1) i = chars.length;
      continue;
    }

    out.push(c);
    i++;
  }

  return out.join('');
}
