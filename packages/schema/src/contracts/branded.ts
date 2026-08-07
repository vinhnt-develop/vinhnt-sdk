export type BrandedId<T extends string> = string & { readonly __brand: T };

export type RunId = BrandedId<"RunId">;
export type SessionId = BrandedId<"SessionId">;
export type AgentId = BrandedId<"AgentId">;
export type ToolCallId = BrandedId<"ToolCallId">;
export type MessageId = BrandedId<"MessageId">;
export type TraceId = BrandedId<"TraceId">;
export type RequestId = BrandedId<"RequestId">;
export type WorkspaceId = BrandedId<"WorkspaceId">;
export type EnvironmentId = BrandedId<"EnvironmentId">;
export type FilePatchId = BrandedId<"FilePatchId">;

/* ── Branded type guards ── */

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

export function isAgentId(v: unknown): v is AgentId {
  return isNonEmptyString(v);
}

export function isRunId(v: unknown): v is RunId {
  return isNonEmptyString(v);
}

export function isSessionId(v: unknown): v is SessionId {
  return isNonEmptyString(v);
}

export function isMessageId(v: unknown): v is MessageId {
  return isNonEmptyString(v);
}

export function isToolCallId(v: unknown): v is ToolCallId {
  return isNonEmptyString(v);
}

export function isTraceId(v: unknown): v is TraceId {
  return isNonEmptyString(v);
}

export function isRequestId(v: unknown): v is RequestId {
  return isNonEmptyString(v);
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/* ── Branded type assertions ── */

export function assertAgentId(v: unknown): asserts v is AgentId {
  if (!isAgentId(v)) throw new TypeError(`Expected AgentId, got ${typeof v}`);
}

export function assertRunId(v: unknown): asserts v is RunId {
  if (!isRunId(v)) throw new TypeError(`Expected RunId, got ${typeof v}`);
}

export function assertSessionId(v: unknown): asserts v is SessionId {
  if (!isSessionId(v)) throw new TypeError(`Expected SessionId, got ${typeof v}`);
}

export function assertMessageId(v: unknown): asserts v is MessageId {
  if (!isMessageId(v)) throw new TypeError(`Expected MessageId, got ${typeof v}`);
}
