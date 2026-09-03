/**
 * Session projection types — real-time aggregated stats built from run events.
 *
 * Similar to deepseek-harness's projection system: events → projection → UI state.
 * The projection runs server-side and pushes updated stats to the client via WebSocket.
 */

// ── Session Projection ──

/** Aggregated real-time stats for a session, built by projecting run events. */
export interface SessionProjection {
  /** Session ID this projection belongs to */
  readonly sessionId: string;

  /** Current turn number (incremented per model call) */
  readonly turn: number;
  /** Total steps completed across all turns */
  readonly steps: number;
  /** Number of tool calls made */
  readonly toolCalls: number;

  /** Cumulative token counts */
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly reasoningTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;

  /** Cost tracking per provider */
  readonly costs: ReadonlyArray<ProviderCost>;

  /** Total cost across all providers */
  readonly totalCost: number;

  /** Current provider in use */
  readonly activeProvider?: string;
  /** Current model in use */
  readonly activeModel?: string;

  /** Timeline of turns with their tool usage */
  readonly turns: ReadonlyArray<TurnSnapshot>;

  /** Last updated timestamp */
  readonly updatedAt: string;
}

/** Cost breakdown for a single provider within a session. */
export interface ProviderCost {
  readonly provider: string;
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cost: number;
  readonly durationMs: number;
  readonly steps: number;
}

/** Snapshot of a single turn for the timeline UI. */
export interface TurnSnapshot {
  readonly turn: number;
  readonly steps: number;
  readonly toolCalls: ReadonlyArray<string>;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cost: number;
  readonly durationMs: number;
  readonly provider?: string;
  readonly model?: string;
  readonly status: "completed" | "error" | "aborted";
}

// ── Run Projection ──

/** Aggregated real-time stats for a single run. */
export interface RunProjection {
  readonly runId: string;
  readonly sessionId: string;
  readonly turn: number;
  readonly steps: number;
  readonly toolCalls: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly reasoningTokens: number;
  readonly totalCost: number;
  readonly activeProvider?: string;
  readonly activeModel?: string;
  readonly turns: ReadonlyArray<TurnSnapshot>;
  readonly status: "running" | "completed" | "failed";
  readonly startedAt?: string;
  readonly endedAt?: string;
}

// ── Projection Store Interface ──

/** Stores and retrieves session projections. Implementations can use Redis or in-memory. */
export interface ProjectionStore {
  /** Get or create a session projection */
  getSessionProjection(sessionId: string): Promise<SessionProjection>;
  /** Get or create a run projection */
  getRunProjection(runId: string): Promise<RunProjection>;
  /** Update projection from a run event (called by event handler) */
  applyEvent(event: { type: string; runId: string; data: unknown; occurredAt: string }): Promise<void>;
  /** Subscribe to projection updates for real-time push */
  subscribe(sessionId: string, listener: (projection: SessionProjection) => void): () => void;
}
