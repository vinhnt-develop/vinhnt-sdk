import type { RequestId, TraceId, RunId } from "../contracts/branded.js";

export interface RequestContext {
  readonly requestId: RequestId;
  readonly traceId: TraceId;
  readonly actorId: string;
  readonly tenantId: string;
  readonly parentRunId?: RunId | undefined;
}
