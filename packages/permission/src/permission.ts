export type PermissionEffect = "allow" | "deny" | "ask" | (string & {});

export interface PermissionRule {
  readonly action: string;
  readonly resource: string;
  readonly effect: PermissionEffect;
  readonly paramPattern?: string | undefined;
  readonly metadata?: Record<string, unknown>;
}

export type PermissionRuleset = readonly PermissionRule[];