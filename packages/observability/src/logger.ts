export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly context: Record<string, unknown> | undefined;
  readonly error: { name: string; message: string; stack: string | undefined } | undefined;
  readonly traceId?: string;
  readonly spanId?: string;
}

export interface LoggerSink {
  write(entry: LogEntry): void;
}

export type TraceContextProvider = () => { traceId?: string; spanId?: string } | undefined;

const LEVEL_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export class Logger {
  private sinks: LoggerSink[] = [];
  private minLevel: LogLevel = "info";
  private globalContext: Record<string, unknown> = {};
  private traceContextProvider: TraceContextProvider | undefined;

  constructor(options?: { minLevel?: LogLevel; sinks?: LoggerSink[]; context?: Record<string, unknown>; traceContextProvider?: TraceContextProvider }) {
    this.minLevel = options?.minLevel ?? "info";
    this.sinks = options?.sinks ?? [];
    this.globalContext = options?.context ?? {};
    this.traceContextProvider = options?.traceContextProvider;
  }

  addSink(sink: LoggerSink): void {
    this.sinks.push(sink);
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  child(context: Record<string, unknown>): Logger {
    const child = new Logger({
      minLevel: this.minLevel,
      sinks: this.sinks,
      ...(this.traceContextProvider !== undefined ? { traceContextProvider: this.traceContextProvider } : {}),
    });
    child.globalContext = { ...this.globalContext, ...context };
    return child;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.emit("debug", message, context ? { ...this.globalContext, ...context } : this.globalContext);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.emit("info", message, context ? { ...this.globalContext, ...context } : this.globalContext);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.emit("warn", message, context ? { ...this.globalContext, ...context } : this.globalContext);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const mergedCtx = context ? { ...this.globalContext, ...context } : this.globalContext;
    const traceCtx = this.traceContextProvider?.();
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      context: mergedCtx,
      error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
      ...(traceCtx?.traceId ? { traceId: traceCtx.traceId } : undefined),
      ...(traceCtx?.spanId ? { spanId: traceCtx.spanId } : undefined),
    };
    if (LEVEL_RANK["error"] >= LEVEL_RANK[this.minLevel]) {
      for (const sink of this.sinks) sink.write(entry);
    }
  }

  private emit(level: LogLevel, message: string, context: Record<string, unknown>): void {
    if (LEVEL_RANK[level] < LEVEL_RANK[this.minLevel]) return;
    const traceCtx = this.traceContextProvider?.();
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: undefined,
      ...(traceCtx?.traceId ? { traceId: traceCtx.traceId } : undefined),
      ...(traceCtx?.spanId ? { spanId: traceCtx.spanId } : undefined),
    };
    for (const sink of this.sinks) sink.write(entry);
  }
}
