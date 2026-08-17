import type { RunId, Session, SessionId, RequestContext, Result, AgentConfig } from "@vinhnt-sdk/schema";
import type { MessageContentPart } from "../model.js";
import type { SessionStore, SessionTree } from "@vinhnt-sdk/session";
import type { AgentKernel} from "../kernel/kernel.js";
import { type RunState } from "../kernel/kernel.js";

import { KernelError } from "../kernel/kernel.js";
export type SessionEventType =
  | "session.created"
  | "session.switched"
  | "session.closed"
  | "session.forked"
  | "run.started"
  | "run.state_changed";

export type SessionEvent = {
  type: SessionEventType;
  sessionId: string;
  runId?: string;
  data: unknown;
};

/** Interface for run management — allows swapping kernel implementations. */
export interface RunHandler {
  runSafe(prompt: string, ctx: RequestContext, sessionId?: string, userContentParts?: readonly MessageContentPart[]): Result<{ runId: RunId; abort(): void; completed: Promise<void> }, KernelError>;
  cancelCurrentRun(): void;
  sendInput(runId: RunId, text: string): void;
  getRunState(runId: RunId): RunState | undefined;
  setCurrentAgent(agent: AgentConfig): void;
  onRunStateChange(listener: (runId: string, state: string) => void): () => void;
}

export class SessionRunCoordinator {
  private activeSession: Session | null = null;
  private activeRunId: RunId | null = null;
  private readonly eventListeners = new Set<(event: SessionEvent) => void>();
  private unsubRunState: (() => void) | null = null;

  constructor(
    private readonly handler: RunHandler,
    private readonly sessionStore: SessionStore,
    private readonly sessionTree?: SessionTree,
  ) {}

  get currentSession(): Session | null {
    return this.activeSession;
  }

  get currentRunId(): RunId | null {
    return this.activeRunId;
  }

  get runState(): RunState | undefined {
    return this.activeRunId ? this.handler.getRunState(this.activeRunId) : undefined;
  }

  onEvent(listener: (event: SessionEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => { this.eventListeners.delete(listener); };
  }

  private emit(event: SessionEvent): void {
    for (const listener of this.eventListeners) {
      try { listener(event); } catch { /* isolated */ }
    }
  }

  async listSessions(limit = 50, offset = 0): Promise<readonly Session[]> {
    return this.sessionStore.listSessions(limit, offset);
  }

  async getSession(id: string): Promise<Session | null> {
    return this.sessionStore.getSession(id);
  }

  async createSession(title?: string): Promise<Session> {
    const session = await this.sessionStore.createSession(title);
    this.activeSession = session;
    this.sessionTree?.add(session.id as SessionId, session.title);
    this.emit({ type: "session.created", sessionId: session.id, data: { title: session.title } });
    return session;
  }

  async forkSession(title?: string): Promise<Session | null> {
    if (!this.activeSession) return null;
    const parentSession = this.activeSession;
    const session = await this.sessionStore.forkSession(parentSession.id, title);
    this.activeSession = session;
    this.sessionTree?.add(session.id as SessionId, session.title, parentSession.id as SessionId);
    this.emit({ type: "session.forked", sessionId: session.id, data: { parentId: parentSession.id, title: session.title } });
    return session;
  }

  async switchSession(id: string): Promise<Session | null> {
    const session = await this.sessionStore.getSession(id);
    if (!session) return null;
    this.activeSession = session;
    this.sessionTree?.setActive(session.id as SessionId);
    this.emit({ type: "session.switched", sessionId: session.id, data: { title: session.title } });
    return session;
  }

  async startRun(prompt: string, ctx: RequestContext, agent?: AgentConfig, userContentParts?: readonly MessageContentPart[]): Promise<Result<RunId, KernelError>> {
    if (this.activeRunId) {
      return { ok: false, error: new KernelError("session_busy", "A run is already active in this session — cancel first") };
    }
    this.activeRunId = "pending" as unknown as RunId;

    let session = this.activeSession;
    if (!session) {
      session = await this.sessionStore.createSession();
      this.activeSession = session;
      this.sessionTree?.add(session.id as SessionId, session.title);
      this.emit({ type: "session.created", sessionId: session.id, data: { title: session.title } });
    }

    if (agent) this.handler.setCurrentAgent(agent);

    const handleResult = this.handler.runSafe(prompt, ctx, session.id, userContentParts);
    if (!handleResult.ok) {
      this.activeRunId = null;
      return handleResult;
    }

    const handle = handleResult.value;
    this.activeRunId = handle.runId;

    this.emit({ type: "run.started", sessionId: session.id, runId: handle.runId, data: { prompt } });

    const unsub = this.handler.onRunStateChange((runId, state) => {
      if (runId === this.activeRunId) {
        this.emit({ type: "run.state_changed", sessionId: session.id, runId, data: { state } });
      }
    });

    this.unsubRunState?.();
    this.unsubRunState = unsub;

    handle.completed.finally(() => {
      this.activeRunId = null;
      unsub();
      if (this.unsubRunState === unsub) {
        this.unsubRunState = null;
      }
    });

    return { ok: true, value: handle.runId };
  }

  async sendInput(text: string): Promise<void> {
    if (this.activeRunId) {
      this.handler.sendInput(this.activeRunId as RunId, text);
    }
  }

  cancelRun(): void {
    this.handler.cancelCurrentRun();
    // activeRunId is nullified by handle.completed.finally to avoid race
  }
}

/** Adapter: wraps AgentKernel as a RunHandler for backward compatibility. */
export function kernelAsRunHandler(kernel: AgentKernel): RunHandler {
  return {
    runSafe: (prompt, ctx, sessionId, userContentParts) => kernel.runSafe(prompt, ctx, sessionId, userContentParts),
    cancelCurrentRun: () => kernel.cancelCurrentRun(),
    sendInput: (runId, text) => kernel.sendInput(runId, text),
    getRunState: (runId) => kernel.getRunState(runId),
    setCurrentAgent: (agent) => kernel.setCurrentAgent(agent),
    onRunStateChange: (listener) => kernel.onRunStateChange(listener),
  };
}
