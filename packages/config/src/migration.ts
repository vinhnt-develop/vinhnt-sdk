export type ConfigMigration = (config: Record<string, unknown>) => Record<string, unknown>;

export interface MigrationEntry {
  version: number;
  description: string;
  migrate: ConfigMigration;
}

export class MigrationRegistry {
  private migrations: MigrationEntry[] = [];

  register(entry: MigrationEntry): void {
    this.migrations.push(entry);
    this.migrations.sort((a, b) => a.version - b.version);
  }

  get latestVersion(): number {
    return this.migrations.length > 0 ? this.migrations[this.migrations.length - 1]!.version : 0;
  }

  migrate(config: Record<string, unknown>): Record<string, unknown> {
    const currentVersion = (config.version as number) ?? 0;
    let result = { ...config };

    for (const entry of this.migrations) {
      if (entry.version > currentVersion) {
        try {
          result = entry.migrate(result);
          result.version = entry.version;
        } catch (err) {
          console.warn(`[config] Migration v${entry.version} ("${entry.description}") failed:`, err);
          break;
        }
      }
    }

    return result;
  }
}

export function createDefaultMigrationRegistry(): MigrationRegistry {
  const registry = new MigrationRegistry();

  registry.register({
    version: 1,
    description: "Add version field, move deprecated keys",
    migrate: (config) => {
      const result: Record<string, unknown> = { ...config, version: 1 };
      if (result.autoApproval !== undefined && result.behaviour === undefined) {
        const existing = (result.behaviour as Record<string, unknown> | undefined) ?? {};
        result.behaviour = { ...existing, autoApproval: result.autoApproval };
      }
      return result;
    },
  });

  return registry;
}
