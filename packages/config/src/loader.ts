import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import type { VntConfig } from "./schema.js";
import { validateConfig, DEFAULT_LEARNING } from "./schema.js";
import { resolveConfig } from "./resolver.js";
import { parseJsonc } from "./jsonc.js";
import { parseYaml, isYamlFile } from "./yaml.js";
import { mergeConfig } from "./merge.js";
import { EnvConfigSource } from "./providers/env-provider.js";

function loadConfigFile(filePath: string): { data: Record<string, unknown>; dir: string; filePath: string } | null {
  try {
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, "utf-8");
    const data = isYamlFile(filePath) ? parseYaml(raw) : parseJsonc<Record<string, unknown>>(raw);
    return { data, dir: dirname(filePath), filePath };
  } catch {
    return null;
  }
}

const CONFIG_FILE_NAME = "config.json";

const YAML_EXTENSIONS = [".yaml", ".yml"];

function resolvePath(...segments: string[]): string {
  const first = join(...segments);
  if (existsSync(first)) return first;
  const ext = segments.at(-1)?.split(".").pop();
  if (ext === "json") {
    const base = first.slice(0, -5);
    for (const yamlExt of YAML_EXTENSIONS) {
      const yamlPath = base + yamlExt;
      if (existsSync(yamlPath)) return yamlPath;
    }
  }
  return first;
}

export type ConfigSource = "global" | "project" | "cwd" | "dotVnt";

export interface LoadedConfig {
  config: VntConfig;
  sources: ConfigSource[];
}

export function getConfigFilePaths(projectDir?: string): string[] {
  const root = projectDir ?? process.cwd();
  return [
    resolvePath(homedir(), ".config", "vnt", CONFIG_FILE_NAME),
    resolvePath(root, "vnt.json"),
    resolvePath(root, ".vnt", CONFIG_FILE_NAME),
    resolvePath(root, CONFIG_FILE_NAME),
  ];
}

export function loadConfig(options?: {
  projectDir?: string;
}): LoadedConfig {
  const sources: ConfigSource[] = [];

  // 1. Global: ~/.config/vnt/config.json (or .yaml/.yml)
  const globalFile = resolvePath(homedir(), ".config", "vnt", CONFIG_FILE_NAME);

  // 2. Project root: <project-dir>/vnt.json (or .yaml/.yml) or .vnt/config.json
  const projectDir = options?.projectDir ?? process.cwd();
  const projectFile = resolvePath(projectDir, "vnt.json");
  const dotVntFile = resolvePath(projectDir, ".vnt", CONFIG_FILE_NAME);

  let config: VntConfig = {
    defaultProvider: "",
    defaultModel: "",
    providers: {},
    learning: DEFAULT_LEARNING,
  };

  let configDir: string | undefined;

  if (globalFile) {
    const loaded = loadConfigFile(globalFile);
    if (loaded) {
      config = mergeConfig(config, validateConfig(loaded.data, loaded.filePath));
      configDir = loaded.dir;
      sources.push("global");
    }
  }

  // Project config: .vnt/config.json has priority over vnt.json
  const projectRaw = loadConfigFile(projectFile);
  const dotVntRaw = loadConfigFile(dotVntFile);

  if (projectRaw) {
    config = mergeConfig(config, validateConfig(projectRaw.data, projectRaw.filePath));
    configDir = projectRaw.dir;
    sources.push("project");
  }

  if (dotVntRaw) {
    config = mergeConfig(config, validateConfig(dotVntRaw.data, dotVntRaw.filePath));
    configDir = dotVntRaw.dir;
    sources.push("dotVnt");
  }

  if (!projectRaw && !dotVntRaw) {
    const cwdData = loadConfigFile(resolvePath(process.cwd(), CONFIG_FILE_NAME));
    if (cwdData) {
      config = mergeConfig(config, validateConfig(cwdData.data, cwdData.filePath));
      configDir = cwdData.dir;
      sources.push("cwd");
    }
  }

  // Environment var overrides (above file configs, below CLI flags)
  const envSource = new EnvConfigSource();
  const envPartial = envSource.load();
  if (envPartial) {
    config = mergeConfig(config, envPartial);
  }

  config = resolveConfig(config, configDir ? { configDir } : undefined);

  return { config, sources };
}
