import type { RunId, Message } from "@vinhnt-sdk/schema";
import { COMPACTION_SUMMARY_PREFIX } from "@vinhnt-sdk/schema";
import type { ChatMessage, ContentPart, ToolCall } from "@vinhnt-sdk/schema";
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
 * Reconstruct a ChatMessage's `content` from persisted rows (P1.2).
 * Structured blocks win when present; the text column is re-appended as a
 * text part only when the blocks do not already carry one, so nothing the
 * model saw live is lost on reload.
 */
function reconstructContent(msg: Message): string | readonly ContentPart[] {
  const blocks = msg.contentBlocks;
  if (!blocks || blocks.length === 0) return msg.content;
  const hasTextPart = blocks.some((b) => b.type === "text");
  if (!hasTextPart && msg.content.length > 0) {
    return [...blocks, { type: "text", text: msg.content }] as readonly ContentPart[];
  }
  return blocks as readonly ContentPart[];
}

/**
 * Convert a DB Message to a ChatMessage for the run loop.
 */
function messageToChatMessage(msg: Message): ChatMessage {
  const toolCalls: ToolCall[] | undefined =
    msg.toolCalls && msg.toolCalls.length > 0
      ? msg.toolCalls.map((tc) => ({ id: tc.id, name: tc.name, args: tc.args }))
      : undefined;
  return {
    role: msg.role as ChatMessage["role"],
    content: reconstructContent(msg),
    ...(msg.toolCallId ? { toolCallId: msg.toolCallId } : {}),
    ...(toolCalls ? { toolCalls } : {}),
  };
}

/**
 * Repair tool pairing in a persisted transcript (P1.2).
 *
 * Providers reject a `tool` message that is not preceded by an assistant
 * `toolCalls` entry declaring its id — and equally reject an assistant
 * `toolCalls` entry with no following result. Legacy rows (and partially
 * written transcripts) contain exactly those shapes, so:
 *
 * - drop orphan `tool` rows (no preceding declaration, or a duplicate result);
 * - strip assistant `toolCalls` entries that never got a result;
 * - drop assistant rows left with neither text nor tool calls.
 */
function repairToolPairing(rows: readonly Message[]): Message[] {
  // Pass 1 — forward scan: declarations must precede their results.
  const declared = new Set<string>();
  const pairedIndexes = new Set<number>();
  const pairedIds = new Set<string>();
  rows.forEach((row, i) => {
    if (row.role === "assistant" && row.toolCalls && row.toolCalls.length > 0) {
      for (const tc of row.toolCalls) declared.add(tc.id);
    } else if (row.role === "tool" && row.toolCallId) {
      if (declared.has(row.toolCallId) && !pairedIds.has(row.toolCallId)) {
        pairedIndexes.add(i);
        pairedIds.add(row.toolCallId);
      }
    }
  });

  // Pass 2 — filter rows and strip dangling calls.
  const kept: Message[] = [];
  rows.forEach((row, i) => {
    if (row.role === "tool") {
      if (pairedIndexes.has(i)) kept.push(row);
      return;
    }
    if (row.role === "assistant" && row.toolCalls && row.toolCalls.length > 0) {
      const surviving = row.toolCalls.filter((tc) => pairedIds.has(tc.id));
      if (surviving.length === 0 && row.content.trim().length === 0) return;
      kept.push(
        surviving.length === row.toolCalls.length
          ? row
          : {
              ...row,
              ...(surviving.length > 0
                ? { toolCalls: surviving }
                : { toolCalls: undefined }),
            },
      );
      return;
    }
    kept.push(row);
  });
  return kept;
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
 * Load a session's persisted transcript as run-loop-ready {@link ChatMessage}s.
 *
 * - Collapses everything before the last compaction summary marker (RV-15) so
 *   the reloaded context equals the post-compaction conversation.
 * - Optionally keeps only the last `limit` messages (P4.1 historyLimit) —
 *   applied AFTER collapse (the summary marker is never the cut point) and
 *   BEFORE tool-pair repair so orphaned `tool` rows at the window head are
 *   dropped rather than sent to the provider. Nothing is deleted from the
 *   store; the trim only affects what this turn's context sees.
 * - Repairs tool pairing (P1.2): orphan `tool` rows are dropped and dangling
 *   assistant `toolCalls` entries are stripped so providers never reject the
 *   reloaded transcript.
 * - Maps DB rows to ChatMessage (role/content, optional toolCallId,
 *   assistant toolCalls and structured content blocks).
 *
 * Intended for hydrating a {@link SessionRuntimeState} at run start so the
 * model receives prior-turn history instead of a fresh single-turn array.
 */
export async function loadSessionHistory(
  sessionStore: SessionStore | undefined,
  sessionId: string,
  options?: { readonly limit?: number },
): Promise<ChatMessage[]> {
  if (!sessionStore) return [];
  const dbMessages = await sessionStore.listMessages(sessionId);
  let rows = collapseCompactedMessages(dbMessages);
  const limit = options?.limit !== undefined && Number.isFinite(options.limit) && options.limit > 0
    ? Math.floor(options.limit)
    : undefined;
  if (limit !== undefined && rows.length > limit) {
    rows = rows.slice(-limit);
  }
  // Collapse first (RV-15), then repair tool pairing (P1.2) - the compaction
  // summary may itself subsume the assistant that declared a tool call.
  return repairToolPairing(rows).map(messageToChatMessage);
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

  // 3. Load persisted messages from SessionStore (RV-15 collapse + mapping).
  const messages: ChatMessage[] = sessionId
    ? await loadSessionHistory(sessionStore, sessionId)
    : [];

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
