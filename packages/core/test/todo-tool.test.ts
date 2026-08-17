import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createTodoWriteTool } from "@vinhnt-sdk/core";

const tool = createTodoWriteTool();

beforeEach(async () => {
  await tool.execute({ action: "list" });
});

async function cleanup() {
  const list = await tool.execute({ action: "list" }) as { todos: { id: string }[] };
  for (const t of list.todos) {
    await tool.execute({ action: "delete", id: t.id });
  }
}

describe("createTodoWriteTool", () => {
  beforeEach(cleanup);
  afterAll(cleanup);

  describe("create", () => {
    it("creates a task", async () => {
      const result = await tool.execute({ action: "create", content: "Test task" }) as any;
      expect(result.todo).toBeDefined();
      expect(result.todo.content).toBe("Test task");
      expect(result.todo.status).toBe("pending");
      expect(result.todo.priority).toBe("medium");
    });

    it("returns error when content is missing", async () => {
      const result = await tool.execute({ action: "create" }) as any;
      expect(result.error).toContain("content is required");
    });

    it("accepts custom priority", async () => {
      const result = await tool.execute({ action: "create", content: "High priority", priority: "high" }) as any;
      expect(result.todo.priority).toBe("high");
    });
  });

  describe("list", () => {
    it("returns empty list initially", async () => {
      const result = await tool.execute({ action: "list" }) as any;
      expect(result.todos).toEqual([]);
      expect(result.summary.total).toBe(0);
    });

    it("returns created tasks", async () => {
      await tool.execute({ action: "create", content: "Task 1" });
      await tool.execute({ action: "create", content: "Task 2" });
      const result = await tool.execute({ action: "list" }) as any;
      expect(result.todos).toHaveLength(2);
      expect(result.summary.total).toBe(2);
    });
  });

  describe("complete", () => {
    it("marks a task as completed", async () => {
      const created = await tool.execute({ action: "create", content: "Do this" }) as any;
      const result = await tool.execute({ action: "complete", id: created.todo.id }) as any;
      expect(result.todo.status).toBe("completed");
    });

    it("returns error for unknown id", async () => {
      const result = await tool.execute({ action: "complete", id: "999" }) as any;
      expect(result.error).toContain("not found");
    });
  });

  describe("update", () => {
    it("updates task fields", async () => {
      const created = await tool.execute({ action: "create", content: "Original" }) as any;
      const result = await tool.execute({ action: "update", id: created.todo.id, content: "Updated", priority: "high", status: "in_progress" }) as any;
      expect(result.todo.content).toBe("Updated");
      expect(result.todo.priority).toBe("high");
      expect(result.todo.status).toBe("in_progress");
    });

    it("returns error for unknown id", async () => {
      const result = await tool.execute({ action: "update", id: "999", content: "x" }) as any;
      expect(result.error).toContain("not found");
    });
  });

  describe("delete", () => {
    it("deletes a task", async () => {
      const created = await tool.execute({ action: "create", content: "Delete me" }) as any;
      const result = await tool.execute({ action: "delete", id: created.todo.id }) as any;
      expect(result.message).toContain("deleted");
      const list = await tool.execute({ action: "list" }) as any;
      expect(list.todos).toHaveLength(0);
    });

    it("returns error for unknown id", async () => {
      const result = await tool.execute({ action: "delete", id: "999" }) as any;
      expect(result.error).toContain("not found");
    });
  });

  describe("unknown action", () => {
    it("returns error", async () => {
      const result = await tool.execute({ action: "unknown" }) as any;
      expect(result.error).toContain("Unknown action");
    });
  });
});
