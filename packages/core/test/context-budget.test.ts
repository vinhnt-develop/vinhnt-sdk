import { describe, it, expect } from "vitest";
import {
  DEFAULT_CONTEXT_BUDGET,
  deriveContextBudget,
  budgetToCompressorFields,
} from "../src/context/context-budget.js";

describe("ContextBudget", () => {
  describe("DEFAULT_CONTEXT_BUDGET", () => {
    it("has the coordinated defaults", () => {
      expect(DEFAULT_CONTEXT_BUDGET.maxContextTokens).toBe(128_000);
      expect(DEFAULT_CONTEXT_BUDGET.maxToolOutputChars).toBe(500);
      expect(DEFAULT_CONTEXT_BUDGET.maxSubagentOutputChars).toBe(4096);
      expect(DEFAULT_CONTEXT_BUDGET.sanitizeLimitChars).toBe(128_000);
      expect(DEFAULT_CONTEXT_BUDGET.compactionThreshold).toBe(0.75);
    });
  });

  describe("deriveContextBudget", () => {
    it("returns defaults when partial is undefined", () => {
      expect(deriveContextBudget()).toEqual(DEFAULT_CONTEXT_BUDGET);
      expect(deriveContextBudget(undefined)).toEqual(DEFAULT_CONTEXT_BUDGET);
      expect(deriveContextBudget({})).toEqual(DEFAULT_CONTEXT_BUDGET);
    });

    it("applies partial overrides", () => {
      const budget = deriveContextBudget({
        maxContextTokens: 200_000,
        maxToolOutputChars: 1000,
        compactionThreshold: 0.5,
      });
      expect(budget.maxContextTokens).toBe(200_000);
      expect(budget.maxToolOutputChars).toBe(1000);
      expect(budget.compactionThreshold).toBe(0.5);
      // untouched fields fall back to defaults
      expect(budget.maxSubagentOutputChars).toBe(DEFAULT_CONTEXT_BUDGET.maxSubagentOutputChars);
      expect(budget.sanitizeLimitChars).toBe(DEFAULT_CONTEXT_BUDGET.sanitizeLimitChars);
    });
  });

  describe("budgetToCompressorFields", () => {
    it("maps budget → compressor options", () => {
      const fields = budgetToCompressorFields(DEFAULT_CONTEXT_BUDGET);
      expect(fields.maxToolOutputLength).toBe(500);
      // tokenBudget = floor(maxContextTokens * compactionThreshold)
      expect(fields.tokenBudget).toBe(Math.floor(128_000 * 0.75));
      expect(fields.tokenBudget).toBe(96_000);
    });

    it("reflects custom budget values", () => {
      const budget = deriveContextBudget({
        maxContextTokens: 50_000,
        maxToolOutputChars: 300,
        compactionThreshold: 0.8,
      });
      const fields = budgetToCompressorFields(budget);
      expect(fields.maxToolOutputLength).toBe(300);
      expect(fields.tokenBudget).toBe(40_000);
    });
  });
});
