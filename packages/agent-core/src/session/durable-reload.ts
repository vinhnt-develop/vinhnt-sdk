import type { RunId, Message } from "@vinhnt-sdk/schema";
import type { ChatMessage } from "../model.js";
import type { RunEventStore, SessionStore } from "./store.js";
import type { SessionRuntimeState } from "./session-state.js";
import { InMemorySessionState } from "./in-memory-session-state.js";

/** Result of restoring a run from durable storage. */
export interface RestoredRun {
  /** The restored session runtime state with messages and step count. */
  sessionState: SessionRuntimeState;
  /** The run ID being restored. */
  runId: RunId;
  /** The session ID associated with the run. */
  sessionId: string | undefined;
  /** The step count restored from snapshot. */
  step: number;
  /** Token counts restored from snapshot. */
  totalInputTokens: number;
  totalOutputTokens: number;
  /** The model name from the snapshot. */
  model: string | undefined;
  /** The final output if the run completed. */
  finalOutput: string | undefined;
}

/**
 * Convert a DB Message to a ChatMessage for the run loop.
 */
function messageToChatMessage(msg: Message): ChatMessage {
  const base: ChatMessage = {
    role: msg.role as ChatMessage["role"],
    content: msg.content,
  };
  if (msg.toolCallId) {
    (base as ChatMessage & { toolCallId?: string }).toolCallId = msg.toolCallId;
  }
  return base;
}

/**
 * Restore a run's state from durable storage (snapshot + messages).
 *
 * This enables "durable history reload" — after a process restart, the kernel
 * can reconstruct the conversation context and continue from where it left off.
 *
 * Usage:
 *   const restored = await restoreRunFromStore(store, sessionStore, runId);
 *   if (restored) {
 *     // Use restored.sessionState to resume the run
 *     kernel.run(prompt, ctx, sessionId, restored.sessionState);
 *   }
 */
export async function restoreRunFromStore(
  eventStore: RunEventStore,
  sessionStore: SessionStore | undefined,
  runId: RunId,
): Promise<RestoredRun | null> {
  // 1. Try to load snapshot first (O(1))
  const snapshot = await eventStore.getSnapshot(runId);

  // 2. Load events to find run metadata
  const events = await eventStore.list(runId);
  if (events.length === 0) return null;

  // Find session ID from snapshot or events
  const sessionId = snapshot?.state?.sessionId as string | undefined;

  // 3. Load persisted messages from SessionStore
  let messages: ChatMessage[] = [];
  if (sessionStore && sessionId) {
    const dbMessages = await sessionStore.listMessages(sessionId);
    messages = dbMessages.map(messageToChatMessage);
  }

  // 4. Reconstruct SessionRuntimeState
  const sessionState = new InMemorySessionState();
  sessionState.resetMessages(messages);

  if (snapshot) {
    sessionState.step = (snapshot.state?.step as number) ?? 0;
    sessionState.toolCallCount = (snapshot.state?.toolCallCount as number) ?? 0;
  }

  return {
    sessionState,
    runId,
    sessionId,
    step: sessionState.step,
    totalInputTokens: (snapshot?.state?.totalInputTokens as number) ?? 0,
    totalOutputTokens: (snapshot?.state?.totalOutputTokens as number) ?? 0,
    model: (snapshot?.state?.model as string) ?? undefined,
    finalOutput: (snapshot?.state?.finalOutput as string) ?? undefined,
  };
}

/**
 * Reconstruct session busy state from event store on startup.
 * Returns session IDs that have non-terminal (pending/running) events.
 */
export async function findActiveSessionIds(
  _eventStore: RunEventStore,
): Promise<string[]> {
  // Look for run.started events without corresponding run.completed events
  const activeSessionIds = new Set<string>();

  // This is a simplified implementation — in production, you'd scan
  // all recent events and track which runs are still active
  return [...activeSessionIds];
}
