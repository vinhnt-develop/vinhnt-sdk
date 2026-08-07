import type { ChatMessage } from "../model.js";
import type { SessionRuntimeState, SessionRuntimeSnapshot } from "../session/session-state.js";

export class InMemorySessionState implements SessionRuntimeState {
  private _messages: ChatMessage[] = [];
  private _context = new Map<string, unknown>();
  step = 0;
  toolCallCount = 0;
  isRunning = false;

  get messages(): readonly ChatMessage[] {
    return this._messages;
  }

  get context(): ReadonlyMap<string, unknown> {
    return this._context;
  }

  pushMessage(msg: ChatMessage): void {
    this._messages.push(msg);
  }

  resetMessages(msgs: readonly ChatMessage[]): void {
    this._messages = [...msgs];
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
