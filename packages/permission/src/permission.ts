export type PermissionEffect = "allow" | "deny" | "ask" | (string & {});

export interface PermissionRule {
  readonly action: string;
  readonly resource: string;
  readonly effect: PermissionEffect;
  readonly metadata?: Record<string, unknown>;
}

export type PermissionRuleset = readonly PermissionRule[];