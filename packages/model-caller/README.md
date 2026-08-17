# @vinhnt-sdk/model-caller

Model caller kernel primitive for VNT Agent.

Builds `ModelRequest`s (with OpenAI-generation passthrough fields), executes
non-streaming or streaming generation through a `ModelProvider`, accounts input/
output tokens (locally via `countTokens` when the provider doesn't report usage),
calculates cost from `ModelPricing`, and emits `token.counted` / `model.cost` /
`thinking.*` / `token.streamed` run events.

```typescript
import { ModelCaller } from "@vinhnt-sdk/model-caller";

const caller = new ModelCaller({
  defaultModel: provider,
  modelRegistry: registry,
  maxTokens: 8192,
  thinkingBudget: 0,
  thinkingPrompt: "",
  emitEvent: async (event) => {},
  modelForRun: () => provider,
  setModelForRun: () => {},
  getAvailableTools: () => [],
});
```

## Features

- `resolveAgentModel` / `getActiveModel` / `setDefaultModel` — model resolution with per-run overrides.
- `callModelStream` — non-streaming (`generate`) + streaming (`stream`) paths, token/cost accounting, `onChatParams` / `onBeforeModelCall` / `onAfterModelCall` / `onTokenStreamed` hooks.
- `doThinkingStep` — thinking pass that feeds prior thinking back into messages.
- Depends only on `@vinhnt-sdk/schema` and `@vinhnt-sdk/tools` types; hooks/logging are structural (minimal interfaces), so hosts plug in their own `PluginManager`/`Logger`.