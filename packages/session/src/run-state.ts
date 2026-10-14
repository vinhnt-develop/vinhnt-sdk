import type { ChatMessage, MessageContentPart } from "@vinhnt-sdk/schema";
import { ValidationError } from "@vinhnt-sdk/schema";
import type { SessionRuntimeState } from "./session-state.js";
import { InMemorySessionState } from "./in-memory-session-state.js";

/**
 * Serialized run state (G4.1) — a versioned, JSON-friendly checkpoint that
 * `kernel.runFromState` turns back into a live run (opencode-style
 * serialize/resume).
 *
 * Distinct from `RunState` in `@vinhnt-sdk/step-executor` (the run lifecycle
 * state-machine string union) — this is the durable conversation checkpoint.
 */
export const RUN_STATE_VERSION = 1;

/** Versioned checkpoint of a run's conversation, ready for JSON transport. */
export interface SerializedRunState {
  /** Schema version — {@link RUN_STATE_VERSION}. */
  readonly version: number;
  /** ISO timestamp of when the state was captured. */
  readonly savedAt: string;
  /**
   * The prompt `runFromState` will send as the latest user turn.
   * Matches the `sessionState` contract of `kernel.run()`.
   */
  readonly prompt: string;
  /**
   * Conversation history BEFORE {@link SerializedRunState.prompt} is appended —
   * i.e. exactly what `loadSessionHistory` returns (never includes the fresh
   * prompt). The kernel appends the prompt itself, so resume replays
   * `system + history + prompt` and persists the prompt once.
   */
  readonly messages: readonly ChatMessage[];
  /** Step counter restored into the run loop (max-steps accounting). */
  readonly step: number;
  /** Cumulative tool calls restored into the session state. */
  readonly toolCallCount: number;
  /** Session the run belongs to (threaded through to `kernel.run`). */
  readonly sessionId?: string;
  /** Source run this state was captured from (informational). */
  readonly runId?: string;
  readonly model?: string;
  readonly provider?: string;
  readonly agentId?: string;
  readonly totalInputTokens?: number;
  readonly totalOutputTokens?: number;
  readonly finalOutput?: string;
  /** Multimodal parts of the prompt, when the original run had them. */
  readonly userContentParts?: readonly MessageContentPart[];
}

/** Input for {@link createRunState}. */
export interface SerializedRunStateInit {
  readonly prompt: string;
  readonly messages?: readonly ChatMessage[];
  readonly step?: number;
  readonly toolCallCount?: number;
  readonly sessionId?: string;
  readonly runId?: string;
  readonly model?: string;
  readonly provider?: string;
  readonly agentId?: string;
  readonly totalInputTokens?: number;
  readonly totalOutputTokens?: number;
  readonly finalOutput?: string;
  readonly userContentParts?: readonly MessageContentPart[];
  readonly savedAt?: string;
}

function optionalFields(init: SerializedRunStateInit): Partial<SerializedRunState> {
  return {
    ...(init.sessionId !== undefined ? { sessionId: init.sessionId } : {}),
    ...(init.runId !== undefined ? { runId: init.runId } : {}),
    ...(init.model !== undefined ? { model: init.model } : {}),
    ...(init.provider !== undefined ? { provider: init.provider } : {}),
    ...(init.agentId !== undefined ? { agentId: init.agentId } : {}),
    ...(init.totalInputTokens !== undefined ? { totalInputTokens: init.totalInputTokens } : {}),
    ...(init.totalOutputTokens !== undefined ? { totalOutputTokens: init.totalOutputTokens } : {}),
    ...(init.finalOutput !== undefined ? { finalOutput: init.finalOutput } : {}),
    ...(init.userContentParts !== undefined ? { userContentParts: [...init.userContentParts] } : {}),
  };
}

/** Build a {@link SerializedRunState} with defaults (step/toolCallCount 0). */
export function createRunState(init: SerializedRunStateInit): SerializedRunState {
  return {
    version: RUN_STATE_VERSION,
    savedAt: init.savedAt ?? new Date().toISOString(),
    prompt: init.prompt,
    messages: [...(init.messages ?? [])],
    step: init.step ?? 0,
    toolCallCount: init.toolCallCount ?? 0,
    ...optionalFields(init),
  };
}

/** Serialize a run state to a JSON string (safe for storage/transport). */
export function serializeRunState(state: SerializedRunState): string {
  return JSON.stringify(state);
}

function isMessageLike(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.role === "string" && (typeof v.content === "string" || Array.isArray(v.content));
}

/**
 * Parse a serialized run state (JSON string or already-decoded object).
 *
 * @throws {ValidationError} when the payload is not valid JSON, not an
 * object, carries an unsupported version, or is missing required fields.
 */
export function parseRunState(raw: string | unknown): SerializedRunState {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch (err) {
      throw new ValidationError("RunState is not valid JSON", [
        err instanceof Error ? err.message : String(err),
      ]);
    }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError("RunState must be an object", [`got ${Array.isArray(value) ? "array" : typeof value}`]);
  }
  const v = value as Record<string, unknown>;
  const problems: string[] = [];
  if (v.version !== RUN_STATE_VERSION) problems.push(`unsupported version: ${String(v.version)}`);
  if (typeof v.prompt !== "string") problems.push("prompt must be a string");
  if (typeof v.savedAt !== "string") problems.push("savedAt must be a string");
  if (typeof v.step !== "number") problems.push("step must be a number");
  if (v.toolCallCount !== undefined && typeof v.toolCallCount !== "number") problems.push("toolCallCount must be a number");
  if (!Array.isArray(v.messages)) {
    problems.push("messages must be an array");
  } else if (!v.messages.every(isMessageLike)) {
    problems.push("messages must be objects with string role and string/array content");
  }
  if (v.sessionId !== undefined && typeof v.sessionId !== "string") problems.push("sessionId must be a string");
  if (v.userContentParts !== undefined && !Array.isArray(v.userContentParts)) problems.push("userContentParts must be an array");
  if (problems.length > 0) throw new ValidationError(`Invalid RunState: ${problems.join("; ")}`, problems);

  return {
    version: RUN_STATE_VERSION,
    savedAt: v.savedAt as string,
    prompt: v.prompt as string,
    messages: v.messages as readonly ChatMessage[],
    step: v.step as number,
    toolCallCount: typeof v.toolCallCount === "number" ? v.toolCallCount : 0,
    ...(typeof v.sessionId === "string" ? { sessionId: v.sessionId } : {}),
    ...(typeof v.runId === "string" ? { runId: v.runId } : {}),
    ...(typeof v.model === "string" ? { model: v.model } : {}),
    ...(typeof v.provider === "string" ? { provider: v.provider } : {}),
    ...(typeof v.agentId === "string" ? { agentId: v.agentId } : {}),
    ...(typeof v.totalInputTokens === "number" ? { totalInputTokens: v.totalInputTokens } : {}),
    ...(typeof v.totalOutputTokens === "number" ? { totalOutputTokens: v.totalOutputTokens } : {}),
    ...(typeof v.finalOutput === "string" ? { finalOutput: v.finalOutput } : {}),
    ...(Array.isArray(v.userContentParts) ? { userContentParts: v.userContentParts as readonly MessageContentPart[] } : {}),
  };
}

/**
 * Capture a {@link SerializedRunState} from a live session state.
 *
 * `init.prompt` is the prompt about to be sent (history contract: the prompt
 * must NOT already be part of `sessionState.messages`).
 */
export function runStateFromSessionState(
  sessionState: SessionRuntimeState,
  init: SerializedRunStateInit,
): SerializedRunState {
  return createRunState({
    ...init,
    messages: sessionState.messages,
    step: sessionState.step,
    toolCallCount: sessionState.toolCallCount,
  });
}

/** Rebuild a fresh {@link InMemorySessionState} from a serialized state. */
export function sessionStateFromRunState(state: SerializedRunState): InMemorySessionState {
  const sessionState = new InMemorySessionState();
  sessionState.resetMessages(state.messages);
  sessionState.step = state.step;
  sessionState.toolCallCount = state.toolCallCount;
  return sessionState;
}
