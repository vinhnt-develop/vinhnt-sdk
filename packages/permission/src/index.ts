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
export type { PermissionStore, ApprovalStore, AwaitReplyOptions } from "./saved.js";
export { KNOWN_PERMISSION_MODES } from "./permission.js";
export type {
  PermissionEffect,
  PermissionMode,
  KnownPermissionMode,
  PermissionRule,
  PermissionRuleset,
} from "./permission.js";
export { applyPermissionMode } from "./mode.js";
export type {
  ModeEffect,
  ModeEffectSource,
  PermissionModeInput,
  PermissionModeDecision,
} from "./mode.js";
export { createRiskPermissionClassifier, createCallbackPermissionClassifier } from "./classifier.js";
export type {
  PermissionClassification,
  PermissionClassifier,
  PermissionClassifierInput,
} from "./classifier.js";

// Permission contract types come from the schema package (single source of truth).
export type { PermissionRequest, PermissionReply, SavedApproval } from "@vinhnt-sdk/schema";