# Coding Standards

> TypeScript coding conventions for vinhnt-sdk

## TypeScript Configuration

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "isolatedModules": true
}
```

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Classes | PascalCase | `AgentKernel`, `ToolRegistry` |
| Interfaces | PascalCase | `ModelProvider`, `EventBus` |
| Functions | camelCase | `defineTool`, `createReadFileTool` |
| Variables | camelCase | `toolRegistry`, `modelProvider` |
| Constants | UPPER_SNAKE_CASE | `DEPRECATION_SYMBOL` |
| Files | kebab-case | `agent-kernel.ts`, `define-tool.ts` |
| Packages | kebab-case | `agent-core`, `model-adapters` |

## Type Safety

- Use branded types for IDs: `$type<RunId>()`, `$type<SessionId>()`
- Prefer `interface` over `type` for public APIs
- Use Zod schemas for runtime validation
- Avoid `as never` casts — fix the underlying type issue
- Avoid `any` — use `unknown` and narrow with type guards

## File Organization

```typescript
// 1. External imports
import { z } from 'zod';

// 2. Internal imports (relative)
import { SomeType } from './types.js';

// 3. Types
interface MyConfig { ... }

// 4. Constants
const DEFAULT_TIMEOUT = 5000;

// 5. Implementation
export class MyClass { ... }

// 6. Factory functions
export function createMyClass(config: MyConfig): MyClass { ... }
```

## Error Handling

- Extend `SdkError` for all SDK errors
- Use error taxonomy: `domain` + `category`
- Include `isInstance()` static method for cross-boundary compatibility
- Use typed error codes (not string messages)
- Don't swallow errors silently — log them

```typescript
// Good — new pattern with taxonomy
class ToolError extends SdkError {
  readonly domain = "tool";
  readonly category = "system";
  readonly code = "TOOL_EXECUTION_ERROR";
  readonly isRetryable = false;
  
  static isInstance(error: unknown): error is ToolError {
    return error instanceof ToolError;
  }
}

// Bad — old pattern without taxonomy
throw new Error(`Session is busy: ${session.id}`);
```

## Documentation

- Add JSDoc to all public interfaces and types
- Use `@param`, `@returns`, `@throws`, `@example`
- Keep README examples in sync with actual API

## Testing

- Use Vitest with workspace configuration
- Place tests in `test/` directory alongside source
- Use descriptive test names: `TC01_kernel_starts_run`
- Use fakes from `@vinhnt-sdk/test-utils` for test doubles
- Aim for >80% coverage on critical paths
- Mock at interface boundary, NOT HTTP

## DynamicArgument Pattern

Allow static OR per-request dynamic values:

```typescript
// Static value
const agent = new Agent({
  instructions: "You are a helpful assistant",
  tools: [weatherTool],
});

// Dynamic value (callback)
const agent = new Agent({
  instructions: (ctx) => `User is ${ctx.user.name}`,
  tools: [weatherTool],
});
```

## Two-Tier Config Pattern

Global config + per-agent config (overridable):

```typescript
// Global RunConfig
interface RunConfig {
  model?: string | LanguageModel;
  maxSteps?: number;
  telemetry?: TelemetryConfig;
}

// Per-agent AgentConfig (overrides RunConfig)
interface AgentConfig {
  model?: string | LanguageModel;  // overrides RunConfig
  tools?: Tool[];
}
```

## Provider Spec Pattern

Providers depend on spec, core consumes spec:

```typescript
// @vinhnt-sdk/provider-spec — pure interfaces
interface LlmAdapter {
  stream(request: LlmRequest): AsyncIterable<StreamChunk>;
}

// Core consumes spec
class AgentKernel {
  constructor(private adapter: LlmAdapter) {}
}

// Provider implements spec
class OpenAiAdapter implements LlmAdapter {
  stream(request: LlmRequest): AsyncIterable<StreamChunk> { ... }
}
```

## Telemetry Pattern

Opt-in telemetry with zero cost by default:

```typescript
// Default: no-op (zero cost)
registerTelemetry(new OpenTelemetryExporter());

// Per-call override
const result = await generateText({
  model,
  telemetry: { isEnabled: true, recordInputs: true },
});
```