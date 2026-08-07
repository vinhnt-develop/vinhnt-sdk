import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

let _yaml: { load(input: string): unknown } | undefined;

function getYaml(): { load(input: string): unknown } {
  if (!_yaml) {
    _yaml = _require("js-yaml") as { load(input: string): unknown };
  }
  return _yaml;
}

export function parseYaml<T = Record<string, unknown>>(raw: string): T {
  const result = getYaml().load(raw);
  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    throw new Error("YAML root must be an object");
  }
  return result as T;
}

export function isYamlFile(filePath: string): boolean {
  return /\.ya?ml$/i.test(filePath);
}
