/** A string branded with a nominal type tag `T` for compile-time safety. */
export type BrandedId<T extends string> = string & { readonly __brand: T };

/** A branded string identifying a run. */
export type RunId = BrandedId<"RunId">;
/** A branded string identifying a session. */
export type SessionId = BrandedId<"SessionId">;
/** A branded string identifying an agent. */
export type AgentId = BrandedId<"AgentId">;
/** A branded string identifying a tool call. */
export type ToolCallId = BrandedId<"ToolCallId">;
/** A branded string identifying a message. */
export type MessageId = BrandedId<"MessageId">;
/** A branded string identifying a trace. */
export type TraceId = BrandedId<"TraceId">;
/** A branded string identifying a request. */
export type RequestId = BrandedId<"RequestId">;
/** A branded string identifying a workspace. */
export type WorkspaceId = BrandedId<"WorkspaceId">;
/** A branded string identifying an environment. */
export type EnvironmentId = BrandedId<"EnvironmentId">;
/** A branded string identifying a file patch. */
export type FilePatchId = BrandedId<"FilePatchId">;

/* ── Branded type guards ── */

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/** Type guard: is `v` a valid AgentId? */
export function isAgentId(v: unknown): v is AgentId {
  return isNonEmptyString(v);
}

/** Type guard: is `v` a valid RunId? */
export function isRunId(v: unknown): v is RunId {
  return isNonEmptyString(v);
}

/** Type guard: is `v` a valid SessionId? */
export function isSessionId(v: unknown): v is SessionId {
  return isNonEmptyString(v);
}

/** Type guard: is `v` a valid MessageId? */
export function isMessageId(v: unknown): v is MessageId {
  return isNonEmptyString(v);
}

/** Type guard: is `v` a valid ToolCallId? */
export function isToolCallId(v: unknown): v is ToolCallId {
  return isNonEmptyString(v);
}

/** Type guard: is `v` a valid TraceId? */
export function isTraceId(v: unknown): v is TraceId {
  return isNonEmptyString(v);
}

/** Type guard: is `v` a valid RequestId? */
export function isRequestId(v: unknown): v is RequestId {
  return isNonEmptyString(v);
}

/** Type guard: is `v` a non-null, non-array object? */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/* ── Branded type assertions ── */

/** Assert `v` is a valid AgentId, throwing a TypeError otherwise. */
export function assertAgentId(v: unknown): asserts v is AgentId {
  if (!isAgentId(v)) throw new TypeError(`Expected AgentId, got ${typeof v}`);
}

/** Assert `v` is a valid RunId, throwing a TypeError otherwise. */
export function assertRunId(v: unknown): asserts v is RunId {
  if (!isRunId(v)) throw new TypeError(`Expected RunId, got ${typeof v}`);
}

/** Assert `v` is a valid SessionId, throwing a TypeError otherwise. */
export function assertSessionId(v: unknown): asserts v is SessionId {
  if (!isSessionId(v)) throw new TypeError(`Expected SessionId, got ${typeof v}`);
}

/** Assert `v` is a valid MessageId, throwing a TypeError otherwise. */
export function assertMessageId(v: unknown): asserts v is MessageId {
  if (!isMessageId(v)) throw new TypeError(`Expected MessageId, got ${typeof v}`);
}
