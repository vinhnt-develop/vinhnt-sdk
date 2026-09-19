
---

## Industry Patterns (Research 2026-09-19)

### 1. Metrics Object Pattern (UNIVERSAL STANDARD)

Every major SDK groups metrics into nested object, NOT flat fields.

```typescript
// WRONG - flat (vinhnt-sdk current)
interface AgentRunResult {
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
}

// CORRECT - nested (OpenAI, Vercel, Mastra, LangChain pattern)
interface AgentRunResult {
  usage?: RunUsage;
}

interface RunUsage {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  totalTokens?: number;
  cost?: number;
  raw?: Record<string, unknown>;
}
```

Source: OpenAI (response.usage), Vercel AI SDK (result.usage), LangChain (usage_metadata), Mastra (span.attributes.usage)

### 2. Error Taxonomy Pattern (Mastra)

```typescript
// Domain + Category + machine-readable ID
class SdkError extends Error {
  readonly code: string;
  readonly domain: ErrorDomain;     // "llm" | "tool" | "kernel"
  readonly category: ErrorCategory; // "user" | "system" | "dependency"
  readonly isRetryable: boolean;
  readonly details?: Record<string, unknown>;

  static isInstance(error: unknown): error is SdkError {
    return error instanceof SdkError;
  }
}
```

Why isInstance() instead of instanceof: Works across module boundaries and different versions.

### 3. Spec Package Pattern (Vercel AI SDK)

```
@ai-sdk/provider       = pure interfaces (LanguageModelV4)
@ai-sdk/provider-utils = shared utilities
ai                     = user-facing functions
@ai-sdk/openai         = provider implementation
```

Rule: Providers depend on spec, not core. Core consumes spec. Clean separation.

### 4. DynamicArgument Pattern (Mastra)

```typescript
// Allow static OR per-request dynamic values
type DynamicArgument<T, TContext = unknown> =
  | T
  | ((ctx: TContext) => T | Promise<T>);

const agent = new Agent({
  instructions: (ctx) => `User is ${ctx.user.name}`, // dynamic
  tools: [weatherTool], // static
});
```

### 5. Discriminated Unions (Anthropic pattern)

```typescript
// EVERY polymorphic type uses type field as discriminator
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string }
  | { type: "thinking"; thinking: string };

// Enables exhaustive pattern matching
function handleBlock(block: ContentBlock) {
  switch (block.type) {
    case "text": return block.text;
    case "tool_use": return block.name;
    // TypeScript ensures all cases handled
  }
}
```

### 6. Mock-First Testing (Vercel AI SDK)

```typescript
// Ship MockLanguageModel with SDK
class MockLanguageModel implements LanguageModel {
  private responses: GenerateResult[];
  constructor(options: { responses: GenerateResult[] }) {
    this.responses = options.responses;
  }
  async doGenerate(): Promise<GenerateResult> {
    return this.responses.shift()!;
  }
}

// Mock at interface boundary, NOT HTTP
const model = new MockLanguageModel({
  responses: [{ text: "Hello", usage: { inputTokens: 10 } }],
});
```

### 7. Provider Registry Pattern (Vercel AI SDK)

```typescript
const registry = createProviderRegistry({
  openai: openaiProvider,
  anthropic: anthropicProvider,
});

// String-or-model pattern
const model = registry.languageModel("openai:gpt-4o");
// OR
const model = registry.languageModel(myCustomModel);
```

### 8. Two-Tier Config (OpenAI Agents SDK)

```typescript
// Global config (RunConfig) + Per-agent config (Agent)
interface RunConfig {
  model?: string | LanguageModel;
  maxSteps?: number;
  telemetry?: TelemetryConfig;
}

interface AgentConfig {
  model?: string | LanguageModel;  // overrides RunConfig
  tools?: Tool[];
}
```

### 9. Opt-in Telemetry (Vercel AI SDK)

```typescript
// Default: no-op (zero cost)
registerTelemetry(new OpenTelemetryExporter());

// Per-call override
const result = await generateText({
  model,
  telemetry: { isEnabled: true, recordInputs: true },
});
```

### 10. Handoff Pattern (OpenAI Agents SDK)

```typescript
// Agents decide when to delegate (LLM-discovered tools)
const triage = new Agent({
  handoffs: [billingAgent, refundAgent],
  // LLM sees: transfer_to_billing, transfer_to_refunds as tools
});

// input_filter reduces context bloat
handoff(billingAgent, {
  inputFilter: (messages) => messages.slice(-5),
});
```

### 11. ToolMiddleware Pattern (Phase 6 — Extensibility)

```typescript
// Intercept tool execution for logging, validation, transformation
interface ToolMiddleware {
  name: string;
  before?: (ctx: ToolContext, toolCall: ToolCall) => Promise<ToolCall | null>;
  after?: (ctx: ToolContext, result: ToolResult) => Promise<ToolResult>;
  error?: (ctx: ToolContext, error: SdkError) => Promise<SdkError>;
}

// Chain middlewares
const middlewares = [loggingMiddleware, validationMiddleware, metricsMiddleware];

// Usage in step executor
for (const mw of middlewares) {
  if (mw.before) toolCall = await mw.before(ctx, toolCall);
}
const result = await executeTool(toolCall);
for (const mw of middlewares) {
  if (mw.after) result = await mw.after(ctx, result);
}
```

### 12. TelemetryProvider Pattern (Phase 7 — Observability)

```typescript
// Opt-in telemetry with zero cost by default
interface TelemetryProvider {
  isEnabled: boolean;
  onSpanStart(span: Span): void;
  onSpanEnd(span: Span): void;
  onTokenUsage(usage: RunUsage): void;
}

// Default: no-op
const noopTelemetry: TelemetryProvider = {
  isEnabled: false,
  onSpanStart: () => {},
  onSpanEnd: () => {},
  onTokenUsage: () => {},
};

// OTel-compatible export
interface TracingExporter {
  export(spans: Span[]): Promise<void>;
}
```

### 13. TestUtils Package Pattern (Phase 8 — Testing)

```typescript
// @vinhnt-sdk/test-utils — shipped with SDK
export { MockLanguageModel } from "./mocks/mock-language-model.js";
export { MockToolRegistry } from "./mocks/mock-tool-registry.js";
export { createTestAgent } from "./helpers/create-test-agent.js";
export { expectType } from "./helpers/type-assertions.js";

// Mock at interface boundary, NOT HTTP
const model = new MockLanguageModel({
  responses: [
    { text: "Hello", usage: { inputTokens: 10, outputTokens: 5 } },
    { text: "How can I help?", usage: { inputTokens: 15, outputTokens: 8 } },
  ],
});

// Type-level tests
expectType<ModelProvider>(mockProvider); // compile-time check
```

---

## Checklist: Pre-Refactor Review

```
TYPE SYSTEM:
[ ] Are metrics grouped in nested usage object?
[ ] Are polymorphic types discriminated unions?
[ ] Do interfaces have metadata?: Record<string, unknown>?
[ ] Is there a spec package for provider contracts?
[ ] Is DynamicArgument<T> used for configurable values?

ERROR HANDLING:
[ ] Does every error have isInstance() static method?
[ ] Is error taxonomy (domain + category) defined?
[ ] Is isRetryable set on API errors?
[ ] Are error handlers available for graceful degradation?

TOKEN/USAGE:
[ ] Is usage nested (not flat)?
[ ] Is there addUsage() for multi-step aggregation?
[ ] Is raw?: Record<string, unknown> for provider data?

AGENT LOOP:
[ ] Is core loop under 30 lines?
[ ] Is there a prepareStep callback?
[ ] Are stop conditions configurable?

CONFIGURATION:
[ ] Is config split into RunConfig + AgentConfig?
[ ] Is there a DynamicArgument<T> pattern?
[ ] Is there a provider registry?

EXTENSIBILITY:
[ ] Is ToolMiddleware available for tool execution interception?
[ ] Are plugin hooks typed with before/after pattern?
[ ] Are extension points using open unions with (string & {})?

OBSERVABILITY:
[ ] Is TelemetryProvider opt-in with zero cost default?
[ ] Is tracing OTel-compatible with span hierarchy?
[ ] Can telemetry be overridden per-call?

TESTING:
[ ] Is MockLanguageModel shipped with SDK?
[ ] Are there type-level tests?
[ ] Is coverage above 80%?
[ ] Are mocks at interface boundary (not HTTP)?
```

---

## 8-Phase Refactor Summary

| Phase | Focus | Key Changes | Status |
|-------|-------|-------------|--------|
| Phase 1 | Type System Overhaul | RunUsage nested, provider-spec package, DynamicArgument | ✅ Completed |
| Phase 2 | Error Handling Overhaul | domain, category, isInstance(), isRetryable | ✅ Completed |
| Phase 3 | Token/Usage System | Integrated with Phase 1, addUsage(), raw? | ✅ Completed |
| Phase 4 | Agent Loop Refactor | prepareStep callback, configurable stop conditions | ✅ Completed |
| Phase 5 | Configuration Overhaul | RunConfig + AgentConfig, provider registry | ✅ Completed |
| Phase 6 | Extensibility | ToolMiddleware, typed plugin hooks | ✅ Completed |
| Phase 7 | Observability | TelemetryProvider, OTel-compatible tracing | ✅ Completed |
| Phase 8 | Testing | @vinhnt-sdk/test-utils, MockLanguageModel | ✅ Completed |