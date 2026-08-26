import { z } from "zod";

/** WebSocket `ws.connected` message payload. */
export const WsConnectSchema = z.object({
  type: z.literal("ws.connected"),
});

/** WebSocket `heartbeat` message with a timestamp. */
export const WsHeartbeatSchema = z.object({
  type: z.literal("heartbeat"),
  ts: z.string(),
});

// WsRunEvent wraps a RunEvent with a kind discriminator for WS transport
/** Run event wrapped for WebSocket transport with a `kind` discriminator. */
export const WsRunEventSchema = z.object({
  kind: z.literal("event"),
  eventType: z.string(),
  id: z.string(),
  runId: z.string(),
  sequence: z.number().int(),
  traceId: z.string(),
  occurredAt: z.string(),
  data: z.unknown(),
});

/** Union of all WebSocket client messages. */
export const WsMessageSchema = z.union([WsConnectSchema, WsHeartbeatSchema, WsRunEventSchema]);

/** Inferred type of {@link WsMessageSchema}. */
export type WsMessage = z.infer<typeof WsMessageSchema>;
/** Inferred type of {@link WsRunEventSchema}. */
export type WsRunEvent = z.infer<typeof WsRunEventSchema>;

/** Parse raw WebSocket data into a {@link WsMessage} or null. */
export function parseWsMessage(data: unknown): WsMessage | null {
  const result = WsMessageSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Run event interface for WS transport conversion.
 * Uses the canonical RunEvent type from schema contracts.
 */
export interface RunEventLike {
  readonly id: string;
  readonly runId: string;
  readonly sequence: number;
  readonly type: string;
  readonly occurredAt: string;
  readonly traceId: string;
  readonly data: unknown;
}

/** Convert a run event to its WebSocket transport shape. */
export function runEventToWs(event: RunEventLike): WsRunEvent {
  return {
    kind: "event",
    eventType: event.type,
    id: event.id,
    runId: event.runId,
    sequence: event.sequence,
    traceId: event.traceId,
    occurredAt: event.occurredAt,
    data: event.data,
  };
}
