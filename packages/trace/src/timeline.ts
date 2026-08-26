/**
 * Timeline — session log IS the timeline.
 *
 * Full replay from durable events. Token-level replay fidelity
 * via assistant/chunk events.
 *
 * The timeline is a linear sequence of events that can be replayed
 * to reconstruct the full conversation history.
 */

/** Timeline event types — maps to KnownRunEvent from schema */
export type TimelineEventType =
  | "run.started"
  | "run.completed"
  | "run.failed"
  | "step.started"
  | "step.completed"
  | "step.failed"
  | "turn.started"
  | "turn.ended"
  | "tool.invoked"
  | "tool.completed"
  | "tool.failed"
  | "tool.cancelled"
  | "approval.asked"
  | "approval.decided"
  | "llm.retry"
  | "llm.retry_started"
  | "assistant.chunk"
  | "token.compressed"
  | "context.compressed"
  | "permission.asked"
  | "permission.decided";

/** A single timeline event */
export interface TimelineEvent {
  /** Event type */
  readonly type: TimelineEventType;
  /** Timestamp (Unix ms) */
  readonly timestampMs: number;
  /** Event data (type-specific) */
  readonly data: Record<string, unknown>;
  /** Sequence number (monotonic within a session) */
  readonly seq: number;
}

/**
 * Timeline — ordered sequence of events for a session.
 */
export class Timeline {
  private readonly events: TimelineEvent[] = [];
  private seq = 0;

  /** Record an event */
  record(type: TimelineEventType, data: Record<string, unknown>): TimelineEvent {
    const event: TimelineEvent = {
      type,
      timestampMs: Date.now(),
      data,
      seq: this.seq++,
    };
    this.events.push(event);
    return event;
  }

  /** Get all events */
  getEvents(): readonly TimelineEvent[] {
    return [...this.events];
  }

  /** Get events filtered by type */
  getEventsByType(type: TimelineEventType): readonly TimelineEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /** Get events in a time range */
  getEventsInRange(startMs: number, endMs: number): readonly TimelineEvent[] {
    return this.events.filter((e) => e.timestampMs >= startMs && e.timestampMs <= endMs);
  }

  /** Get event count */
  count(): number {
    return this.events.length;
  }

  /** Get duration of the timeline */
  getDurationMs(): number {
    if (this.events.length === 0) return 0;
    return this.events[this.events.length - 1]!.timestampMs - this.events[0]!.timestampMs;
  }

  /** Replay events through a handler */
  async replay(handler: (event: TimelineEvent) => Promise<void>): Promise<void> {
    for (const event of this.events) {
      await handler(event);
    }
  }

  /** Export events as JSON */
  export(): TimelineEvent[] {
    return [...this.events];
  }

  /** Import events from JSON */
  import(events: TimelineEvent[]): void {
    this.events.length = 0;
    for (const event of events) {
      this.events.push(event);
    }
    this.seq = Math.max(0, ...events.map((e) => e.seq)) + 1;
  }
}

/**
 * Build a conversation transcript from timeline events.
 * Extracts user messages, assistant responses, and tool calls.
 */
export function buildTranscript(events: readonly TimelineEvent[]): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];

  for (const event of events) {
    switch (event.type) {
      case "run.started":
        entries.push({
          type: "user",
          content: event.data.prompt as string,
          timestampMs: event.timestampMs,
        });
        break;
      case "assistant.chunk":
        entries.push({
          type: "assistant",
          content: event.data.content as string,
          timestampMs: event.timestampMs,
        });
        break;
      case "tool.invoked":
        entries.push({
          type: "tool_call",
          toolName: event.data.toolName as string,
          input: event.data.input,
          timestampMs: event.timestampMs,
        });
        break;
      case "tool.completed":
        entries.push({
          type: "tool_result",
          toolName: event.data.toolName as string,
          output: event.data.output,
          timestampMs: event.timestampMs,
        });
        break;
    }
  }

  return entries;
}

/** A single entry in a conversation transcript */
export interface TranscriptEntry {
  type: "user" | "assistant" | "tool_call" | "tool_result";
  content?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  timestampMs: number;
}
