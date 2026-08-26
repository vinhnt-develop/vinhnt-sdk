/** Known skill modes. Use as reference, not exhaustive. */
export const KNOWN_SKILL_MODES = ["primary", "subagent", "all"] as const;

/** Skill mode — open string for extensibility. */
export type SkillMode = string;

/** Permission effect for a skill scope. */
export type SkillPermissionValue = "allow" | "deny" | "ask";

/** Permission map for skill-defined tools/files. */
export type SkillPermission = {
  readonly [key: string]: SkillPermissionValue | Record<string, SkillPermissionValue>;
};

/** Skill metadata manifest. */
export interface SkillManifest {
  readonly name: string;
  readonly description: string;
  readonly mode?: SkillMode;
  readonly model?: string;
  readonly temperature?: number;
  readonly maxSteps?: number;
  readonly permission?: SkillPermission;
  readonly tools?: readonly string[];
  readonly color?: string;
  readonly hidden?: boolean;
}

/** Origin of a loaded skill. */
export type SkillSourceType = "builtin" | "global" | "project" | "compat" | "custom" | "generated";

/** Where a skill was loaded from and its priority. */
export interface SkillSource {
  readonly type: SkillSourceType;
  readonly dir: string;
  readonly priority: number;
}

/** A fully loaded skill: manifest, source and body. */
export interface SkillDefinition {
  readonly manifest: SkillManifest;
  readonly source: SkillSource;
  readonly body: string;
  readonly raw: string;
}
