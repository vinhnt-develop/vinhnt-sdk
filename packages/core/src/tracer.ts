import type { RequestContext, TraceId, RequestId } from "@vinhnt-sdk/schema";
import { RequestContextSchema } from "@vinhnt-sdk/schema";

/** A value augmented with the {@link RequestContext} it was produced under. */
export type Traceable<T> = T & {
  readonly ctx: RequestContext;
};

export { type RequestContext };

/**
 * Lightweight trace span manager: creates child contexts, tracks span
 * timing, and wraps async work so results carry the current context.
 */
export class Tracer {
  private spanStack: Array<{
    name: string;
    start: number;
    ctx: RequestContext;
  }> = [];

  constructor(
    private readonly baseCtx?: RequestContext,
  ) {}

  createChild(ctx?: RequestContext): RequestContext {
    const parent = ctx ?? this.currentCtx;
    return {
      requestId: crypto.randomUUID() as RequestId,
      traceId: parent.traceId,
      actorId: parent.actorId,
      tenantId: parent.tenantId,
    };
  }

  startSpan(name: string, ctx?: RequestContext): void {
    this.spanStack.push({
      name,
      start: Date.now(),
      ctx: ctx ?? this.currentCtx,
    });
  }

  endSpan(): { name: string; durationMs: number; ctx: RequestContext } | null {
    const span = this.spanStack.pop();
    if (!span) return null;
    return {
      name: span.name,
      durationMs: Date.now() - span.start,
      ctx: span.ctx,
    };
  }

  get currentCtx(): RequestContext {
    return this.spanStack.length > 0
      ? this.spanStack[this.spanStack.length - 1]!.ctx
      : this.baseCtx ?? createDefaultCtx();
  }

  wrap<T>(name: string, fn: () => Promise<T>, ctx?: RequestContext): Promise<Traceable<T>> {
    const spanCtx = ctx ?? this.createChild();
    this.startSpan(name, spanCtx);

    return fn().then(
      (result) => {
        this.endSpan();
        return { ...result, ctx: spanCtx } as Traceable<T>;
      },
      (error) => {
        this.endSpan();
        throw error;
      },
    );
  }

  validate(ctx: unknown): RequestContext {
    return RequestContextSchema.parse(ctx) as RequestContext;
  }
}

function createDefaultCtx(): RequestContext {
  return {
    requestId: crypto.randomUUID() as RequestId,
    traceId: crypto.randomUUID() as TraceId,
    actorId: "tracer",
    tenantId: "default",
  } as RequestContext;
}
