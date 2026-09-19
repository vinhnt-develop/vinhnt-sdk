# Architecture Decisions

> System design context for vinhnt-sdk

## Layer Model

```
L0: Foundation  → schema, security        (Zero internal deps)
L1: Core        → core, plugin, tools, knowledge  (Agent runtime, tool system, memory)
L2: Subsystems  → lsp                     (IDE integration)
```

### Package Details

| Package | Layer | Dependencies | Purpose |
|---------|-------|--------------|---------|
| `@vinhnt-sdk/schema` | L0 | None | Core types, contracts, branded IDs, wire format |
| `@vinhnt-sdk/config` | L0 | schema | CredentialRef, settings, env resolution |
| `@vinhnt-sdk/llm` | L1 | schema, config | LlmAdapter, LlmRegistry, TokenMeter |
| `@vinhnt-sdk/tools` | L1 | schema | Tool framework + built-in tools (fs, shell, git, web, search) |
| `@vinhnt-sdk/sandbox` | L1 | schema, config | Process isolation (host, process backends) |
| `@vinhnt-sdk/guard` | L1 | tools, llm | CircuitBreaker, LoopDetector, ToolTimeout |
| `@vinhnt-sdk/session` | L1 | schema, config | SessionProvider, conversation state |
| `@vinhnt-sdk/permission` | L1 | schema | Permission rules, approval store |
| `@vinhnt-sdk/step-executor` | L1 | schema, tools | Execution kernel, tool dispatch, self-correction |
| `@vinhnt-sdk/core` | L1 | schema, tools, llm | AgentKernel, PluginManager, orchestration |
| `@vinhnt-sdk/provider-openai-compatible` | L1 | llm | OpenAI-compatible provider + presets |
| `@vinhnt-sdk/plugin` | L1 | core | Plugin registry, manifest, hooks |
| `@vinhnt-sdk/knowledge` | L1 | schema | Memory, context, skill system |
| `@vinhnt-sdk/event` | L1 | schema | Event bus, typed events |
| `@vinhnt-sdk/mcp` | L1 | tools, schema | Model Context Protocol client |
| `@vinhnt-sdk/trace` | L1 | schema, session, llm | Tracing, timeline, cost tracking |
| `@vinhnt-sdk/security` | L0 | None | Secret redaction, injection detection |
| `@vinhnt-sdk/lsp` | L2 | tools | LSP integration (diagnostics, completions) |
| `@vinhnt-sdk/guardrails` | L1 | schema | Guardrail tripwires for inputs/outputs |
| `@vinhnt-sdk/workflow` | L1 | schema | Workflow primitives (parallel, sequential, conditional) |

## Dependency Rules

- Arrows MUST flow downward (L0 → L1 → L2)
- No circular dependencies between packages
- Each package must be independently usable
- `schema` has zero internal dependencies — it is the true foundation

## Key Design Patterns

### AgentKernel Composition
The `AgentKernel` is the composition root. It delegates to:
- `ModelCaller` — Model invocation with streaming
- `PermissionGate` — 4-phase permission evaluation
- `StepExecutor` — Run loop step execution
- `ToolSaga` — Transactional tool rollback support
- `CircuitBreaker` — Failure detection and recovery

### Registry Pattern
All extension points use registry pattern:
- `ModelRegistry` — Register LLM providers
- `ToolRegistry` — Register tools
- `ToolProviderRegistry` — Register tool providers
- `PluginRegistry` — Register plugins
- `LspServerRegistry` — Register LSP servers
- `SecretRedactor.register()` — Register redaction patterns

### Event System
- `EventBus` interface with `publish`/`subscribe`/`durable`/`project`
- `EventRegistry` for global event type registration
- Events are typed with Zod schemas

## Architecture Principles

1. **Composition over inheritance** — Use dependency injection
2. **Schema-first** — Zod schemas define all contracts
3. **Plugin-based** — Extend via plugins, not modifications
4. **Observable** — Event system for monitoring
5. **Secure** — Permission gates on all tool executions
6. **Open types** — String types + KNOWN_* constants for extensibility
7. **Export defaults** — User can merge/override defaults

## 8-Phase Refactor Changes (2026-08-25)

### Phase 1: Type System Overhaul
- **RunUsage nested**: Usage data grouped in nested `RunUsage` object (not flat fields)
- **Provider-spec package**: Pure interfaces for provider contracts (`@vinhnt-sdk/provider-spec`)
- **Spec pattern**: Providers depend on spec, core consumes spec — clean separation
- **DynamicArgument<T, TContext>**: Allow static OR per-request dynamic values

### Phase 2: Error Handling Overhaul
- **Error taxonomy**: `domain` ("llm" | "tool" | "kernel") + `category` ("user" | "system" | "dependency")
- **isInstance()**: Static method instead of `instanceof` for cross-boundary compatibility
- **isRetryable**: Boolean flag for API errors with retry semantics

### Phase 3: Token/Usage System
- Integrated with Phase 1 (RunUsage nested pattern)
- **addUsage()**: Multi-step aggregation helper
- **raw?: Record<string, unknown>**: Provider-specific usage data

### Phase 4: Agent Loop Refactor
- **prepareStep callback**: Hook before each step for dynamic tool selection/permission changes
- Core loop target: under 30 lines
- Stop conditions configurable per run

### Phase 5: Configuration Overhaul
- **RunConfig + AgentConfig**: Global config + per-agent config (overridable)
- **DynamicArgument<T>**: Instructions can be static or callback-based
- **Provider registry**: String-or-model pattern for flexible model selection

### Phase 6: Extensibility
- **ToolMiddleware**: Intercept tool execution for logging, validation, transformation
- **Plugin hooks**: before/after pattern for all major events
- **Open unions**: Extension points use `(string & {})` pattern

### Phase 7: Observability
- **TelemetryProvider**: Opt-in telemetry with zero cost by default
- **OTel-compatible**: Span hierarchy with parent/child relationships
- **Per-call override**: `telemetry: { isEnabled: true }` on individual calls

### Phase 8: Testing
- **@vinhnt-sdk/test-utils**: Ships `MockLanguageModel` and testing utilities
- **Mock-first testing**: Mock at interface boundary, NOT HTTP
- **Type-level tests**: Compile-time type checking for API contracts

## Current Architecture Issues

- ~~`AgentKernelConfig` god-object (45+ properties)~~ — RESOLVED via RunConfig/AgentConfig split
- ~~Barrel exports in core/index.ts~~ — RESOLVED with named exports
- ~~Global static state in EventRegistry~~ — RESOLVED with instance-based pattern