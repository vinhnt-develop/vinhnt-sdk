import { z } from "zod";
import { defineTool } from "@vinhnt-sdk/tools";

interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "high" | "medium" | "low";
  createdAt: number;
  updatedAt: number;
}

const store = new Map<string, TodoItem>();
let nextId = 1;

/** Create the `todowrite` tool managing a structured task list with priorities and status. */
export function createTodoWriteTool() {
  // The todo tool intentionally keeps loose runtime validation (returns
  // `{ error }` results instead of throwing), so its schema is untyped and
  // validation happens inside execute below.
  return defineTool<unknown, unknown>({
    name: "todowrite",
    description: "Manage a structured task list with priorities and status. Use this to track progress, organize multi-step work, and surface status to the user. Actions: create, list, update, complete, delete.",
    risk: "read",
    input: z.unknown(),
    jsonSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "list", "update", "complete", "delete"],
          description: "Action to perform on the task list",
        },
        id: {
          type: "string",
          description: "Task ID (required for update, complete, delete)",
        },
        content: {
          type: "string",
          description: "Task description (required for create, optional for update)",
        },
        priority: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "Task priority (default: medium)",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "cancelled"],
          description: "Task status (used with update action)",
        },
      },
      required: ["action"],
    },
    async execute(raw) {
      const v = raw as Record<string, unknown>;
      const action = v.action as string;

      switch (action) {
        case "create": {
          const content = v.content as string | undefined;
          if (!content || typeof content !== "string") {
            return { error: "content is required for create action" };
          }
          const id = String(nextId++);
          const item: TodoItem = {
            id,
            content,
            status: "pending",
            priority: (v.priority as TodoItem["priority"]) ?? "medium",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          store.set(id, item);
          return { todo: item, message: `Task #${id} created` };
        }

        case "list": {
          const items = [...store.values()].sort((a, b) => b.createdAt - a.createdAt);
          return {
            todos: items,
            summary: {
              total: items.length,
              pending: items.filter((t) => t.status === "pending").length,
              inProgress: items.filter((t) => t.status === "in_progress").length,
              completed: items.filter((t) => t.status === "completed").length,
            },
          };
        }

        case "update": {
          const id = v.id as string | undefined;
          if (!id) return { error: "id is required for update action" };
          const item = store.get(id);
          if (!item) return { error: `Task #${id} not found` };
          if (v.content !== undefined && typeof v.content === "string") {
            item.content = v.content;
          }
          if (v.priority !== undefined && typeof v.priority === "string") {
            item.priority = v.priority as TodoItem["priority"];
          }
          if (v.status !== undefined && typeof v.status === "string") {
            item.status = v.status as TodoItem["status"];
          }
          item.updatedAt = Date.now();
          return { todo: item, message: `Task #${id} updated` };
        }

        case "complete": {
          const id = v.id as string | undefined;
          if (!id) return { error: "id is required for complete action" };
          const item = store.get(id);
          if (!item) return { error: `Task #${id} not found` };
          item.status = "completed";
          item.updatedAt = Date.now();
          return { todo: item, message: `Task #${id} completed` };
        }

        case "delete": {
          const id = v.id as string | undefined;
          if (!id) return { error: "id is required for delete action" };
          if (!store.has(id)) return { error: `Task #${id} not found` };
          store.delete(id);
          return { message: `Task #${id} deleted` };
        }

        default:
          return { error: `Unknown action: ${action}` };
      }
    },
  }).toDefinition();
}
