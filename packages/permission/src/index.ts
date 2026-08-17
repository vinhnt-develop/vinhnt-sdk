/**
 * @module @vinhnt-sdk/permission
 * Permission kernel primitive: rule model, matching/checking, and approval stores.
 */

export { matchPermission, buildPermissionRules } from "./evaluator.js";
export {
  normalizePermissions,
  mergeRulesets,
  resolveEffectivePermissions,
  evaluatePermission,
  checkRiskAllowed,
} from "./checker.js";
export type { PermissionResult } from "./checker.js";
export { InMemoryApprovalStore } from "./saved.js";
export type { PermissionStore, ApprovalStore } from "./saved.js";
export type { PermissionEffect, PermissionRule, PermissionRuleset } from "./permission.js";

// Permission contract types come from the schema package (single source of truth).
export type { PermissionRequest, PermissionReply, SavedApproval } from "@vinhnt-sdk/schema";