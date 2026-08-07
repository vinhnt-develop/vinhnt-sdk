import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/** Source directory for agent/skill discovery (mirrors SkillSource from contracts) */
export interface SourceDir {
  readonly type: "builtin" | "global" | "project" | "compat" | "custom" | "generated";
  readonly dir: string;
  readonly priority: number;
}

export interface ProjectLayout {
  /** Project root directory */
  root: string;
  /** All agent source directories (sorted by priority) */
  agentDirs: SourceDir[];
  /** All skill source directories (sorted by priority) */
  skillDirs: SourceDir[];
  /** Detected compat directories present */
  detected: string[];
}

/**
 * Scan for VNT agent/skill discovery directories.
 *
 * Priority order (highest to lowest for later override):
 *   1. Built-in (cannot override)
 *   2. ~/.config/vnt/agents/ and ~/.config/vnt/skills/
 *   3. .vnt/agents/ and .vnt/skills/
 *   4. .agents/agents/ and .agents/skills/
 *   5. .claude/agents/ and .claude/skills/
 *   6. .cursor/ (if applicable)
 *   7. Custom dirs from config
 */
export function detectProjectLayout(projectDir?: string): ProjectLayout {
  const root = projectDir ?? process.cwd();
  const agentDirs: SourceDir[] = [];
  const skillDirs: SourceDir[] = [];
  const detected: string[] = [];

  // 1. Built-in (priority 0) — always present
  agentDirs.push({ type: "builtin", dir: "", priority: 0 });

  // 2. Global user config (priority 1)
  const globalVntDir = join(homedir(), ".config", "vnt");
  const globalAgentDir = join(globalVntDir, "agents");
  const globalSkillDir = join(globalVntDir, "skills");

  if (existsSync(globalAgentDir)) {
    agentDirs.push({ type: "global", dir: globalAgentDir, priority: 1 });
    detected.push("~/.config/vnt/agents/");
  }
  if (existsSync(globalSkillDir)) {
    skillDirs.push({ type: "global", dir: globalSkillDir, priority: 1 });
    detected.push("~/.config/vnt/skills/");
  }

  // 3. Project .vnt/ (priority 2)
  const dotVntDir = join(root, ".vnt");
  const vntAgentDir = join(dotVntDir, "agents");
  const vntSkillDir = join(dotVntDir, "skills");

  if (existsSync(vntAgentDir)) {
    agentDirs.push({ type: "project", dir: vntAgentDir, priority: 2 });
    detected.push(".vnt/agents/");
  }
  if (existsSync(vntSkillDir)) {
    skillDirs.push({ type: "project", dir: vntSkillDir, priority: 2 });
    detected.push(".vnt/skills/");
  }

  // 4. .agents/ (OpenCode compat) — priority 3
  const dotAgentsDir = join(root, ".agents");
  const agentsAgentDir = join(dotAgentsDir, "agents");
  const agentsSkillDir = join(dotAgentsDir, "skills");

  if (existsSync(agentsAgentDir)) {
    agentDirs.push({ type: "compat", dir: agentsAgentDir, priority: 3 });
    detected.push(".agents/agents/");
  }
  if (existsSync(agentsSkillDir)) {
    skillDirs.push({ type: "compat", dir: agentsSkillDir, priority: 3 });
    detected.push(".agents/skills/");
  }

  // 5. .claude/ (Claude Code compat) — priority 4
  const dotClaudeDir = join(root, ".claude");
  const claudeAgentDir = join(dotClaudeDir, "agents");
  const claudeSkillDir = join(dotClaudeDir, "skills");

  if (existsSync(claudeAgentDir)) {
    agentDirs.push({ type: "compat", dir: claudeAgentDir, priority: 4 });
    detected.push(".claude/agents/");
  }
  if (existsSync(claudeSkillDir)) {
    skillDirs.push({ type: "compat", dir: claudeSkillDir, priority: 4 });
    detected.push(".claude/skills/");
  }

  // 6. .cursor/ (Cursor compat) — priority 5
  const dotCursorDir = join(root, ".cursor");
  const cursorAgentDir = join(dotCursorDir, "agents");
  const cursorSkillDir = join(dotCursorDir, "skills");

  if (existsSync(cursorAgentDir)) {
    agentDirs.push({ type: "compat", dir: cursorAgentDir, priority: 5 });
    detected.push(".cursor/agents/");
  }
  if (existsSync(cursorSkillDir)) {
    skillDirs.push({ type: "compat", dir: cursorSkillDir, priority: 5 });
    detected.push(".cursor/skills/");
  }

  return { root, agentDirs, skillDirs, detected };
}

/**
 * Scan only for compat directories (IGNORING built-in and .vnt/).
 * Used for backward compatibility with OpenCode/Claude/Cursor.
 */
export function detectCompatDirs(projectDir?: string): string[] {
  const root = projectDir ?? process.cwd();
  const found: string[] = [];

  const checks = [
    join(root, ".agents"),
    join(root, ".agents", "agents"),
    join(root, ".agents", "skills"),
    join(root, ".claude"),
    join(root, ".claude", "agents"),
    join(root, ".claude", "skills"),
    join(root, ".cursor"),
    join(root, ".cursor", "agents"),
    join(root, ".cursor", "skills"),
  ];

  for (const dir of checks) {
    if (existsSync(dir)) {
      found.push(dir);
    }
  }

  return found;
}

/**
 * Check if a project root has VNT agent infrastructure.
 */
export function hasVntInfrastructure(projectDir?: string): boolean {
  const root = projectDir ?? process.cwd();
  return existsSync(join(root, ".vnt", "agents")) ||
         existsSync(join(root, ".vnt", "skills")) ||
         existsSync(join(root, ".vnt", "config.json"));
}
