import { useEffect, useRef } from "react";
import { useConfigStore } from "../stores/config-store";
import { fetchServerConfig } from "../lib/api-client";
import { flattenConfig, SERVER_TO_UI_KEY } from "../lib/config-mapper";

interface LoadedConfigPayload {
  config: Record<string, unknown>;
  sources: string[];
}

function setNested(obj: Record<string, unknown>, path: string[], value: unknown): void {
  if (path.length === 0) return;
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const seg: string = path[i]!;
    if (!cur[seg] || typeof cur[seg] !== "object") cur[seg] = {};
    cur = cur[seg] as Record<string, unknown>;
  }
  const last: string = path[path.length - 1]!;
  cur[last] = value;
}

const SETTER_MAP: Record<string, (v: Record<string, unknown>) => void> = {
  general: (v) => useConfigStore.getState().setGeneral(v as never),
  // appearance intentionally excluded: it is user-managed from the Settings dialog
  // (which writes straight to the store and persists via saveServerConfig). Pulling
  // it back here every poll would clobber a just-made selection (e.g. fontFamily).
  behaviour: (v) => useConfigStore.getState().setBehaviour(v as never),
  permission: (v) => useConfigStore.getState().setPermission(v as never),
  notifications: (v) => useConfigStore.getState().setNotifications(v as never),
  profile: (v) => useConfigStore.getState().setProfile(v as never),
  shortcuts: (v) => useConfigStore.getState().setShortcuts(v as never),
  provider: (v) => useConfigStore.getState().setProvider(v as never),
  model: (v) => useConfigStore.getState().setModel(v as never),
  modelRouting: (v) => useConfigStore.getState().setModelRouting(v as never),
  learning: (v) => useConfigStore.getState().setLearning(v as never),
  indexing: (v) => useConfigStore.getState().setIndexing(v as never),
  hooks: (v) => useConfigStore.getState().setHooks(v as never),
  lint: (v) => useConfigStore.getState().setLint(v as never),
  test: (v) => useConfigStore.getState().setTest(v as never),
  autoFix: (v) => useConfigStore.getState().setAutoFix(v as never),
  managed: (v) => useConfigStore.getState().setManaged(v as never),
  audit: (v) => useConfigStore.getState().setAudit(v as never),
  editor: (v) => useConfigStore.getState().setEditor(v as never),
  privacy: (v) => useConfigStore.getState().setPrivacy(v as never),
  sandbox: (v) => useConfigStore.getState().setSandbox(v as never),
};

/**
 * Converts server config keys to UI store shape using SERVER_TO_UI_KEY.
 * Server "theme.mode" (auto) is normalized to UI "appearance.themeMode" (system).
 */
function serverConfigToUi(config: Record<string, unknown>): Record<string, unknown> {
  const flat = flattenConfig(config);
  const ui: Record<string, unknown> = {};
  for (const [serverKey, value] of Object.entries(flat)) {
    const uiKey = SERVER_TO_UI_KEY[serverKey];
    if (!uiKey) continue;
    let finalValue = value;
    if (serverKey === "theme.mode" && value === "auto") finalValue = "system";
    setNested(ui, uiKey.split("."), finalValue);
  }
  return ui;
}

function applyConfig(uiConfig: Record<string, unknown>): void {
  for (const [group, setter] of Object.entries(SETTER_MAP)) {
    const val = uiConfig[group];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      setter(val as Record<string, unknown>);
    }
  }
}

async function fetchConfigApi(): Promise<void> {
  try {
    const data = await fetchServerConfig();
    applyConfig(serverConfigToUi(data.config));
  } catch {
    // Ignore network/auth errors (API server not running / not configured yet)
  }
}

export function useConfigHotReload(_apiBaseUrl?: string): void {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchConfigApi();
    pollRef.current = setInterval(fetchConfigApi, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);
}
