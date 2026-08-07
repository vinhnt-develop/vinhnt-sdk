export type AuditAction =
  | "tool.executed"
  | "tool.denied"
  | "approval.granted"
  | "approval.denied"
  | "run.started"
  | "run.completed"
  | "config.changed"
  | "session.created"
  | "session.switched";

export interface AuditEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly action: AuditAction;
  readonly traceId: string;
  readonly actorId: string;
  readonly tenantId: string;
  readonly details: Record<string, unknown> | undefined;
}

export interface AuditSink {
  write(entry: AuditEntry): void;
  query?(filter?: AuditQuery): AuditQueryResult;
}

export interface AuditQuery {
  readonly actorId?: string;
  readonly action?: AuditAction;
  readonly timeRange?: { readonly start: string; readonly end: string };
  readonly tenantId?: string;
  readonly traceId?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export interface AuditQueryResult {
  readonly entries: readonly AuditEntry[];
  readonly total: number;
}

export class AuditLog {
  private sinks: AuditSink[] = [];
  private entries: AuditEntry[] = [];
  private maxEntries: number;

  constructor(options?: { maxEntries?: number }) {
    this.maxEntries = options?.maxEntries ?? 10_000;
  }

  addSink(sink: AuditSink): void {
    this.sinks.push(sink);
  }

  record(action: AuditAction, ctx: { traceId: string; actorId: string; tenantId: string }, details?: Record<string, unknown>): void {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      traceId: ctx.traceId,
      actorId: ctx.actorId,
      tenantId: ctx.tenantId,
      details,
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }

    for (const sink of this.sinks) {
      sink.write(entry);
    }
  }

  private applyFilter(entries: AuditEntry[], filter?: AuditQuery): AuditEntry[] {
    let matched = entries;
    if (filter?.actorId) matched = matched.filter((e) => e.actorId === filter.actorId);
    if (filter?.action) matched = matched.filter((e) => e.action === filter.action);
    if (filter?.tenantId) matched = matched.filter((e) => e.tenantId === filter.tenantId);
    if (filter?.traceId) matched = matched.filter((e) => e.traceId === filter.traceId);
    if (filter?.timeRange) {
      matched = matched.filter((e) => {
        if (filter.timeRange!.start && e.timestamp < filter.timeRange!.start) return false;
        if (filter.timeRange!.end && e.timestamp > filter.timeRange!.end) return false;
        return true;
      });
    }
    return matched;
  }

  query(filter?: AuditQuery): AuditQueryResult {
    let allEntries = [...this.applyFilter(this.entries, filter)];

    for (const sink of this.sinks) {
      if (sink.query) {
        const sinkResult = sink.query(filter);
        const existingIds = new Set(allEntries.map((e) => e.id));
        for (const entry of sinkResult.entries) {
          if (!existingIds.has(entry.id)) {
            allEntries.push(entry);
          }
        }
      }
    }

    allEntries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const total = allEntries.length;
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;
    const entries = allEntries.slice(offset, offset + limit);

    return { entries, total };
  }
}
