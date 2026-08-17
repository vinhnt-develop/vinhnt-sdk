export type PermissionEffect = "allow" | "deny" | "ask";

export interface PermissionRule {
  readonly action: string;
  readonly resource: string;
  readonly effect: PermissionEffect;
}

export type PermissionRuleset = readonly PermissionRule[];