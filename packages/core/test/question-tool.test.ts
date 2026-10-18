import { describe, it, expect } from "vitest";
import { createQuestionTool } from "@vinhnt-sdk/tools";
import type { QuestionRequest, QuestionReply } from "@vinhnt-sdk/tools";

const ctx = {} as never;

describe("createQuestionTool", () => {
  it("returns a tool with correct id and risk", () => {
    const tool = createQuestionTool();
    expect(tool.id).toBe("question");
    expect(tool.risk).toBe("external");
  });

  it("calls handler with the parsed request and returns the formatted answer", async () => {
    const tool = createQuestionTool(async (request: QuestionRequest): Promise<QuestionReply> => {
      expect(request.questions).toHaveLength(1);
      expect(request.questions[0]?.header).toBe("Preferences");
      expect(request.questions[0]?.question).toBe("Which color?");
      expect(request.questions[0]?.options).toEqual([{ label: "Red" }, { label: "Blue" }]);
      expect(request.allowCustom).toBe(true);
      return { action: "accept", answers: [{ header: "Preferences", selected: ["Blue"] }] };
    });
    const result = (await tool.execute(
      {
        header: "Preferences",
        question: "Which color?",
        options: [{ label: "Red" }, { label: "Blue" }],
      },
      ctx,
    )) as { action: string; answer: string };
    expect(result.action).toBe("accept");
    expect(result.answer).toBe("Preferences: Blue");
  });

  it("returns a cancel result when no handler and no ctx.askQuestion", async () => {
    const tool = createQuestionTool();
    const result = (await tool.execute(
      { header: "Hi", question: "Test?" },
      ctx,
    )) as { action: string; error?: string };
    expect(result.action).toBe("cancel");
    expect(result.error).toBe("No question handler configured");
  });

  it("uses ctx.askQuestion when no handler is injected", async () => {
    const tool = createQuestionTool();
    const askQuestion = async (input: { questions: readonly unknown[] }): Promise<QuestionReply> => {
      expect(input.questions).toHaveLength(1);
      return { action: "accept", answers: [{ header: "Feedback", selected: [], text: "Great" }] };
    };
    const result = (await tool.execute(
      { header: "Feedback", question: "Your thoughts?" },
      { askQuestion } as never,
    )) as { action: string; answer: string };
    expect(result.action).toBe("accept");
    expect(result.answer).toBe("Feedback: Great");
  });

  it("supports the batch form and formats all answers", async () => {
    const tool = createQuestionTool({
      handler: async (): Promise<QuestionReply> => ({
        action: "accept",
        answers: [
          { header: "A", selected: ["one", "two"] },
          { header: "B", selected: [], text: "typed" },
        ],
      }),
    });
    const result = (await tool.execute(
      {
        questions: [
          { header: "A", question: "First?", multiple: true, options: [{ label: "one" }, { label: "two" }] },
          { header: "B", question: "Second?" },
        ],
      },
      ctx,
    )) as { action: string; answer: string };
    expect(result.action).toBe("accept");
    expect(result.answer).toBe("A: one, two\nB: typed");
  });

  it("reports decline and cancel without answers", async () => {
    const tool = createQuestionTool({ handler: async () => ({ action: "decline" }) });
    const result = (await tool.execute({ header: "H", question: "Q?" }, ctx)) as { answer: string };
    expect(result.answer).toBe("User declined to answer.");

    const tool2 = createQuestionTool({ handler: async () => ({ action: "cancel" }) });
    const result2 = (await tool2.execute({ header: "H", question: "Q?" }, ctx)) as { answer: string };
    expect(result2.answer).toBe("Question cancelled.");
  });

  it("returns an error when neither header/question nor questions are provided", async () => {
    const tool = createQuestionTool({ handler: async () => ({ action: "accept" }) });
    const result = (await tool.execute({}, ctx)) as { error?: string };
    expect(result.error).toContain("At least one question");
  });

  it("returns an error for malformed input (empty header)", async () => {
    const tool = createQuestionTool({ handler: async () => ({ action: "accept" }) });
    const result = (await tool.execute({ header: "", question: "test" }, ctx)) as { error?: string };
    expect(result.error).toBeTruthy();
  });
});
