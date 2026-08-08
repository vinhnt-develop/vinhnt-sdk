import { z } from "zod";

export const WsConnectSchema = z.object({
  type: z.literal("ws.connected"),
});

export const WsHeartbeatSchema = z.object({
  type: z.literal("heartbeat"),
  ts: z.string(),
});

// WsRunEvent wraps a RunEvent with a kind discriminator for WS transport
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

export const WsMessageSchema = z.union([WsConnectSchema, WsHeartbeatSchema, WsRunEventSchema]);

export type WsMessage = z.infer<typeof WsMessageSchema>;
export type WsRunEvent = z.infer<typeof WsRunEventSchema>;

export function parseWsMessage(data: unknown): WsMessage | null {
  const result = WsMessageSchema.safeParse(data);
  return result.success ? result.data : null;
}

export type RunEventLike = {
  readonly id: string;
  readonly runId: string;
  readonly sequence: number;
  readonly type: string;
  readonly occurredAt: string;
  readonly traceId: string;
  readonly data: unknown;
};

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
