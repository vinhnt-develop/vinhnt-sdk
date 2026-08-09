/** Known skill modes. Use as reference, not exhaustive. */
export const KNOWN_SKILL_MODES = ["primary", "subagent", "all"] as const;

/** Skill mode — open string for extensibility. */
export type SkillMode = string;

export type SkillPermissionValue = "allow" | "deny" | "ask";

export type SkillPermission = {
  readonly [key: string]: SkillPermissionValue | Record<string, SkillPermissionValue>;
};

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

export type SkillSourceType = "builtin" | "global" | "project" | "compat" | "custom" | "generated";

export interface SkillSource {
  readonly type: SkillSourceType;
  readonly dir: string;
  readonly priority: number;
}

export interface SkillDefinition {
  readonly manifest: SkillManifest;
  readonly source: SkillSource;
  readonly body: string;
  readonly raw: string;
}
