import type { ContextSourceValue, ContextSourceKey } from "../types.js";
import { arch, platform, release } from "node:os";

export interface WorkspaceInfo {
  cwd: string;
  os: string;
  arch: string;
  nodeVersion: string;
  shell: string;
}

export function createWorkspaceSource(cwd?: string | (() => string)): ContextSourceValue<WorkspaceInfo> {
  return {
    key: "core.workspace" as ContextSourceKey,
    priority: 40,
    async load() {
      const root = typeof cwd === "function" ? cwd() : (cwd ?? process.cwd());
      return {
        cwd: root,
        os: `${platform()} ${release()}`,
        arch: arch(),
        nodeVersion: process.version,
        shell: process.env.SHELL ?? process.env.COMSPEC ?? "unknown",
      };
    },
    renderBaseline(value) {
      return `## Workspace\n- Working directory: \`${value.cwd}\`\n- OS: ${value.os} (${value.arch})\n- Node.js: ${value.nodeVersion}\n- Shell: ${value.shell}`;
    },
    renderUpdate(value, previous) {
      if (value.cwd === previous.cwd) return null;
      return `[Context update — working directory changed]\nThe working directory is now \`${value.cwd}\`.`;
    },
    renderRemoval() {
      return "";
    },
  };
}
