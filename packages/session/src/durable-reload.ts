import type { RunId, Message } from "@vinhnt-sdk/schema";
import { COMPACTION_SUMMARY_PREFIX } from "@vinhnt-sdk/schema";
import type { ChatMessage } from "@vinhnt-sdk/schema";
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
 * RV-15 durable compaction: collapse a persisted session transcript down to the
 * last compaction summary marker. Every message BEFORE the last marker is
 * subsumed by that summary (it is what the compactor already replaced), so the
 * reloaded context equals the post-compaction conversation — surviving restart.
 * The marker message itself becomes the head `system` summary message.
 */
function collapseCompactedMessages(dbMessages: readonly Message[]): Message[] {
  let lastMarker = -1;
  for (let i = 0; i < dbMessages.length; i++) {
    const m = dbMessages[i];
    if (m && m.role === "system" && m.content.startsWith(COMPACTION_SUMMARY_PREFIX)) {
      lastMarker = i;
    }
  }
  if (lastMarker < 0) return [...dbMessages];
  const marker = dbMessages[lastMarker];
  if (!marker) return [...dbMessages];
  const summaryBody = marker.content.slice(COMPACTION_SUMMARY_PREFIX.length);
  return [
    { ...marker, content: summaryBody },
    ...dbMessages.slice(lastMarker + 1),
  ];
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
    // RV-15: drop everything before the last compaction summary marker so the
    // resumed context equals the compacted conversation after a restart.
    messages = collapseCompactedMessages(dbMessages).map(messageToChatMessage);
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
  eventStore: RunEventStore,
): Promise<string[]> {
  const activeSessionIds = new Set<string>();
  const runIds = await eventStore.listRunIds();

  for (const runId of runIds) {
    let started = false;
    let terminated = false;

    const snapshot = await eventStore.getSnapshot(runId);
    let sessionId = snapshot?.state?.sessionId as string | undefined;

    for (const event of await eventStore.list(runId)) {
      if (event.type === "run.started") {
        started = true;
        if (!sessionId) {
          const sid = (event.data as Record<string, unknown> | undefined)?.sessionId;
          if (typeof sid === "string") sessionId = sid;
        }
      } else if (event.type === "run.completed") {
        terminated = true;
      }
    }

    // A snapshot with a terminal status also marks the run as finished.
    const snapshotStatus = snapshot?.state?.status as string | undefined;
    if (snapshotStatus === "succeeded" || snapshotStatus === "failed" || snapshotStatus === "cancelled" || snapshotStatus === "complete") {
      terminated = true;
    }

    // A run that started but never produced a terminal event is still active.
    if (started && !terminated && sessionId) {
      activeSessionIds.add(sessionId);
    }
  }

  return [...activeSessionIds];
}
