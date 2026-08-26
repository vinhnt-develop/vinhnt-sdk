import type { ContextSourceValue, ContextSourceKey } from "../types.js";
import { selectPrompt } from "./index.js";

export function createSystemPromptSource(
  getModelId: () => string | undefined,
): ContextSourceValue<string> {
  return {
    key: "core.system-prompt" as ContextSourceKey,
    priority: 0,
    async load() {
      const modelId = getModelId();
      return selectPrompt(modelId);
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
