import { describe, it, expect, vi } from "vitest";
import { createTodoWriteTool, InMemoryTodoStore, type TodoUpdate } from "@vinhnt-sdk/tools";

const ctx = (sessionId: string, runId = "run_1") => ({ sessionId, runId }) as never;

describe("createTodoWriteTool — whole-list + store", () => {
  it("replaces the list and returns a full snapshot in insertion order", async () => {
    const tool = createTodoWriteTool();
    await tool.execute({ todos: [
      { content: "First", status: "completed" },
      { content: "Second", status: "in_progress", activeForm: "Doing Second" },
      { content: "Third", status: "pending" },
    ] }, ctx("s1")) as { todos: unknown[] };

    const result = (await tool.execute({ todos: [
      { content: "First", status: "completed" },
      { content: "Second", status: "in_progress", activeForm: "Doing Second" },
      { content: "Third", status: "pending" },
    ] }, ctx("s1"))) as { todos: { content: string; activeForm?: string }[]; summary: { total: number; inProgress: number; completed: number } };

    expect(result.todos.map((t) => t.content)).toEqual(["First", "Second", "Third"]);
    expect(result.todos[1]?.activeForm).toBe("Doing Second");
    expect(result.summary).toMatchObject({ total: 3, inProgress: 1, completed: 1 });
  });

  it("enforces a single in_progress item by default", async () => {
    const tool = createTodoWriteTool();
    const result = (await tool.execute({ todos: [
      { content: "A", status: "in_progress" },
      { content: "B", status: "in_progress" },
    ] }, ctx("s1"))) as { todos: { status: string }[] };
    expect(result.todos.filter((t) => t.status === "in_progress")).toHaveLength(1);
  });

  it("allows parallel in_progress when configured", async () => {
    const tool = createTodoWriteTool({ allowParallelInProgress: true });
    const result = (await tool.execute({ todos: [
      { content: "A", status: "in_progress" },
      { content: "B", status: "in_progress" },
    ] }, ctx("s1"))) as { todos: { status: string }[] };
    expect(result.todos.filter((t) => t.status === "in_progress")).toHaveLength(2);
  });

  it("emits an onUpdate snapshot with sessionId + runId", async () => {
    const onUpdate = vi.fn<(u: TodoUpdate) => void>();
    const tool = createTodoWriteTool({ onUpdate });
    await tool.execute({ todos: [{ content: "A", status: "pending" }] }, ctx("s1", "run_42")) as never;
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const update = onUpdate.mock.calls[0]?.[0];
    expect(update).toMatchObject({ sessionId: "s1", runId: "run_42" });
    expect(update?.todos).toHaveLength(1);
  });

  it("isolates task lists per session", async () => {
    const tool = createTodoWriteTool();
    await tool.execute({ todos: [{ content: "only-s1", status: "pending" }] }, ctx("s1")) as never;
    const other = (await tool.execute({ action: "list" }, ctx("s2"))) as { todos: unknown[] };
    expect(other.todos).toEqual([]);
  });

  it("shares an injected store across tool instances", async () => {
    const store = new InMemoryTodoStore();
    const toolA = createTodoWriteTool({ store });
    const toolB = createTodoWriteTool({ store });
    await toolA.execute({ todos: [{ content: "shared", status: "pending" }] }, ctx("s1")) as never;
    const result = (await toolB.execute({ action: "list" }, ctx("s1"))) as { todos: { content: string }[] };
    expect(result.todos.map((t) => t.content)).toEqual(["shared"]);
  });
});
