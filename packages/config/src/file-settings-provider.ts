/**
 * File-based settings provider — stores per-namespace settings in a local JSON file.
 *
 * Settings are stored in `.vnt/settings.json` with three layers:
 *   schema defaults < composition base < user document
 *
 * Supports optional hot-reload via file watcher.
 *
 * @example
 * ```ts
 * import { FileSettingsProvider } from "@vinhnt-sdk/config";
 *
 * const provider = new FileSettingsProvider({
 *   settingsDir: ".vnt",
 *   watch: true,
 * });
 *
 * // Register a namespace
 * provider.install("llm-deepseek", deepseekSchema, defaultConfig, {
 *   setSource: (config) => { currentConfig = config },
 *   onChange: (config) => { revalidate(config) },
 * });
 *
 * // Update user layer
 * provider.setSection("llm-deepseek", { apiKeyEnv: "NEW_KEY" });
 * ```
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  SettingsNamespace,
  SettingsSection,
  SettingsProvider,
  SettingsSchema,
} from "./settings.js";
import { mergeLayers } from "./settings.js";
import { parseJsoncFile } from "./jsonc-parser.js";

// ── Types ──

export interface FileSettingsProviderOptions {
  /** Directory containing `settings.json`. Default: `.vnt` */
  settingsDir?: string;
  /** Filename within settingsDir. Default: `settings.json` */
  filename?: string;
  /** Enable file watching for hot-reload. Default: false */
  watch?: boolean;
  /** Debounce interval for file watcher in ms. Default: 100 */
  debounceMs?: number;
}

interface SettingsEntry<T = unknown> {
  /** Schema-validated resolved config. */
  resolved: T;
  /** User-document layer (overrides composition base). */
  userLayer: Partial<T> | undefined;
  /** Composition base layer. */
  baseLayer: T;
  /** Schema for validation. */
  schema: SettingsSchema<T>;
  /** Callbacks. */
  callbacks: {
    setSource: (config: T) => void;
    onChange?: (config: T) => void;
  };
}

interface SettingsFile {
  version: 1;
  sections: Record<string, unknown>;
}

// ── File Operations ──

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ── FileSettingsProvider ──

export class FileSettingsProvider implements SettingsProvider {
  private readonly filePath: string;
  private readonly watchEnabled: boolean;
  private readonly debounceMs: number;
  private sections = new Map<string, SettingsEntry<any>>();
  private watcher: fs.FSWatcher | undefined;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options?: FileSettingsProviderOptions) {
    const dir = options?.settingsDir ?? ".vnt";
    const filename = options?.filename ?? "settings.json";
    this.filePath = path.resolve(dir, filename);
    this.watchEnabled = options?.watch ?? false;
    this.debounceMs = options?.debounceMs ?? 100;
  }

  /** Load the settings file from disk. */
  private loadFile(): SettingsFile {
    if (!fs.existsSync(this.filePath)) {
      return { version: 1, sections: {} };
    }

    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = parseJsoncFile<SettingsFile>(raw);
      if (!parsed || typeof parsed !== "object") {
        return { version: 1, sections: {} };
      }
      return { version: 1, sections: parsed.sections ?? {} };
    } catch {
      return { version: 1, sections: {} };
    }
  }

  /** Save the settings file to disk. */
  private saveFile(data: SettingsFile): void {
    const dir = path.dirname(this.filePath);
    ensureDir(dir);

    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(this.filePath, content, "utf8");
  }

  /** Resolve a section from layers: defaults < base < user. */
  private resolveSection<T>(entry: SettingsEntry<T>): T {
    const withBase = mergeLayers(
      entry.baseLayer as Record<string, unknown>,
      (entry.userLayer ?? {}) as Record<string, unknown>,
    );
    return entry.schema.parse(withBase);
  }

  /** Reload all sections from disk (for hot-reload). */
  private reloadFromFile(): void {
    const file = this.loadFile();

    for (const [namespace, entry] of this.sections) {
      const userLayer = file.sections[namespace] as Partial<typeof entry.baseLayer> | undefined;
      if (userLayer !== undefined) {
        entry.userLayer = userLayer;
        entry.resolved = this.resolveSection(entry);
        entry.callbacks.setSource(entry.resolved);
        entry.callbacks.onChange?.(entry.resolved);
      }
    }
  }

  /** Debounced file reload. */
  private scheduleReload(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.reloadFromFile();
      this.debounceTimer = undefined;
    }, this.debounceMs);
  }

  /** Start file watcher for hot-reload. */
  private startWatcher(): void {
    if (!this.watchEnabled || this.watcher) return;

    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) return;

    try {
      this.watcher = fs.watch(dir, (eventType, filename) => {
        if (filename === path.basename(this.filePath)) {
          this.scheduleReload();
        }
      });
    } catch {
      // File watching not supported on this platform
    }
  }

  /** Stop file watcher. */
  private stopWatcher(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  // ── SettingsProvider interface ──

  get<T>(namespace: SettingsNamespace): SettingsSection<T> | undefined {
    const entry = this.sections.get(namespace) as SettingsEntry<T> | undefined;
    if (!entry) return undefined;

    return {
      namespace,
      config: entry.resolved,
      layer: entry.userLayer !== undefined ? "user" : "composition",
    };
  }

  install<T>(
    namespace: SettingsNamespace,
    schema: SettingsSchema<T>,
    base: T,
    callbacks: {
      setSource: (config: T) => void;
      onChange?: (config: T) => void;
    },
  ): () => void {
    // Load user layer from file
    const file = this.loadFile();
    const userLayer = file.sections[namespace] as Partial<T> | undefined;

    const entry: SettingsEntry<T> = {
      resolved: undefined as unknown as T,
      userLayer,
      baseLayer: base,
      schema,
      callbacks,
    };

    // Resolve initial config
    entry.resolved = this.resolveSection(entry);
    this.sections.set(namespace, entry);

    // Notify with resolved config
    callbacks.setSource(entry.resolved);

    // Start watcher on first install
    this.startWatcher();

    // Return disposer
    return () => {
      this.sections.delete(namespace);
      if (this.sections.size === 0) {
        this.stopWatcher();
      }
    };
  }

  setSection<T>(namespace: SettingsNamespace, config: T): void {
    const entry = this.sections.get(namespace) as SettingsEntry<T> | undefined;
    if (!entry) {
      throw new Error(`Settings namespace "${namespace}" is not installed`);
    }

    // Update user layer
    entry.userLayer = config as Partial<T>;
    entry.resolved = this.resolveSection(entry);

    // Persist to file
    const file = this.loadFile();
    file.sections[namespace] = config;
    this.saveFile(file);

    // Notify
    entry.callbacks.setSource(entry.resolved);
    entry.callbacks.onChange?.(entry.resolved);
  }

  list(): readonly SettingsNamespace[] {
    return Array.from(this.sections.keys()) as SettingsNamespace[];
  }

  /** Invalidate file cache and reload from disk. */
  invalidateCache(): void {
    this.reloadFromFile();
  }

  /** Dispose watcher and cleanup. */
  dispose(): void {
    this.stopWatcher();
  }
}
