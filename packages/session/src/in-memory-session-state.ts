import type { ChatMessage } from "@vinhnt-sdk/schema";
import type { SessionRuntimeState, SessionRuntimeSnapshot } from "./session-state.js";

/** In-memory {@link SessionRuntimeState} implementation. */
export class InMemorySessionState implements SessionRuntimeState {
  private _messages: ChatMessage[] = [];
  private _context = new Map<string, unknown>();
  private _generation = 0;
  step = 0;
  toolCallCount = 0;
  isRunning = false;

  get messages(): readonly ChatMessage[] {
    return this._messages;
  }

  get generation(): number {
    return this._generation;
  }

  get context(): ReadonlyMap<string, unknown> {
    return this._context;
  }

  pushMessage(msg: ChatMessage): void {
    this._messages.push(msg);
    this._generation++;
  }

  resetMessages(msgs: readonly ChatMessage[]): void {
    this._messages = [...msgs];
    this._generation++;
  }

  setContext(key: string, value: unknown): void {
    this._context.set(key, value);
  }

  clearContext(): void {
    this._context.clear();
  }

  snapshot(): SessionRuntimeSnapshot {
    return {
      messages: [...this._messages],
      context: Object.fromEntries(this._context),
      step: this.step,
      toolCallCount: this.toolCallCount,
      isRunning: this.isRunning,
    };
  }

  restore(snapshot: SessionRuntimeSnapshot): void {
    this._messages = [...snapshot.messages];
    this._context = new Map(Object.entries(snapshot.context));
    this.step = snapshot.step;
    this.toolCallCount = snapshot.toolCallCount;
    this.isRunning = snapshot.isRunning;
    this._generation++;
  }

  fork(): SessionRuntimeState {
    const fork = new InMemorySessionState();
    fork._messages = [...this._messages];
    fork._context = new Map(this._context);
    fork.step = this.step;
    fork.toolCallCount = this.toolCallCount;
    fork.isRunning = this.isRunning;
    return fork;
  }
}
