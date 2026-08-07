// Maps UI settings keys (e.g. "general.defaultProvider") to server config keys
// (e.g. "defaultProvider") and vice-versa. Only fields the server actually
// understands are mapped; UI-only keys (appearance.fontSize, profile.*, ...)
// are intentionally excluded.
export const UI_TO_SERVER_KEY: Record<string, string> = {
  "general.defaultProvider": "defaultProvider",
  "general.defaultModel": "defaultModel",
  "general.smallModel": "smallModel",
  "general.autoMode": "auto",
  "general.logLevel": "logLevel",
  "general.shell": "shell",
  "models.defaultModel": "defaultModel",
  "models.smallModel": "smallModel",
  "models.maxTokens": "maxTokens",
  "models.thinkingBudget": "thinkingBudget",
  "appearance.themeMode": "theme.mode",
  "behaviour.selfCorrectOnFailure": "selfCorrectOnFailure",
  "behaviour.maxSelfCorrectAttempts": "maxSelfCorrectAttempts",
  "behaviour.doomLoopThreshold": "doomLoopThreshold",
  "permission.externalDirAccess": "externalDirectoryAccess",
  "permission.allow": "allow",
  "permission.deny": "deny",
  "permission.ask": "ask",
  "permission.permissionRiskDefaults": "permissionRiskDefaults",
  "notifications.enabled": "notifications.enabled",
  "notifications.onFailure": "notifications.onFailure",
  "notifications.onApproval": "notifications.onApproval",
  "notifications.onSuccess": "notifications.onSuccess",
  "learning.enabled": "learning.enabled",
  "learning.backgroundReview": "learning.backgroundReview",
  "learning.memoryWriteApproval": "learning.memoryWriteApproval",
  "learning.skillWriteApproval": "learning.skillWriteApproval",
  "learning.memoryCharLimit": "learning.memoryCharLimit",
  "learning.userCharLimit": "learning.userCharLimit",
  "learning.autoMemoryEnabled": "learning.autoMemoryEnabled",
  "learning.autoMemoryDirectory": "learning.autoMemoryDirectory",
  "learning.autoMemoryMaxFiles": "learning.autoMemoryMaxFiles",
  "indexing.indexingEnabled": "indexing.enabled",
  "indexing.indexingIgnore": "indexing.ignore",
  "indexing.indexingMaxFileSize": "indexing.maxFileSize",
  "indexing.indexingMaxFiles": "indexing.maxFiles",
  "indexing.indexingRefreshInterval": "indexing.refreshInterval",
  "skills-plugins.skillDirs": "skillDirs",
  "skills-plugins.pluginNpm": "plugins",
  "mcp.mcpServers": "mcpServers",
  "mcp.reconnectRetries": "mcpReconnectMaxRetries",
  "connects.webSearchApiKey": "webSearchApiKey",
  "connects.proxyUrl": "network.proxyUrl",
  "modelRouting.advisorModel": "advisorModel",
  "modelRouting.failover": "failover",
  "modelRouting.perFeature": "perFeature",
  "hooks.hooks": "hooks",
  "hooks.lintEnabled": "lint.enabled",
  "hooks.testEnabled": "test.enabled",
  "hooks.autoFixEnabled": "autoFix.enabled",
  "hooks.autoFixMaxAttempts": "autoFix.maxAttempts",
  "managed.managedEnabled": "managed.enabled",
  "managed.allowedModels": "managed.allowedModels",
  "managed.allowedMcpServers": "managed.allowedMcpServers",
  "managed.deniedMcpServers": "managed.deniedMcpServers",
  "managed.minVersion": "managed.minVersion",
  "managed.forceLoginOrgId": "managed.forceLoginOrgId",
  "audit.auditEnabled": "audit.enabled",
  "audit.auditLogPath": "audit.logPath",
  "audit.auditRetentionDays": "audit.retentionDays",
  "audit.auditLogLevel": "audit.logLevel",
  "editor.vimMode": "editor.vimMode",
  "editor.multiline": "editor.multiline",
  "editor.autoSuggest": "editor.autoSuggest",
  "editor.tabCompletion": "editor.tabCompletion",
  "privacy.telemetry": "privacy.telemetry",
  "privacy.autoUpdate": "privacy.autoUpdate",
  "privacy.updateChannel": "privacy.updateChannel",
  "privacy.sessionSharing": "privacy.sessionSharing",
  "sandbox.mode": "sandbox.mode",
  "sandbox.scope": "sandbox.scope",
  "sandbox.timeoutMs": "sandbox.timeoutMs",
  "sandbox.maxConcurrent": "sandbox.maxConcurrent",
  "appearance.fontFamily": "theme.fontFamily",
  "appearance.showThinkingBlocks": "theme.showThinkingBlocks",
  "appearance.compactMode": "theme.compactMode",
  "appearance.diffStyle": "theme.diffStyle",
  "appearance.borderRadius": "theme.borderRadius",
  "notifications.soundEnabled": "notifications.soundEnabled",
  "notifications.soundVolume": "notifications.soundVolume",
  "notifications.desktop": "notifications.desktop",
  "notifications.onError": "notifications.onError",
  "notifications.onPermission": "notifications.onPermission",
  "advanced.experimental": "experimental",
  "advanced.agents": "agents",
  "advanced.skills": "skills",
  "advanced.keybinds": "keybinds",
  "advanced.commands": "commands",
  "advanced.formatters": "formatters",
  "advanced.defaultMode": "defaultMode",
  "advanced.modeProfiles": "modeProfiles",
  "advanced.noStore": "noStore",
};

export const SERVER_TO_UI_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(UI_TO_SERVER_KEY).map(([ui, server]) => [server, ui]),
);

function setNested(obj: Record<string, unknown>, path: string[], value: unknown): void {
  if (path.length === 0) return;
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i]!;
    if (!cur[seg] || typeof cur[seg] !== "object") cur[seg] = {};
    cur = cur[seg] as Record<string, unknown>;
  }
  const last = path[path.length - 1]!;
  cur[last] = value;
}

export function getPath(obj: Record<string, unknown>, path: string): unknown {
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[seg];
    else return undefined;
  }
  return cur;
}

/**
 * Builds a server-side config patch from UI settings values. Only keys present
 * in UI_TO_SERVER_KEY are included, converted to their server key paths.
 * JSON-encoded strings from "code" controls are parsed to real arrays/objects.
 * `extraKeys` (e.g. generated advanced-tab fields) are merged on top.
 */
export function uiValuesToServerPatch(values: Record<string, unknown>, extraKeys?: Record<string, string>): Record<string, unknown> {
  const map = extraKeys ? { ...UI_TO_SERVER_KEY, ...extraKeys } : UI_TO_SERVER_KEY;
  const patch: Record<string, unknown> = {};
  for (const [uiKey, serverKey] of Object.entries(map)) {
    if (!(uiKey in values)) continue;
    let value = values[uiKey];
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim().startsWith("[")) {
      try { value = JSON.parse(value); } catch { /* keep raw */ }
    } else if (typeof value === "string" && value.trim().startsWith("{")) {
      try { value = JSON.parse(value); } catch { /* keep raw */ }
    }
    setNested(patch, serverKey.split("."), value);
  }
  return patch;
}

/** Flattens a (possibly nested) object into dotted keys. */
export function flattenConfig(obj: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  const walk = (o: Record<string, unknown>, prefix: string) => {
    for (const [key, value] of Object.entries(o)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        walk(value as Record<string, unknown>, path);
      } else {
        flat[path] = value;
      }
    }
  };
  walk(obj, "");
  return flat;
}
