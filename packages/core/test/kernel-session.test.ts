import { describe, it, expect, vi } from "vitest";
import { computeSessionUpdates, updateSessionOnComplete } from "../src/kernel/kernel-session.js";
import type { ModelCaller, ModelProvider } from "@vinhnt-sdk/llm";
import type { SessionStore } from "@vinhnt-sdk/session";
import type { RunId } from "@vinhnt-sdk/schema";

function createMockModelCaller(model?: ModelProvider): ModelCaller {
  return {
    getActiveModel: vi.fn((runId: RunId) => model),
    getDefaultModel: vi.fn(() => model),
    calculateCost: vi.fn(() => undefined),
    resolveAgentModel: vi.fn(),
  } as unknown as ModelCaller;
}

function createMockSessionStore(): SessionStore {
  return {
    updateSession: vi.fn().mockResolvedValue(undefined),
  } as unknown as SessionStore;
}

describe("kernel-session", () => {
  const runId = "run-123" as RunId;
  const sessionId = "session-123";

  describe("computeSessionUpdates", () => {
    it("includes model when model is non-empty", () => {
      const modelCaller = createMockModelCaller({ provider: "test", model: "gpt-4o", contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, pricing: undefined });
      const updates = computeSessionUpdates(
        { modelCaller } as any,
        runId,
        100,
        50,
      );
      expect(updates.model).toBe("gpt-4o");
    });

    it("excludes model when model is empty string", () => {
      const modelCaller = createMockModelCaller({ provider: "test", model: "", contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, pricing: undefined });
      const updates = computeSessionUpdates(
        { modelCaller } as any,
        runId,
        100,
        50,
      );
      expect(updates.model).toBeUndefined();
    });

    it("excludes model when getActiveModel returns null", () => {
      const modelCaller = createMockModelCaller(null);
      const updates = computeSessionUpdates(
        { modelCaller } as any,
        runId,
        100,
        50,
      );
      expect(updates.model).toBeUndefined();
    });

    it("includes inputTokens when > 0", () => {
      const modelCaller = createMockModelCaller({ provider: "test", model: "gpt-4o", contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, pricing: undefined });
      const updates = computeSessionUpdates(
        { modelCaller } as any,
        runId,
        100,
        0,
      );
      expect(updates.inputTokens).toBe(100);
      expect(updates.outputTokens).toBeUndefined();
    });

    it("includes outputTokens when > 0", () => {
      const modelCaller = createMockModelCaller({ provider: "test", model: "gpt-4o", contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, pricing: undefined });
      const updates = computeSessionUpdates(
        { modelCaller } as any,
        runId,
        0,
        50,
      );
      expect(updates.outputTokens).toBe(50);
      expect(updates.inputTokens).toBeUndefined();
    });

    it("includes cost when calculateCost returns a value", () => {
      const modelCaller = createMockModelCaller({ provider: "test", model: "gpt-4o", contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, pricing: undefined });
      (modelCaller.calculateCost as any).mockReturnValue(0.005);
      const updates = computeSessionUpdates(
        { modelCaller } as any,
        runId,
        100,
        50,
      );
      expect(updates.cost).toBe(0.005);
    });

    it("handles whitespace-only model as empty", () => {
      const modelCaller = createMockModelCaller({ provider: "test", model: "   ", contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, pricing: undefined });
      const updates = computeSessionUpdates(
        { modelCaller } as any,
        runId,
        100,
        50,
      );
      expect(updates.model).toBeUndefined();
    });
  });

  describe("updateSessionOnComplete", () => {
    it("calls sessionStore.updateSession with correct data", async () => {
      const sessionStore = createMockSessionStore();
      const modelCaller = createMockModelCaller({ provider: "test", model: "gpt-4o", contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, pricing: undefined });

      await updateSessionOnComplete(
        { modelCaller, sessionStore, noStore: false } as any,
        sessionId,
        runId,
        100,
        50,
      );

      expect(sessionStore.updateSession).toHaveBeenCalledWith(sessionId, expect.objectContaining({
        model: "gpt-4o",
        inputTokens: 100,
        outputTokens: 50,
      }));
    });

    it("does not call updateSession when noStore is true", async () => {
      const sessionStore = createMockSessionStore();
      const modelCaller = createMockModelCaller({ provider: "test", model: "gpt-4o", contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, pricing: undefined });

      await updateSessionOnComplete(
        { modelCaller, sessionStore, noStore: true } as any,
        sessionId,
        runId,
        100,
        50,
      );

      expect(sessionStore.updateSession).not.toHaveBeenCalled();
    });

    it("does not call updateSession when sessionId is undefined", async () => {
      const sessionStore = createMockSessionStore();
      const modelCaller = createMockModelCaller({ provider: "test", model: "gpt-4o", contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, pricing: undefined });

      await updateSessionOnComplete(
        { modelCaller, sessionStore, noStore: false } as any,
        undefined,
        runId,
        100,
        50,
      );

      expect(sessionStore.updateSession).not.toHaveBeenCalled();
    });

    it("does not call updateSession when sessionStore is undefined", async () => {
      const modelCaller = createMockModelCaller({ provider: "test", model: "gpt-4o", contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, pricing: undefined });

      await updateSessionOnComplete(
        { modelCaller, sessionStore: undefined, noStore: false } as any,
        sessionId,
        runId,
        100,
        50,
      );
      // Should not throw
    });

    it("handles empty model gracefully", async () => {
      const sessionStore = createMockSessionStore();
      const modelCaller = createMockModelCaller({ provider: "test", model: "", contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, pricing: undefined });

      await updateSessionOnComplete(
        { modelCaller, sessionStore, noStore: false } as any,
        sessionId,
        runId,
        100,
        50,
      );

      // When model is empty, the model key should not be present in the updates
      expect(sessionStore.updateSession).toHaveBeenCalledWith(sessionId, expect.objectContaining({
        inputTokens: 100,
        outputTokens: 50,
      }));
      // Verify model key is not present
      const callArgs = (sessionStore.updateSession as any).mock.calls[0][1];
      expect(callArgs).not.toHaveProperty("model");
    });

    it("catches and logs errors from sessionStore.updateSession", async () => {
      const sessionStore = {
        updateSession: vi.fn().mockRejectedValue(new Error("DB error")),
      } as unknown as SessionStore;
      const modelCaller = createMockModelCaller({ provider: "test", model: "gpt-4o", contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, pricing: undefined });
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

      await updateSessionOnComplete(
        { modelCaller, sessionStore, noStore: false } as any,
        sessionId,
        runId,
        100,
        50,
      );

      expect(consoleWarn).toHaveBeenCalledWith("[kernel] Session update failed:", expect.any(Error));
      consoleWarn.mockRestore();
    });
  });
});