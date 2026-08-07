import { watch, existsSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { getConfigFilePaths } from "./loader.js";

export type ConfigFileChangeListener = (changedFile: string) => void;

export interface ConfigWatcher {
  onDidChange(listener: ConfigFileChangeListener): () => void;
  readonly watchedFiles: readonly string[];
  close(): void;
}

export interface ConfigWatcherOptions {
  projectDir?: string;
  debounceMs?: number;
}

export function createConfigWatcher(options?: ConfigWatcherOptions): ConfigWatcher {
  const { projectDir, debounceMs = 300 } = options ?? {};
  const listeners = new Set<ConfigFileChangeListener>();
  const watchers: Array<{ close: () => void }> = [];

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let pendingFiles = new Set<string>();

  const candidates = getConfigFilePaths(projectDir).map((p) => resolve(p));

  function flush(): void {
    debounceTimer = undefined;
    const files = [...pendingFiles];
    pendingFiles = new Set();
    for (const listener of listeners) {
      for (const f of files) listener(f);
    }
  }

  function onChange(filename: string | null): void {
    if (!filename) return;
    pendingFiles.add(filename);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flush, debounceMs);
  }

  // Watch each existing candidate file directly, and also watch the parent
  // directories so a config file CREATED after the watcher starts (e.g. the
  // first PUT /v1/config creating .vnt/config.json) is still detected.
  const watchedDirs = new Map<string, Array<{ close: () => void }>>();

  function watchFile(filePath: string): void {
    if (!existsSync(filePath)) return;
    if (watchers.some((w) => (w as { path?: string }).path === filePath)) return;
    try {
      const w = watch(filePath, (eventType, filename) => {
        if (eventType === "change") onChange(filename ?? filePath);
      }) as unknown as { close: () => void; path?: string };
      (w as { path?: string }).path = filePath;
      watchers.push(w);
    } catch {
      // File not watchable (permissions, etc.)
    }
  }

  for (const filePath of candidates) {
    watchFile(filePath);
  }

  // Watch parent directories so newly created files are picked up. Use the
  // candidate's own basename to filter directory events.
  for (const filePath of candidates) {
    const dir = dirname(filePath);
    if (watchedDirs.has(dir)) continue;
    try {
      const w = watch(dir, (eventType, filename) => {
        if (eventType !== "rename") return;
        const changed = filename ? basename(String(filename)) : "";
        // Only react when a candidate config file appears/disappears.
        if (!candidates.some((c) => basename(c) === changed)) return;
        const full = resolve(dir, changed);
        if (existsSync(full)) {
          watchFile(full);
          onChange(full);
        } else {
          onChange(full);
        }
      });
      watchedDirs.set(dir, [w]);
    } catch {
      // Directory not watchable
    }
  }

  return {
    onDidChange(listener: ConfigFileChangeListener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get watchedFiles(): readonly string[] {
      return candidates.filter(existsSync);
    },
    close(): void {
      if (debounceTimer) clearTimeout(debounceTimer);
      for (const w of watchers) w.close();
      watchers.length = 0;
      for (const ws of watchedDirs.values()) for (const w of ws) w.close();
      watchedDirs.clear();
      listeners.clear();
    },
  };
}
