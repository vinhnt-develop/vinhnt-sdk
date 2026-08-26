/**
 * Session Provider — abstract service interface for session persistence.
 *
 * This is the "Service Definition" in the capability seam pattern.
 * Store providers (memory, drizzle, postgres) implement this interface.
 *
 * The provider resolves per-session configuration and provides
 * the session + event store as a single unit.
 *
 * @example
 * ```ts
 * import type { SessionProvider } from "@vinhnt-sdk/session";
 *
 * const provider: SessionProvider = createMemorySessionProvider();
 * const sessions = provider.sessionStore;
 * const events = provider.eventStore;
 * ```
 */

import type {
  SessionStore,
  RunEventStore,
} from "@vinhnt-sdk/schema";

/**
 * Session provider — bundles session store + event store as a single unit.
 *
 * This is the top-level abstraction that consumers (core kernel) depend on.
 * It encapsulates the persistence layer and can be swapped without
 * touching the kernel.
 */
export interface SessionProvider {
  /** The session store — CRUD for sessions and messages. */
  readonly sessionStore: SessionStore;
  /** The event store — append-only event log with snapshots. */
  readonly eventStore: RunEventStore;
  /** Provider name (for logging/debugging). */
  readonly name: string;
  /** Dispose resources (connections, file handles, etc.). */
  dispose(): Promise<void>;
}

/**
 * Configuration for creating a session provider.
 */
export interface SessionProviderConfig {
  /** Provider name (default: "memory"). */
  readonly name?: string;
  /** Database URL (for drizzle providers). */
  readonly databaseUrl?: string;
  /** Enable WAL mode for SQLite (default: true). */
  readonly walMode?: boolean;
  readonly metadata?: Record<string, unknown>;
}
