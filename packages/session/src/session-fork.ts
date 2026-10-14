import type { AddMessageOptions, ContentPart, Message, Session, SessionStore } from "@vinhnt-sdk/schema";
import { ValidationError } from "@vinhnt-sdk/schema";

/**
 * Session fork with history copy (G4.1) — the `SessionStore.forkSession`
 * contract only links a new session row to its parent (`parentSessionId`);
 * implementations (vinhnt-agent sqlite included) do NOT copy messages, so a
 * plain `forkSession` yields an empty transcript. This helper completes the
 * fork for ANY store: create the linked session, then copy the source
 * transcript (preserving tool pairing, structured content blocks and token
 * attribution).
 */
export interface ForkSessionHistoryOptions {
  /** Forked session title. Defaults to `"Fork of <source title>"`. */
  readonly title?: string;
  /** Copy only up to AND including this message id (point-in-time fork). */
  readonly atMessageId?: string;
  /** Keep only the last N messages of the (filtered) transcript. */
  readonly limit?: number;
}

/** Result of {@link forkSessionHistory}. */
export interface ForkSessionHistoryResult {
  /** The forked session row (already linked to the source via parentSessionId). */
  readonly session: Session;
  /** Number of message rows copied into the fork. */
  readonly copiedMessageCount: number;
}

/** Copy one persisted message row into the target session, preserving fidelity. */
async function copyMessage(store: SessionStore, targetSessionId: string, row: Message): Promise<void> {
  await store.addMessage(targetSessionId, {
    role: row.role,
    content: row.content,
    ...(row.toolCallId ? { toolCallId: row.toolCallId } : {}),
    ...(row.toolCalls && row.toolCalls.length > 0 ? { toolCalls: row.toolCalls } : {}),
    ...(row.contentBlocks && row.contentBlocks.length > 0 ? { contentBlocks: row.contentBlocks as readonly ContentPart[] } : {}),
    ...(row.tokens ? { tokens: row.tokens as NonNullable<AddMessageOptions["tokens"]> } : {}),
    ...(row.model ? { model: row.model } : {}),
    ...(row.provider ? { provider: row.provider } : {}),
    ...(row.cost !== undefined ? { cost: row.cost } : {}),
    ...(row.admittedSeq !== undefined ? { admittedSeq: row.admittedSeq } : {}),
  });
}

/**
 * Fork a session INCLUDING its conversation history.
 *
 * Order of operations: locate the source row → load its transcript → apply
 * `atMessageId` (point-in-time cut) → apply `limit` (tail cut) → create the
 * linked session via `store.forkSession` → copy the filtered rows.
 *
 * @throws {ValidationError} when the source session does not exist or
 * `atMessageId` does not match a message in the source transcript.
 */
export async function forkSessionHistory(
  store: SessionStore,
  sourceSessionId: string,
  options?: ForkSessionHistoryOptions,
): Promise<ForkSessionHistoryResult> {
  const source = await store.getSession(sourceSessionId);
  if (!source) {
    throw new ValidationError(`Source session not found: ${sourceSessionId}`);
  }

  let rows = [...(await store.listMessages(sourceSessionId))];

  if (options?.atMessageId !== undefined) {
    const cutIndex = rows.findIndex((row) => row.id === options.atMessageId);
    if (cutIndex < 0) {
      throw new ValidationError(`atMessageId not found in source session: ${options.atMessageId}`);
    }
    rows = rows.slice(0, cutIndex + 1);
  }
  if (options?.limit !== undefined && Number.isFinite(options.limit) && options.limit > 0 && rows.length > options.limit) {
    rows = rows.slice(-Math.floor(options.limit));
  }

  const session = await store.forkSession(sourceSessionId, options?.title ?? `Fork of ${source.title}`);
  for (const row of rows) {
    await copyMessage(store, session.id, row);
  }
  return { session, copiedMessageCount: rows.length };
}
