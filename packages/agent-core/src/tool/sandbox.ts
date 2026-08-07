import type { ToolDefinition, ToolContext } from "./definitions.js";

export interface SandboxConfig {
  defaultTimeoutMs: number;
}

/** Create a minimal ToolContext from an AbortSignal (for backward compat) */
export function signalToToolContext(signal?: AbortSignal): ToolContext {
  const ctrl = signal ? new AbortController() : new AbortController();
  if (signal) {
    signal.addEventListener("abort", () => ctrl.abort(signal.reason), { once: true });
  }
  return {
    sessionId: "",
    runId: "",
    agentId: "",
    agentName: "",
    signal: ctrl.signal,
    env: {},
    ask: async () => "once",
    metadata: () => {},
    setCompensation: () => {},
  };
}

export class ToolSandbox {
  constructor(private readonly config: SandboxConfig = { defaultTimeoutMs: 30_000 }) {}

  async execute(
    tool: ToolDefinition,
    input: unknown,
    ctx: ToolContext,
  ): Promise<unknown> {
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), this.config.defaultTimeoutMs);

    const combinedSignal = combineSignals(ctx.signal, timeout.signal);
    const augmentedCtx: ToolContext = { ...ctx, signal: combinedSignal };

    try {
      const result = await raceAbort(tool.execute(input, augmentedCtx), combinedSignal);
      return result;
    } finally {
      clearTimeout(timer);
    }
  }
}

function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(new DOMException(signal.reason ?? "Aborted", "AbortError"));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(new DOMException(signal.reason ?? "Timed out", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (val) => {
        signal.removeEventListener("abort", onAbort);
        resolve(val);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      },
    );
  });
}

function combineSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const valid = signals.filter((s): s is AbortSignal => s !== undefined);
  if (valid.length === 0) return new AbortController().signal;
  if (valid.length === 1) return valid[0]!;

  const controller = new AbortController();
  for (const s of valid) {
    if (s.aborted) {
      controller.abort(s.reason);
      return controller.signal;
    }
    s.addEventListener("abort", () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}
