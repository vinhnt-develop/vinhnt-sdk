import type { RunId, SessionId } from "@vinhnt-sdk/schema";
import { VntError } from "@vinhnt-sdk/schema";

export type PermissionEffect = "allow" | "deny" | "ask";

export interface PermissionRule {
  readonly action: string;
  readonly resource: string;
  readonly effect: PermissionEffect;
}

export type PermissionRuleset = readonly PermissionRule[];

export interface PermissionRequest {
  readonly id: string;
  readonly runId: RunId;
  readonly sessionId: SessionId;
  readonly action: string;
  readonly resource: string;
  readonly description: string;
  readonly createdAt: number;
  readonly savePatterns?: readonly string[];
}

export type PermissionReply = "once" | "always" | "reject";

export class PermissionDeniedError extends VntError {
  readonly rules: PermissionRuleset;
  constructor(rules: PermissionRuleset) {
    super(`Permission denied by configured rules`);
    this.name = "PermissionDeniedError";
    this.rules = rules;
  }
}

export class PermissionRejectedError extends VntError {
  readonly feedback: string | undefined;
  constructor(feedback?: string) {
    super(feedback ?? "Permission rejected by user");
    this.name = "PermissionRejectedError";
    this.feedback = feedback;
  }
}
