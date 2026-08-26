/**
 * Settings namespace system — per-package configuration with hot-reload.
 *
 * Each package registers a settings namespace (e.g., `"llm-deepseek"`,
 * `"sandbox-policy"`) with a schema. The system layers:
 *   schema defaults < composition base < user document
 *
 * Settings are re-read on file changes (hot-reload) without restart.
 *
 * @example
 * ```ts
 * import { installSettingsSection, type SettingsProvider } from "@vinhnt-sdk/config";
 *
 * // In a plugin:
 * const current = installSettingsSection(ctx, "llm-deepseek", Config, config, {
 *   setSource: (source) => { current = source },
 *   onChange: revalidate,
 * });
 * ```
 */

// ── Settings Namespace ──

declare const __settingsNamespaceBrand: unique symbol;

/** Branded settings namespace identifier (kebab-case). */
export type SettingsNamespace = string & { readonly [__settingsNamespaceBrand]: true };

/**
 * Create a settings namespace identifier.
 * @param ns - Kebab-case namespace (e.g., `"llm-deepseek"`)
 */
export function settingsNamespace(ns: string): SettingsNamespace {
  return ns as SettingsNamespace;
}

// ── Settings Provider interface ──

/** A settings section — the resolved configuration for a namespace. */
export interface SettingsSection<T = unknown> {
  /** The namespace this section belongs to. */
  readonly namespace: SettingsNamespace;
  /** The resolved configuration values. */
  readonly config: T;
  /** The layer this config was resolved from. */
  readonly layer: "default" | "composition" | "user" | (string & {});
}

/**
 * Abstract settings provider — manages per-namespace configuration.
 *
 * Settings flow: schema defaults < composition base (cordis.yml) < user document.
 *
 * @example
 * ```ts
 * const provider: SettingsProvider = createFileSettingsProvider({
 *   homeDir: process.env.HOME ?? "",
 *   watch: true,
 * });
 *
 * // Register a section
 * provider.install("llm-deepseek", deepseekConfig, {
 *   setSource: (source) => { currentConfig = source },
 *   onChange: revalidate,
 * });
 * ```
 */
export interface SettingsProvider {
  /**
   * Get the current resolved config for a namespace.
   * Returns undefined if the namespace is not registered.
   */
  get<T>(namespace: SettingsNamespace): SettingsSection<T> | undefined;

  /**
   * Register a settings section with a schema and callbacks.
   * The section is merged from layers and watched for changes.
   *
   * @returns A disposer that unregisters the section.
   */
  install<T>(
    namespace: SettingsNamespace,
    schema: SettingsSchema<T>,
    base: T,
    callbacks: {
      setSource: (config: T) => void;
      onChange?: (config: T) => void;
    },
  ): () => void;

  /**
   * Update the user-document layer for a namespace.
   * Triggers re-validation and onChange callbacks.
   */
  setSection<T>(namespace: SettingsNamespace, config: T): void;

  /**
   * List all registered namespaces.
   */
  list(): readonly SettingsNamespace[];
}

/** Schema for validating and defaulting settings. */
export interface SettingsSchema<T> {
  /** Parse and validate raw config, applying defaults. */
  parse(raw: unknown): T;
}

// ── Helpers ──

/**
 * Merge configuration layers. Higher layers override lower layers.
 * Only defined properties override — undefined means "keep lower layer".
 */
export function mergeLayers<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T>,
): T {
  const result = { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const val = override[key];
    if (val !== undefined) {
      (result as Record<string, unknown>)[key as string] = val;
    }
  }
  return result;
}
