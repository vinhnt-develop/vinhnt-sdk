import type { ContextSourceValue, ContextSourceKey } from "../types.js";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export interface InstructionsInfo {
  global: string;
  project: string;
  effective: string;
}

export function createInstructionsSource(cwd?: string | (() => string)): ContextSourceValue<InstructionsInfo> {
  return {
    key: "core.instructions" as ContextSourceKey,
    priority: 10,
    async load() {
      const base = typeof cwd === "function" ? cwd() : (cwd ?? process.cwd());
      const globalPath = resolve(process.env.HOME ?? process.env.USERPROFILE ?? "/root", ".opencode", "AGENTS.md");
      const projectPath = resolve(base, "AGENTS.md");

      const [global, project] = await Promise.all([
        readIfExists(globalPath),
        readIfExists(projectPath),
      ]);

      const parts: string[] = [];
      if (global) parts.push(`## Global Instructions\n${global}`);
      if (project) parts.push(`## Project Instructions\n${project}`);
      const effective = parts.join("\n\n");

      return { global, project, effective };
    },
    renderBaseline(value) {
      if (!value.effective) return "";
      return value.effective;
    },
    renderUpdate(value, previous) {
      if (value.effective === previous.effective) return null;
      return `[Context update — instructions changed]\n${value.effective || "No active instructions."}`;
    },
    renderRemoval() {
      return "";
    },
  };
}

async function readIfExists(filePath: string): Promise<string> {
  try {
    if (existsSync(filePath)) {
      return await readFile(filePath, "utf-8");
    }
  } catch {
    // ignore
  }
  return "";
}
