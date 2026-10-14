import type { ChatMessage, RunEvent, RunId, ToolCall } from "@vinhnt-sdk/schema";
import { formatToolFailure } from "@vinhnt-sdk/schema";
import { redactSecrets } from "@vinhnt-sdk/guard";
import type { RunEventStore } from "./store.js";

/**
 * Event replay (G4.1) — rebuild a run's ChatMessage transcript purely from its
 * persisted run events (opencode-style `run.chat` reconstruction).
 *
 * Why events and not the session store: a session's message rows can be
 * compacted/trimmed and a legacy run may predate message persistence, while
 * the run event log is append-only. Replay feeds `RunState`-based continuation
 * (`kernel.runFromState`) and session-history forking.
 *
 * Fidelity notes (mirrors the live persistence path in step-executor):
 * - `run.started`   → one `user` message (the audit prompt; the raw prompt is
 *                     what the session store persists — same string unless a
 *   separate system head was joined for audit, in which case replay keeps the
 *   effective prompt as the best available source).
 * - `llm.response`  → one `assistant` message (content + declared toolCalls);
 *   empty responses are skipped, duplicate declarations ignored.
 * - `tool.completed` → `tool` message with `redactSecrets` applied (P1-7 —
 *   the event carries the RAW output; live redaction happens when the message
 *   is built), matching the full (redacted) content the session store keeps.
 * - `tool.failed`   → `formatToolFailure` envelope; `decision: "deny"` maps to
 *   the `permission_denied` kind (best effort — the event carries no kind).
 * - `tool.cancelled` → nothing (an aborted run persists no tool message);
 *   the declaration is stripped by the final pairing repair.
 * - Pairing repair: dangling assistant `toolCalls` entries (declared, never
 *   resolved — abort/timeout) are stripped and empty assistant turns dropped,
 *   mirroring `repairToolPairing` so providers never reject the transcript.
 */
export interface ReplayOptions {
  /** Redact secrets from replayed tool outputs. Default `true` (live behavior). */
  readonly redactToolOutputs?: boolean;
}

interface RunStartedPayload {
  readonly prompt?: unknown;
  readonly sessionId?: unknown;
}

interface LlmResponsePayload {
  readonly content?: unknown;
  readonly toolCalls?: ReadonlyArray<{ readonly id?: unknown; readonly name?: unknown; readonly args?: unknown }>;
}

interface ToolPayload {
  readonly toolId?: unknown;
  readonly output?: unknown;
  readonly error?: unknown;
  readonly decision?: unknown;
}

/** Convert a value to the string form a live tool message would carry. */
function toolOutputToString(output: unknown): string {
  if (typeof output === "string") return output;
  try {
    return JSON.stringify(output ?? null) ?? "";
  } catch {
    return String(output);
  }
}

/**
 * Strip assistant `toolCalls` entries that never received a result and drop
 * assistant turns left with neither text nor tool calls (mirrors
 * `repairToolPairing` in durable-reload.ts).
 */
function stripDanglingToolCalls(messages: readonly ChatMessage[], paired: ReadonlySet<string>): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const msg of messages) {
    if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
      const surviving = msg.toolCalls.filter((tc) => paired.has(tc.id));
      if (surviving.length === 0) {
        if (typeof msg.content === "string" && msg.content.trim().length === 0) continue;
        out.push({
          role: msg.role,
          content: msg.content,
          ...(msg.toolCallId !== undefined ? { toolCallId: msg.toolCallId } : {}),
          ...(msg.refusal !== undefined ? { refusal: msg.refusal } : {}),
        });
        continue;
      }
      out.push(surviving.length === msg.toolCalls.length ? msg : { ...msg, toolCalls: surviving });
      continue;
    }
    out.push(msg);
  }
  return out;
}

/**
 * Rebuild a single run's conversation from its events.
 *
 * Events are sorted by `sequence` (per-run monotonic) before folding. Runs
 * resumed from durable storage emit no `run.started`, so their replay simply
 * starts with the first `llm.response`.
 */
export function replayRunToMessages(events: readonly RunEvent[], options?: ReplayOptions): ChatMessage[] {
  const sorted = events.length > 1 ? [...events].sort((a, b) => a.sequence - b.sequence) : events;
  const messages: ChatMessage[] = [];
  const declared = new Set<string>();
  const paired = new Set<string>();
  let sawRunStarted = false;

  for (const event of sorted) {
    switch (event.type) {
      case "run.started": {
        if (sawRunStarted) break;
        sawRunStarted = true;
        const data = event.data as RunStartedPayload | undefined;
        if (typeof data?.prompt === "string" && data.prompt.length > 0) {
          messages.push({ role: "user", content: data.prompt });
        }
        break;
      }
      case "llm.response": {
        const data = event.data as LlmResponsePayload | undefined;
        const content = typeof data?.content === "string" ? data.content : "";
        const calls: ToolCall[] = [];
        if (Array.isArray(data?.toolCalls)) {
          for (const tc of data.toolCalls) {
            if (!tc || typeof tc.id !== "string" || typeof tc.name !== "string") continue;
            if (declared.has(tc.id) || paired.has(tc.id)) continue;
            calls.push({ id: tc.id, name: tc.name, args: (tc.args ?? {}) as Record<string, unknown> });
          }
        }
        if (content.length === 0 && calls.length === 0) break;
        for (const tc of calls) declared.add(tc.id);
        messages.push({ role: "assistant", content, ...(calls.length > 0 ? { toolCalls: calls } : {}) });
        break;
      }
      case "tool.completed": {
        const data = event.data as ToolPayload | undefined;
        if (typeof data?.toolId !== "string" || !declared.has(data.toolId)) break;
        const raw = toolOutputToString(data.output);
        const content = options?.redactToolOutputs === false ? raw : redactSecrets(raw);
        messages.push({ role: "tool", toolCallId: data.toolId, content });
        declared.delete(data.toolId);
        paired.add(data.toolId);
        break;
      }
      case "tool.failed": {
        const data = event.data as ToolPayload | undefined;
        if (typeof data?.toolId !== "string" || !declared.has(data.toolId)) break;
        const error = typeof data.error === "string" && data.error.length > 0 ? data.error : "Tool failed";
        const kind = data.decision === "deny" ? "permission_denied" : undefined;
        messages.push({
          role: "tool",
          toolCallId: data.toolId,
          content: formatToolFailure(error, undefined, kind),
        });
        declared.delete(data.toolId);
        paired.add(data.toolId);
        break;
      }
      default:
        break;
    }
  }

  return stripDanglingToolCalls(messages, paired);
}

/** Replay a single run's transcript from its persisted events. */
export async function replayRunFromStore(
  eventStore: RunEventStore,
  runId: RunId,
  options?: ReplayOptions,
): Promise<ChatMessage[]> {
  const events = await eventStore.list(runId);
  return replayRunToMessages(events, options);
}

/**
 * Replay a whole session's conversation across all of its runs.
 *
 * Runs are attributed via `run.started.sessionId` (G4.1) with a
 * `snapshot.state.sessionId` fallback for legacy/resumed runs, then merged in
 * chronological order of their first event.
 */
export async function replaySessionToMessages(
  eventStore: RunEventStore,
  sessionId: string,
  options?: ReplayOptions,
): Promise<ChatMessage[]> {
  const runs: Array<{ readonly at: string; readonly events: readonly RunEvent[] }> = [];

  for (const runId of await eventStore.listRunIds()) {
    const events = await eventStore.list(runId);
    if (events.length === 0) continue;

    const started = events.find((e) => e.type === "run.started");
    let runSessionId = started ? ((started.data as RunStartedPayload | undefined)?.sessionId) : undefined;
    if (typeof runSessionId !== "string") {
      const snapshot = await eventStore.getSnapshot(runId);
      const fromSnapshot = snapshot?.state?.sessionId;
      runSessionId = typeof fromSnapshot === "string" ? fromSnapshot : undefined;
    }
    if (runSessionId !== sessionId) continue;

    runs.push({ at: events[0]?.occurredAt ?? "", events });
  }

  runs.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  return runs.flatMap((run) => replayRunToMessages(run.events, options));
}
