import { z } from "zod";
import { defineTool } from "./index.js";
import type { TodoItem } from "@vinhnt-sdk/schema";
import type { TodoStore } from "./todo-store.js";
import { InMemoryTodoStore } from "./todo-store.js";

type TodoStatus = TodoItem["status"];
type TodoPriority = NonNullable<TodoItem["priority"]>;

/** Snapshot emitted after every task-list mutation. */
export interface TodoUpdate {
  readonly sessionId: string;
  readonly runId: string;
  readonly todos: readonly TodoItem[];
}

/** Options for {@link createTodoWriteTool}. */
export interface TodoWriteToolOptions {
  /** Store for the task list (default: fresh `InMemoryTodoStore`). */
  store?: TodoStore;
  /** Called after each mutation so the host can persist/emit `todo.updated`. */
  onUpdate?: (update: TodoUpdate) => void;
  /**
   * When true, more than one item may be `in_progress` at a time (fan-out).
   * Default false — the tool enforces a single active task (Claude Code rule).
   */
  allowParallelInProgress?: boolean;
}

const DEFAULT_SESSION = "__default__";
const STATUSES: readonly TodoStatus[] = ["pending", "in_progress", "completed", "cancelled"];
const PRIORITIES: readonly TodoPriority[] = ["high", "medium", "low"];

function summarize(todos: readonly TodoItem[]) {
  return {
    total: todos.length,
    pending: todos.filter((t) => t.status === "pending").length,
    inProgress: todos.filter((t) => t.status === "in_progress").length,
    completed: todos.filter((t) => t.status === "completed").length,
    cancelled: todos.filter((t) => t.status === "cancelled").length,
  };
}

/** Create the `todowrite` tool managing a structured task list with priorities and status. */
export function createTodoWriteTool(options: TodoWriteToolOptions = {}) {
  const store: TodoStore = options.store ?? new InMemoryTodoStore();
  const allowParallel = options.allowParallelInProgress ?? false;
  const counters = new Map<string, number>();

  const nextId = (sessionId: string): string => {
    const n = (counters.get(sessionId) ?? 0) + 1;
    counters.set(sessionId, n);
    return String(n);
  };

  const coerceStatus = (value: unknown): TodoStatus | undefined =>
    typeof value === "string" && (STATUSES as readonly string[]).includes(value) ? (value as TodoStatus) : undefined;

  const coercePriority = (value: unknown): TodoPriority | undefined =>
    typeof value === "string" && (PRIORITIES as readonly string[]).includes(value) ? (value as TodoPriority) : undefined;

  /** Keep at most one `in_progress` when parallelism is disallowed. */
  const normalizeInProgress = (todos: TodoItem[]): TodoItem[] => {
    if (allowParallel) return todos;
    let seen = false;
    return todos.map((t) => {
      if (t.status !== "in_progress") return t;
      if (seen) return { ...t, status: "pending" as TodoStatus };
      seen = true;
      return t;
    });
  };

  return defineTool<unknown, unknown>({
    name: "todowrite",
    description:
      "Manage a structured task list with priorities and status. " +
      "Preferred: pass the full `todos` array to replace the list (whole-list semantics — include every task on each call, preserving order; keep exactly one task `in_progress`). " +
      "Also supports single-item actions: create, list, update, complete, delete. " +
      "Every call returns the full `todos` snapshot plus a `summary`.",
    risk: "read",
    input: z.unknown(),
    jsonSchema: {
      type: "object",
      properties: {
        todos: {
          type: "array",
          description: "Full task list (whole-list replace). When present, all other fields are ignored.",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Stable task ID (assigned automatically when omitted)" },
              content: { type: "string", description: "Imperative task description (e.g. \"Run tests\")" },
              activeForm: { type: "string", description: "Continuous-present form shown while in_progress (e.g. \"Running tests\")" },
              status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"] },
              priority: { type: "string", enum: ["high", "medium", "low"] },
            },
            required: ["content", "status"],
          },
        },
        action: {
          type: "string",
          enum: ["create", "list", "update", "complete", "delete"],
          description: "Single-item action (used only when `todos` is absent)",
        },
        id: { type: "string", description: "Task ID (required for update, complete, delete)" },
        content: { type: "string", description: "Task description (required for create, optional for update)" },
        activeForm: { type: "string", description: "Continuous-present form (optional)" },
        priority: { type: "string", enum: ["high", "medium", "low"], description: "Task priority (default: medium)" },
        status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"], description: "Task status (used with update action)" },
      },
    },
    async execute(raw, ctx) {
      const v = (raw ?? {}) as Record<string, unknown>;
      const context = ctx as { sessionId?: string; runId?: string } | undefined;
      const sessionId = context?.sessionId ?? DEFAULT_SESSION;
      const runId = context?.runId ?? "";

      const emit = (todos: readonly TodoItem[]) => {
        options.onUpdate?.({ sessionId, runId, todos });
      };

      const snapshot = (extra: Record<string, unknown> = {}) => {
        const todos = store.list(sessionId);
        return { ...extra, todos, summary: summarize(todos) };
      };

      const write = (todos: TodoItem[]) => {
        const normalized = normalizeInProgress(todos);
        store.replace(sessionId, normalized);
        emit(normalized);
        return normalized;
      };

      // ── Whole-list replace (preferred, model-facing) ──
      if (Array.isArray(v.todos)) {
        const incoming = v.todos as Array<Record<string, unknown>>;
        const todos: TodoItem[] = [];
        for (const entry of incoming) {
          if (!entry || typeof entry !== "object") continue;
          const content = typeof entry.content === "string" ? entry.content : undefined;
          if (!content) continue;
          const now = Date.now();
          const id = typeof entry.id === "string" && entry.id ? entry.id : nextId(sessionId);
          const item: TodoItem = {
            id,
            content,
            ...(typeof entry.activeForm === "string" ? { activeForm: entry.activeForm } : {}),
            status: coerceStatus(entry.status) ?? "pending",
            priority: coercePriority(entry.priority) ?? "medium",
            createdAt: now,
            updatedAt: now,
          };
          todos.push(item);
        }
        const saved = write(todos);
        return { ...snapshot(), message: `Task list replaced (${saved.length} task${saved.length === 1 ? "" : "s"})` };
      }

      const action = v.action as string | undefined;

      switch (action) {
        case "create": {
          const content = v.content as string | undefined;
          if (!content || typeof content !== "string") {
            return { error: "content is required for create action" };
          }
          const now = Date.now();
          const item: TodoItem = {
            id: nextId(sessionId),
            content,
            ...(typeof v.activeForm === "string" ? { activeForm: v.activeForm } : {}),
            status: "pending",
            priority: coercePriority(v.priority) ?? "medium",
            createdAt: now,
            updatedAt: now,
          };
          const saved = write([...store.list(sessionId), item]);
          const todo = saved.find((t) => t.id === item.id) ?? item;
          return { ...snapshot(), todo, message: `Task #${item.id} created` };
        }

        case "list": {
          return snapshot();
        }

        case "update": {
          const id = v.id as string | undefined;
          if (!id) return { error: "id is required for update action" };
          const current = store.list(sessionId);
          const item = current.find((t) => t.id === id);
          if (!item) return { error: `Task #${id} not found` };
          const newPriority = coercePriority(v.priority);
          const newStatus = coerceStatus(v.status);
          const next: TodoItem = {
            ...item,
            ...(typeof v.content === "string" ? { content: v.content } : {}),
            ...(typeof v.activeForm === "string" ? { activeForm: v.activeForm } : {}),
            ...(newPriority !== undefined ? { priority: newPriority } : {}),
            ...(newStatus !== undefined ? { status: newStatus } : {}),
            updatedAt: Date.now(),
          };
          const saved = write(current.map((t) => (t.id === id ? next : t)));
          const todo = saved.find((t) => t.id === id) ?? next;
          return { ...snapshot(), todo, message: `Task #${id} updated` };
        }

        case "complete": {
          const id = v.id as string | undefined;
          if (!id) return { error: "id is required for complete action" };
          const current = store.list(sessionId);
          const item = current.find((t) => t.id === id);
          if (!item) return { error: `Task #${id} not found` };
          const next: TodoItem = { ...item, status: "completed", updatedAt: Date.now() };
          const saved = write(current.map((t) => (t.id === id ? next : t)));
          const todo = saved.find((t) => t.id === id) ?? next;
          return { ...snapshot(), todo, message: `Task #${id} completed` };
        }

        case "delete": {
          const id = v.id as string | undefined;
          if (!id) return { error: "id is required for delete action" };
          const current = store.list(sessionId);
          if (!current.some((t) => t.id === id)) return { error: `Task #${id} not found` };
          write(current.filter((t) => t.id !== id));
          return { ...snapshot(), message: `Task #${id} deleted` };
        }

        default:
          return { error: `Unknown action: ${action ?? "(none)"}` };
      }
    },
  }).toDefinition();
}
