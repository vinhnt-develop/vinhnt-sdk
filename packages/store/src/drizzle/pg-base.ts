import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { pushPgSchema } from "./pg-migration.js";

export abstract class PgStoreBase {
  protected db: NodePgDatabase = null as unknown as NodePgDatabase;
  protected pool: pg.Pool = null as unknown as pg.Pool;
  protected readonly connectionString: string;
  private initialized = false;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.pool = new pg.Pool({ connectionString: this.connectionString, max: 10 });
    this.db = drizzle(this.pool);
    await pushPgSchema(this.connectionString);
    this.initialized = true;
  }

  async close(): Promise<void> {
    await this.pool?.end();
    this.initialized = false;
  }

  protected requireDb(): NodePgDatabase {
    if (!this.db) throw new Error("Store not initialized. Call init() first.");
    return this.db;
  }
}
