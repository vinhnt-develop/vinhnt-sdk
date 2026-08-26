import { describe, expect, it } from "vitest";
import { TokenMeter } from "../src/token-meter.js";

describe("TokenMeter", () => {
  const meter = new TokenMeter();

  describe("estimateText", () => {
    it("estimates tokens for empty string", () => {
      expect(meter.estimateText("")).toBe(0);
    });

    it("estimates tokens using chars/4 heuristic", () => {
      // "Hello world" = 11 chars → ceil(11/4) = 3
      expect(meter.estimateText("Hello world")).toBe(3);
    });

    it("estimates tokens for long text", () => {
      const text = "a".repeat(100);
      expect(meter.estimateText(text)).toBe(25);
    });
  });

  describe("estimateMessage", () => {
    it("estimates tokens for a string content message", () => {
      const tokens = meter.estimateMessage({ role: "user", content: "Hi" });
      // "Hi" = 2 chars → ceil(2/4) = 1 content token + 4 role overhead = 5
      expect(tokens).toBe(5);
    });

    it("includes role overhead", () => {
      const short = meter.estimateMessage({ role: "user", content: "a" });
      const long = meter.estimateMessage({ role: "user", content: "abcd" });
      // "a" → ceil(1/4)=1 + 4=5, "abcd" → ceil(4/4)=1 + 4=5 — same because of ceiling
      expect(short).toBe(5);
      expect(long).toBe(5);
    });

    it("estimates tokens for array content (serialized as JSON)", () => {
      const content = [{ type: "text" as const, text: "Hi" }];
      const tokens = meter.estimateMessage({ role: "user", content });
      const jsonLen = JSON.stringify(content).length;
      const expectedContentTokens = Math.ceil(jsonLen / 4);
      expect(tokens).toBe(4 + expectedContentTokens);
    });

    it("handles content with special characters", () => {
      const content = "Line1\nLine2\tTab";
      const tokens = meter.estimateMessage({ role: "assistant", content });
      expect(tokens).toBe(4 + Math.ceil(content.length / 4));
    });
  });

  describe("estimateRequest", () => {
    it("estimates tokens for a simple conversation", () => {
      const messages = [
        { role: "system", content: "You are helpful" },
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello" },
      ];
      const tokens = meter.estimateRequest(messages);
      let expected = 0;
      for (const msg of messages) {
        expected += 4 + Math.ceil(msg.content.length / 4);
      }
      expect(tokens).toBe(expected);
    });

    it("adds tool definition overhead", () => {
      const messages = [{ role: "user", content: "Hi" }];
      const tools = [
        { type: "function" as const, function: { name: "get_weather", description: "Get weather" } },
      ];
      const withTools = meter.estimateRequest(messages, tools);
      const withoutTools = meter.estimateRequest(messages);
      expect(withTools).toBeGreaterThan(withoutTools);
    });

    it("scales with number of tool definitions", () => {
      const messages = [{ role: "user", content: "Hi" }];
      const tool1 = [{ type: "function" as const, function: { name: "a", description: "a" } }];
      const tool2 = [
        { type: "function" as const, function: { name: "a", description: "a" } },
        { type: "function" as const, function: { name: "b", description: "b" } },
      ];
      expect(meter.estimateRequest(messages, tool2)).toBeGreaterThan(meter.estimateRequest(messages, tool1));
    });

    it("handles empty messages array", () => {
      expect(meter.estimateRequest([])).toBe(0);
    });
  });

  describe("measurePressure", () => {
    it("returns 0 when no tokens used", () => {
      expect(meter.measurePressure({ promptTokens: 0, completionTokens: 0 }, 1000)).toBe(0);
    });

    it("returns ratio of input to context limit", () => {
      expect(meter.measurePressure({ promptTokens: 500, completionTokens: 0 }, 1000)).toBe(0.5);
    });

    it("caps at 1 when usage exceeds limit", () => {
      expect(meter.measurePressure({ promptTokens: 2000, completionTokens: 0 }, 1000)).toBe(1);
    });

    it("prefers promptTokens over inputTokens alias", () => {
      // promptTokens is 0 (not null/undefined), so ?? returns 0, ignoring inputTokens
      expect(meter.measurePressure({ promptTokens: 0, completionTokens: 0, inputTokens: 500 }, 1000)).toBe(0);
    });
  });

  describe("projectNextRequest", () => {
    it("projects with default 10% growth", () => {
      expect(meter.projectNextRequest({ promptTokens: 1000, completionTokens: 100 })).toBe(1100);
    });

    it("projects with custom growth rate", () => {
      expect(meter.projectNextRequest({ promptTokens: 1000, completionTokens: 100 }, 0.25)).toBe(1250);
    });

    it("prefers promptTokens over inputTokens alias", () => {
      expect(meter.projectNextRequest({ promptTokens: 0, completionTokens: 0, inputTokens: 500 }, 0.1)).toBe(0);
    });
  });
});
