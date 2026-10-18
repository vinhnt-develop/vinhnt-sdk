import type { TodoItem } from "@vinhnt-sdk/schema";

/**
 * Persistence contract for the agent's task list.
 *
 * Scoped per session so concurrent runs never leak todos into each other.
 * The SDK ships an in-memory default; applications inject a durable store
 * (e.g. backed by SQLite) without forking the tool.
 */
export interface TodoStore {
  /** Current task list for a session, in insertion order. */
  list(sessionId: string): readonly TodoItem[];
  /** Replace the entire task list for a session (whole-list semantics). */
  replace(sessionId: string, todos: readonly TodoItem[]): void;
  /** Drop the task list for a session. */
  clear(sessionId: string): void;
}

/** In-memory {@link TodoStore} implementation — one list per session. */
export class InMemoryTodoStore implements TodoStore {
  private readonly bySession = new Map<string, TodoItem[]>();

  list(sessionId: string): readonly TodoItem[] {
    return [...(this.bySession.get(sessionId) ?? [])];
  }

  replace(sessionId: string, todos: readonly TodoItem[]): void {
    this.bySession.set(sessionId, todos.map((t) => ({ ...t })));
  }

  clear(sessionId: string): void {
    this.bySession.delete(sessionId);
  }
}
