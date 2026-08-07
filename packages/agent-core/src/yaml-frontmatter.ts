export function parseFrontmatter(raw: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("File must start with YAML frontmatter (---)");
  }
  const yamlBlock = match[1] as string;
  const body = (match[2] ?? "").trim();
  return { frontmatter: parseYaml(yamlBlock), body };
}

interface StackEntry {
  obj: Record<string, unknown>;
  indent: number;
}

function parseYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");
  const stack: StackEntry[] = [];

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.search(/\S/);
    const trimmed = line.trim();
    const colonIdx = trimmed.indexOf(":");

    if (colonIdx < 0) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();

    while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) {
      stack.pop();
    }

    if (value === "") {
      const obj: Record<string, unknown> = {};
      if (stack.length > 0) {
        stack[stack.length - 1]!.obj[key] = obj;
      } else {
        result[key] = obj;
      }
      stack.push({ obj, indent });
    } else if (value.startsWith("- ")) {
      const arr = value.slice(2).trim();
      if (!result[key]) result[key] = [];
      (result[key] as string[]).push(arr);
    } else if (value === "true" || value === "false") {
      const parent = stack.length > 0 ? stack[stack.length - 1]!.obj : result;
      parent[key] = value === "true";
    } else if (/^\d+(\.\d+)?$/.test(value)) {
      const parent = stack.length > 0 ? stack[stack.length - 1]!.obj : result;
      parent[key] = value.includes(".") ? parseFloat(value) : parseInt(value, 10);
    } else {
      const parent = stack.length > 0 ? stack[stack.length - 1]!.obj : result;
      parent[key] = value.replace(/^["']|["']$/g, "");
    }
  }

  return result;
}
