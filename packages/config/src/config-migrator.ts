/**
 * Config migration framework — supports migrating configuration files
 * between schema versions (V1 → V2 → ...).
 *
 * Each migration is a function that transforms a raw config object
 * from one version to the next. Migrations run sequentially.
 *
 * @example
 * ```ts
 * import { ConfigMigrator, defineMigration } from "@vinhnt-sdk/config";
 *
 * const migrator = new ConfigMigrator("workspace");
 *
 * migrator.add(defineMigration({
 *   from: 1,
 *   to: 2,
 *   description: "Add provider field, rename apiKey to credentials",
 *   up: (raw) => ({
 *     ...raw,
 *     provider: raw.provider ?? "openai",
 *     credentials: { apiKey: raw.apiKey },
 *     version: 2,
 *   }),
 *   down: (raw) => ({
 *     ...raw,
 *     apiKey: raw.credentials?.apiKey,
 *     version: 1,
 *   }),
 * }));
 *
 * // Migrate a config object
 * const migrated = migrator.migrate({ version: 1, apiKey: "sk-..." }, 2);
 * // { version: 2, provider: "openai", credentials: { apiKey: "sk-..." } }
 * ```
 */

// ── Migration Definition ──

/** A single migration step between two versions. */
export interface ConfigMigration {
  /** Source version (must be positive integer). */
  readonly from: number;
  /** Target version (must be from + 1). */
  readonly to: number;
  /** Human-readable description. */
  readonly description: string;
  /** Transform config from source → target version. */
  up(raw: Record<string, unknown>): Record<string, unknown>;
  /** Transform config from target → source version (rollback). */
  down(raw: Record<string, unknown>): Record<string, unknown>;
}

/**
 * Define a config migration.
 * @param migration - Migration definition
 * @returns Frozen migration object
 */
export function defineMigration(migration: ConfigMigration): Readonly<ConfigMigration> {
  if (migration.to !== migration.from + 1) {
    throw new Error(
      `Migration must be from → from+1, got ${migration.from} → ${migration.to}`,
    );
  }
  return Object.freeze({ ...migration });
}

// ── Migrator ──

/**
 * Config migrator — chains migrations to transform config between versions.
 *
 * Usage:
 * 1. Register migrations with `add()`
 * 2. Call `migrate(raw, targetVersion)` to upgrade
 * 3. Call `rollback(raw, targetVersion)` to downgrade
 */
export class ConfigMigrator {
  private readonly migrations = new Map<number, ConfigMigration>();
  private readonly configType: string;

  constructor(configType: string) {
    this.configType = configType;
  }

  /** Register a migration. Throws if a migration for the source version already exists. */
  add(migration: ConfigMigration): this {
    if (this.migrations.has(migration.from)) {
      throw new Error(
        `[${this.configType}] Migration from v${migration.from} already registered`,
      );
    }
    this.migrations.set(migration.from, migration);
    return this;
  }

  /** Get the latest version supported by registered migrations. */
  getLatestVersion(): number {
    if (this.migrations.size === 0) return 1;
    return Math.max(...Array.from(this.migrations.keys()).map((k) => k + 1));
  }

  /** Get the earliest version supported by registered migrations. */
  getEarliestVersion(): number {
    if (this.migrations.size === 0) return 1;
    return Math.min(...Array.from(this.migrations.keys()));
  }

  /**
   * Migrate a config object to the target version.
   * Applies migrations sequentially from current → target.
   *
   * @param raw - Raw config object (must have a `version` field)
   * @param targetVersion - Target version to migrate to
   * @returns Migrated config with updated version field
   * @throws Error if migration path is incomplete or migration fails
   */
  migrate(
    raw: Record<string, unknown>,
    targetVersion: number,
  ): Record<string, unknown> {
    const currentVersion = this.getVersion(raw);

    if (currentVersion === targetVersion) {
      return { ...raw };
    }

    if (currentVersion > targetVersion) {
      return this.rollback(raw, targetVersion);
    }

    let result = { ...raw };
    let current = currentVersion;

    while (current < targetVersion) {
      const migration = this.migrations.get(current);
      if (!migration) {
        throw new Error(
          `[${this.configType}] No migration from v${current} to v${current + 1}`,
        );
      }
      result = migration.up(result);
      result.version = current + 1;
      current++;
    }

    return result;
  }

  /**
   * Rollback a config object to the target version.
   * Applies down-migrations sequentially from current → target.
   */
  rollback(
    raw: Record<string, unknown>,
    targetVersion: number,
  ): Record<string, unknown> {
    const currentVersion = this.getVersion(raw);

    if (currentVersion === targetVersion) {
      return { ...raw };
    }

    if (currentVersion < targetVersion) {
      return this.migrate(raw, targetVersion);
    }

    let result = { ...raw };
    let current = currentVersion;

    while (current > targetVersion) {
      const migration = this.migrations.get(current - 1);
      if (!migration) {
        throw new Error(
          `[${this.configType}] No migration from v${current} to v${current - 1}`,
        );
      }
      result = migration.down(result);
      result.version = current - 1;
      current--;
    }

    return result;
  }

  /** Get version from a raw config object. Defaults to 1 if missing. */
  private getVersion(raw: Record<string, unknown>): number {
    const v = raw.version;
    if (typeof v !== "number" || v < 1) {
      return 1;
    }
    return v;
  }

  /** List all registered migrations (sorted by from version). */
  list(): readonly ConfigMigration[] {
    return Array.from(this.migrations.values()).sort((a, b) => a.from - b.from);
  }
}

// ── Built-in workspace migrations ──

/** Workspace config V1 → V2 migration (provider system). */
export const WORKSPACE_V1_TO_V2: ConfigMigration = defineMigration({
  from: 1,
  to: 2,
  description: "Add provider field, restructure credentials",
  up: (raw) => ({
    ...raw,
    provider: raw.provider ?? "openai",
    version: 2,
  }),
  down: (raw) => {
    const { provider: _provider, ...rest } = raw;
    return { ...rest, version: 1 };
  },
});
