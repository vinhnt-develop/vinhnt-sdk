import type { ContextSourceValue, ContextSourceKey } from "../types.js";
import { selectPrompt, type PromptRegistry } from "./index.js";

export function createSystemPromptSource(
  getModelId: () => string | undefined,
  registry?: PromptRegistry,
): ContextSourceValue<string> {
  const select = (modelId?: string) =>
    registry ? registry.selectPrompt(modelId) : selectPrompt(modelId);

  return {
    key: "core.system-prompt" as ContextSourceKey,
    priority: 0,
    async load() {
      const modelId = getModelId();
      return select(modelId);
    },
    renderBaseline(value) {
      return value;
    },
    renderUpdate() {
      return null;
    },
    renderRemoval() {
      return "";
    },
  };
}
