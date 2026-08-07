/**
 * ── Event Schema Migration Registry ────────────────────────────────────────
 * Handles forward migration of event data when reading events that were
 * written with an older schema version. Each migration is a function that
 * transforms data from version N to version N+1.
 *
 * Usage:
 *   EventMigrationRegistry.register("run.completed", 1, (data) => ({
 *     ...data,
 *     newField: data.oldField ?? "default",
 *   }));
 *
 *   // When reading:
 *   const migrated = EventMigrationRegistry.migrate("run.completed", 1, data);
 */

export type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

interface MigrationEntry {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly transform: MigrationFn;
}

export class EventMigrationRegistry {
  private static migrations = new Map<string, MigrationEntry[]>();

  /**
   * Register a migration function for an event type.
   * Migrations are chained: to migrate from v1 to v3, register v1→v2 and v2→v3.
   */
  static register(eventType: string, fromVersion: number, transform: MigrationFn): void {
    const list = this.migrations.get(eventType) ?? [];
    list.push({ fromVersion, toVersion: fromVersion + 1, transform });
    // Sort by fromVersion for deterministic chaining
    list.sort((a, b) => a.fromVersion - b.fromVersion);
    this.migrations.set(eventType, list);
  }

  /**
   * Migrate event data from `fromVersion` to `toVersion`.
   * Applies migrations sequentially. Returns the original data if no migrations needed.
   */
  static migrate(
    eventType: string,
    fromVersion: number,
    data: Record<string, unknown>,
    toVersion?: number,
  ): Record<string, unknown> {
    const migrations = this.migrations.get(eventType);
    if (!migrations || migrations.length === 0) return data;

    const target = toVersion ?? this.getLatestVersion(eventType);
    if (fromVersion >= target) return data;

    let current = { ...data };
    for (const migration of migrations) {
      if (migration.fromVersion >= fromVersion && migration.toVersion <= target) {
        current = migration.transform(current);
      }
    }
    return current;
  }

  /**
   * Get the latest version for an event type by finding the highest toVersion.
   */
  static getLatestVersion(eventType: string): number {
    const migrations = this.migrations.get(eventType);
    if (!migrations || migrations.length === 0) return 0;
    return Math.max(...migrations.map((m) => m.toVersion));
  }

  /**
   * Check if migrations exist for an event type.
   */
  static hasMigrations(eventType: string): boolean {
    const migrations = this.migrations.get(eventType);
    return !!migrations && migrations.length > 0;
  }

  /**
   * Clear all registered migrations (for testing).
   */
  static clear(): void {
    this.migrations.clear();
  }
}
