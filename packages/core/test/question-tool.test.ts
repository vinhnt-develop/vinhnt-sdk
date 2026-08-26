import { describe, it, expect } from "vitest";
import { createQuestionTool } from "@vinhnt-sdk/core";

describe("createQuestionTool", () => {
  it("returns a tool with correct id and risk", () => {
    const tool = createQuestionTool();
    expect(tool.id).toBe("question");
    expect(tool.risk).toBe("external");
  });

  it("calls handler with parsed input and returns answer", async () => {
    const tool = createQuestionTool(async (input) => {
      expect(input.header).toBe("Preferences");
      expect(input.question).toBe("Which color?");
      expect(input.options).toEqual([{ label: "Red" }, { label: "Blue" }]);
      return "Blue";
    });
    const result = await tool.execute(
      {
        header: "Preferences",
        question: "Which color?",
        options: [{ label: "Red" }, { label: "Blue" }],
      },
      {} as never,
    );
    expect(result).toEqual({ answer: "Blue" });
  });

  it("returns error when no handler configured", async () => {
    const tool = createQuestionTool();
    const result = await tool.execute(
      {
        header: "Hi",
        question: "Test?",
      },
      {} as never,
    );
    expect(result).toEqual({ answer: "", error: "No question handler configured" });
  });

  it("accepts custom answer by default", async () => {
    const tool = createQuestionTool(async (input) => {
      return "Custom answer";
    });
    const result = await tool.execute(
      {
        header: "Feedback",
        question: "Your thoughts?",
      },
      {} as never,
    );
    expect(result).toEqual({ answer: "Custom answer" });
  });

  it("passes options to handler", async () => {
    const tool = createQuestionTool(async (input) => {
      expect(input.options).toEqual([{ label: "Option A" }, { label: "Option B" }, { label: "Option C" }]);
      return "Option B";
    });
    const result = await tool.execute(
      {
        header: "Pick",
        question: "Choose one",
        options: [{ label: "Option A" }, { label: "Option B" }, { label: "Option C" }],
      },
      {} as never,
    );
    expect(result).toEqual({ answer: "Option B" });
  });

  it("validates input via QuestionSchema — rejects missing header", async () => {
    const tool = createQuestionTool(async () => "ok");
    await expect(tool.execute({ question: "No header" } as never, {} as never)).rejects.toThrow("question");
  });

  it("validates input via QuestionSchema — rejects missing question", async () => {
    const tool = createQuestionTool(async () => "ok");
    await expect(tool.execute({ header: "No question" } as never, {} as never)).rejects.toThrow("question");
  });

  it("validates input via QuestionSchema — rejects empty header", async () => {
    const tool = createQuestionTool(async () => "ok");
    await expect(tool.execute({ header: "", question: "test" } as never, {} as never)).rejects.toThrow();
  });
});
