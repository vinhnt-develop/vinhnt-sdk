import type { ChatMessage } from "../model.js";

/** Runtime state of an active agent session */
export interface SessionRuntimeState {
  /** Ordered conversation messages for model context */
  readonly messages: readonly ChatMessage[];
  /** Active context sources as key-value pairs */
  readonly context: ReadonlyMap<string, unknown>;
  /** Current step count in the kernel loop */
  step: number;
  /** Cumulative tool calls in this run */
  toolCallCount: number;
  /** Whether the session is currently executing */
  isRunning: boolean;

  /** Append a message to conversation history */
  pushMessage(msg: ChatMessage): void;
  /** Replace the entire message list (e.g. after compaction) */
  resetMessages(msgs: readonly ChatMessage[]): void;
  /** Set a context value */
  setContext(key: string, value: unknown): void;
  /** Clear all context values */
  clearContext(): void;
  /** Snapshot current state for serialisation */
  snapshot(): SessionRuntimeSnapshot;
  /** Restore from snapshot */
  restore(snapshot: SessionRuntimeSnapshot): void;
  /** Create an independent copy for parallel sub-agent execution */
  fork(): SessionRuntimeState;
}

/** Serializable snapshot of SessionRuntimeState */
export interface SessionRuntimeSnapshot {
  messages: readonly ChatMessage[];
  context: Record<string, unknown>;
  step: number;
  toolCallCount: number;
  isRunning: boolean;
}
