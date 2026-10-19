import { describe, it, expect } from "vitest";
import { createElicitTool } from "@vinhnt-sdk/tools";
import type { ElicitationRequest, ElicitationReply } from "@vinhnt-sdk/tools";

const ctx = {} as never;

const schema = {
  type: "object" as const,
  properties: {
    name: { type: "string" as const, title: "Name" },
    count: { type: "integer" as const },
    confirmed: { type: "boolean" as const },
  },
  required: ["name"],
};

describe("createElicitTool", () => {
  it("returns a tool with correct id and risk", () => {
    const tool = createElicitTool();
    expect(tool.id).toBe("elicit");
    expect(tool.risk).toBe("external");
  });

  it("calls handler with the parsed request and returns the formatted answer", async () => {
    const tool = createElicitTool(async (request: ElicitationRequest): Promise<ElicitationReply> => {
      expect(request.message).toBe("Provide details");
      expect(request.mode).toBe("form");
      expect(request.requestedSchema?.properties).toHaveProperty("name");
      return { action: "accept", content: { name: "Ada", count: 3, confirmed: true } };
    });
    const result = (await tool.execute(
      { message: "Provide details", requestedSchema: schema },
      ctx,
    )) as { action: string; content?: Record<string, unknown>; answer: string };
    expect(result.action).toBe("accept");
    expect(result.content).toEqual({ name: "Ada", count: 3, confirmed: true });
    expect(result.answer).toBe("name: Ada\ncount: 3\nconfirmed: true");
  });

  it("returns a cancel result when no handler and no ctx.askElicitation", async () => {
    const tool = createElicitTool();
    const result = (await tool.execute(
      { message: "Hi", requestedSchema: schema },
      ctx,
    )) as { action: string; error?: string };
    expect(result.action).toBe("cancel");
    expect(result.error).toBe("No elicitation handler configured");
  });

  it("uses ctx.askElicitation when no handler is injected", async () => {
    const tool = createElicitTool();
    const askElicitation = async (input: { message: string }): Promise<ElicitationReply> => {
      expect(input.message).toBe("Your thoughts?");
      return { action: "accept", content: { name: "Grace" } };
    };
    const result = (await tool.execute(
      { message: "Your thoughts?", requestedSchema: schema },
      { askElicitation } as never,
    )) as { action: string; answer: string };
    expect(result.action).toBe("accept");
    expect(result.answer).toBe("name: Grace");
  });

  it("supports url mode", async () => {
    const tool = createElicitTool(async (request: ElicitationRequest): Promise<ElicitationReply> => {
      expect(request.mode).toBe("url");
      expect(request.url).toBe("https://example.com/consent");
      return { action: "accept" };
    });
    const result = (await tool.execute(
      { message: "Open the link", mode: "url", url: "https://example.com/consent" },
      ctx,
    )) as { action: string; answer: string };
    expect(result.action).toBe("accept");
    expect(result.answer).toBe("User accepted but provided no values.");
  });

  it("reports decline and cancel without content", async () => {
    const tool = createElicitTool({ handler: async () => ({ action: "decline" }) });
    const result = (await tool.execute({ message: "M", requestedSchema: schema }, ctx)) as { answer: string };
    expect(result.answer).toBe("User declined the request.");

    const tool2 = createElicitTool({ handler: async () => ({ action: "cancel" }) });
    const result2 = (await tool2.execute({ message: "M", requestedSchema: schema }, ctx)) as { answer: string };
    expect(result2.answer).toBe("Elicitation cancelled.");
  });

  it("returns an error when form mode has no requestedSchema", async () => {
    const tool = createElicitTool({ handler: async () => ({ action: "accept" }) });
    const result = (await tool.execute({ message: "M" }, ctx)) as { error?: string };
    expect(result.error).toContain("requestedSchema");
  });

  it("returns an error when url mode has no url", async () => {
    const tool = createElicitTool({ handler: async () => ({ action: "accept" }) });
    const result = (await tool.execute({ message: "M", mode: "url" }, ctx)) as { error?: string };
    expect(result.error).toContain("url");
  });

  it("returns an error for malformed input (empty message)", async () => {
    const tool = createElicitTool({ handler: async () => ({ action: "accept" }) });
    const result = (await tool.execute({ message: "", requestedSchema: schema }, ctx)) as { error?: string };
    expect(result.error).toBeTruthy();
  });
});
