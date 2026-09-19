# Plan: vinhnt-sdk Architecture Refactor — Agent SDK Standard

> Created: 2026-08-25
> Status: completed
> Reference: `deepseek-harness-learnings.md`, OpenAI Agents SDK, Anthropic Claude Agent SDK, MCP Specification

## Goal

Tái cấu trúc vinhnt-sdk từ 30 packages flat → ~18 packages nhóm theo capability seam, chuẩn bị publish npm, zero hardcoded values, plugin-based, OpenAI-compatible. KHÔNG bao gồm web UI (sẽ là apps riêng sau).

## Nguyên tắc bất biến

1. **Zero hardcoded values** — mọi config resolve từ env/settings, provider-specific defaults là named constants overridable
2. **Capability Seam** — mỗi capability = Service Definition + Provider + Consumer
3. **Registrations are effects** — mọi đăng ký trả disposable, HMR-safe
4. **CredentialRef** — reference to env var, không lưu literal secret
5. **Per-request resolution** — config resolve mỗi request boundary, không cache
6. **Publishable** — mỗi package publish được lên npm riêng biệt
7. **OpenAI-compatible** — tool definition, function calling, streaming theo chuẩn
8. **Branded IDs** — all cross-boundary identifiers là branded types

---

## Cấu trúc Packages Mới

```
@vinhnt-sdk/
│
├── core/                    ← Agent kernel, orchestration, lifecycle
│   ├── src/agent/           (Agent interface, config, events)
│   ├── src/agent-loop/      (Execution loop — pluggable)
│   ├── src/scope/           (Per-agent scoped registration)
│   └── src/system-prompt/   (Prompt assembly tiers)
│
├── schema/                  ← Types, contracts, Zod schemas
│   ├── src/contracts/       (Branded IDs, events, errors, API transport)
│   ├── src/types/           (Model, Session, Agent, Tool types)
│   └── src/tool/            (Built-in tool input schemas)
│
├── llm/                     ← LLM capability seam
│   ├── src/                 (Service Definition — ModelProvider, StreamChunk)
│   ├── src/providers/       (Provider adapters — factory registration)
│   └── src/resolve/         (Per-request resolution, credential refs)
│
├── providers/               ← Concrete provider implementations
│   ├── openai-compatible/   (OpenAI API standard adapter)
│   ├── anthropic/           (Anthropic adapter)
│   ├── deepseek/            (DeepSeek adapter)
│   └── ollama/              (Ollama adapter)
│
├── session/                 ← Session capability seam
│   ├── src/                 (Service Definition — SessionStore, events)
│   ├── src/memory/          (Provider — in-memory)
│   ├── src/drizzle/         (Provider — SQLite via Drizzle)
│   └── src/drizzle-pg/      (Provider — PostgreSQL via Drizzle)
│
├── sandbox/                 ← Sandbox capability seam
│   ├── src/                 (Service Definition — SandboxUnavailableError)
│   ├── src/host/            (Provider — host sandbox)
│   ├── src/process/         (Provider — process sandbox)
│   └── src/container/       (Provider — container sandbox)
│
├── tools/                   ← Tool framework + registry
│   ├── src/registry/        (Tool registration, settle, permissions)
│   ├── src/definitions/     (ToolDefinition, ToolDefinitionLike)
│   └── src/execute/         (Tool execution, timeout, saga)
│
├── tools-fs/                ← File tools (plugin)
├── tools-git/               ← Git tools (plugin)
├── tools-shell/             ← Shell tools (plugin)
├── tools-web/               ← Web tools (plugin)
├── tools-search/            ← Search tools (plugin)
├── tools-agent/             ← Delegate agent (plugin)
│
├── permission/              ← Permission gate + approval
├── security/                ← Secret redaction + prompt protection
├── plugin/                  ← Plugin SDK (effects pattern)
├── event/                   ← Event bus (typed events)
├── knowledge/               ← Memory + context compression
├── lsp/                     ← LSP integration
│
├── config/                  ← Configuration layer
│   ├── src/credentials/     (CredentialRef abstraction, 4-layer resolution)
│   ├── src/settings/        (Settings namespace, hot-reload)
│   └── src/env/             (Environment variable resolution)
│
├── guard/                   ← Behavioral guards
│   ├── src/loop-detection/  (Repeat tool detection — advisory)
│   ├── src/tool-timeout/    (Cooperative deadline — signal-based)
│   └── src/circuit-breaker/ (Provider circuit breaker)
│
├── mcp/                     ← Model Context Protocol
│   ├── src/client/          (MCP client — stdio, SSE, Streamable HTTP)
│   └── src/server/          (MCP server — expose vinhnt-sdk tools)
│
└── trace/                   ← Observability
    ├── src/tracing/         (OpenTelemetry-compatible spans)
    ├── src/timeline/        (Session timeline replay)
    └── src/telemetry/       (Usage aggregation, cost tracking)
```

**Tổng: ~18 package groups** (thay vì 30 flat packages). Mỗi group publish được lên npm.

---

## 8-Phase Architecture Refactor

### Phase 1 — Type System Overhaul ✅ COMPLETED

> Fix schema gaps identified in research. Schema là linh hồn — phải hoàn thiện trước.

- [x] **S1. Fix ToolChoice type mismatch**
  - `schema/src/types/model.ts` — Thêm `WireToolChoice` (OpenAI wire format) + `toWireToolChoice()` conversion function
  - SDK giữ `ToolChoice` đơn giản `{type: "function", name}`, wire format `{type: "function", function: {name}}`
  - Export từ schema barrel
  - Gate: typecheck 54/54, 1562 pass

- [x] **S2. Add JsonSchema type**
  - `schema/src/types/model.ts` — Tạo `JsonSchema` interface (structural, zero-dep)
  - `ToolDefinitionLike.inputSchema` đổi từ `unknown` → `JsonSchema | undefined`
  - `ToolDefinitionLike.function.parameters` đổi từ `unknown` → `JsonSchema | undefined`
  - Gate: typecheck 54/54, 1562 pass

- [x] **S3. Unify Message.role with ChatMessageRole**
  - `schema/src/contracts/schema/session.ts` — `MessageSchema.role` mở rộng thêm `"developer"` + `"function"`
  - Đồng bộ với `ChatMessageRole` type
  - Gate: 1562 pass

- [x] **S4. Add model field to ModelRequest**
  - `schema/src/types/model.ts` — Thêm `model?: string` optional field
  - Gate: 1562 pass

- [x] **S5. Add streaming tool call accumulator type**
  - `schema/src/types/model.ts` — Thêm `StreamingToolCallState { id, name, argumentChunks }`
  - Dùng trong provider SSE parsers
  - Gate: 1562 pass

- [x] **S6. Add missing event types for timeline**
  - `schema/src/contracts/events.ts` — Thêm: `turn/start`, `turn/end`, `llm/retry`, `llm/retry_started`, `approval.asked`, `approval.decided`, `tool.cancelled`
  - `schema/src/contracts/schema/run-event.ts` — Zod schemas + event schemas cho 7 event types mới
  - KnownRunEvent union mở rộng từ 19 → 26 event types
  - Export đầy đủ qua contracts/index → schema/index
  - Gate: 1562 pass

- [x] **S7. Add tool call pair contract**
  - `tool.cancelled` event type added (S6) — pairing với `tool.invoked`/`tool.completed`/`tool.failed`
  - Gate: 1562 pass

- [x] **RunUsage nested pattern**
  - Usage data grouped in nested `RunUsage` object (not flat fields)
  - Provider-spec package created for pure interfaces
  - DynamicArgument<T, TContext> implemented for configurable values

- [x] **Gate: typecheck + build + test**
  - build 31/31, typecheck 54/54, lint 30/30, **1562 pass / 2 skip**, quality OK

### Phase 2 — Error Handling Overhaul ✅ COMPLETED

> Structured error taxonomy for cross-boundary compatibility.

- [x] **Error taxonomy defined**
  - `domain`: "llm" | "tool" | "kernel" | "agent" | "run" | "session" | "permission"
  - `category`: "user" | "system" | "dependency"
  - `isRetryable`: boolean flag for API errors

- [x] **isInstance() static method**
  - Every error class has `static isInstance(error: unknown): error is SdkError`
  - Works across module boundaries and different versions
  - Replaces `instanceof` checks

- [x] **Error code standardization**
  - `TOOL_NOT_FOUND`, `TOOL_EXECUTION_ERROR`, `TOOL_PERMISSION_DENIED`
  - `AGENT_NOT_FOUND`, `AGENT_VALIDATION_ERROR`
  - `RUN_NOT_FOUND`, `RUN_ABORTED`, `RUN_TIMEOUT`
  - `KERNEL_CIRCUIT_OPEN`

### Phase 3 — Token/Usage System ✅ COMPLETED

> Integrated with Phase 1 (RunUsage nested pattern).

- [x] **RunUsage nested object**
  - `inputTokens`, `outputTokens`, `reasoningTokens`, `cacheReadTokens`, `cacheWriteTokens`
  - `totalTokens`, `cost`, `raw?: Record<string, unknown>`

- [x] **addUsage() helper**
  - Multi-step aggregation for token usage across turns
  - Handles nested usage objects

- [x] **Raw provider data**
  - `raw?: Record<string, unknown>` for provider-specific usage data
  - Backward compatible with existing code

### Phase 4 — Agent Loop Refactor ✅ COMPLETED

> Minimal core loop with extensibility hooks.

- [x] **prepareStep callback**
  - Hook before each step for dynamic tool selection
  - Permission changes per step
  - Context injection

- [x] **Core loop target: under 30 lines**
  - Simplified execution logic
  - Delegates to StepExecutor for actual work

- [x] **Configurable stop conditions**
  - `maxSteps`, `maxTokens`, `maxCost`
  - Custom stop condition callbacks

### Phase 5 — Configuration Overhaul ✅ COMPLETED

> Two-tier config with dynamic arguments.

- [x] **RunConfig + AgentConfig**
  - Global `RunConfig`: model, maxSteps, telemetry
  - Per-agent `AgentConfig`: overrides RunConfig

- [x] **DynamicArgument<T>**
  - Static values OR per-request callbacks
  - `instructions: (ctx) => \`User is ${ctx.user.name}\``

- [x] **Provider registry**
  - String-or-model pattern: `"openai:gpt-4o"` or custom model
  - Flexible model selection

### Phase 6 — Extensibility ✅ COMPLETED

> ToolMiddleware and typed plugin hooks.

- [x] **ToolMiddleware**
  - Intercept tool execution: before, after, error
  - Chain multiple middlewares
  - Logging, validation, transformation

- [x] **Typed plugin hooks**
  - `tool.execute.before`, `tool.execute.after`
  - `session.create`, `agent.turn.start`, `agent.turn.end`
  - Before/after pattern for all major events

- [x] **Open unions**
  - Extension points use `(string & {})` pattern
  - `CredentialSource`, `ToolRisk`, `PermissionEffect`

### Phase 7 — Observability ✅ COMPLETED

> Opt-in telemetry with OTel-compatible tracing.

- [x] **TelemetryProvider**
  - Opt-in with zero cost by default
  - Per-call override: `telemetry: { isEnabled: true }`

- [x] **OTel-compatible tracing**
  - Span hierarchy with parent/child relationships
  - `TracingExporter` interface for custom exporters

- [x] **Usage aggregation**
  - TokenMeter tracks input/output tokens
  - calculateCost() for per-1M-token pricing
  - calculateContextPressure() for context window monitoring

### Phase 8 — Testing ✅ COMPLETED

> Mock-first testing with @vinhnt-sdk/test-utils.

- [x] **@vinhnt-sdk/test-utils package**
  - Ships `MockLanguageModel`, `MockToolRegistry`
  - `createTestAgent()` helper
  - Type-level test utilities

- [x] **Mock at interface boundary**
  - NOT HTTP mocking
  - Mock at LanguageModel interface

- [x] **Type-level tests**
  - Compile-time type checking for API contracts
  - `expectType<T>()` utility

---

## Gate Verification

Sau mỗi phase, chạy:

```bash
pnpm build              # 31/31 packages build
pnpm typecheck          # 0 errors
pnpm lint               # 0 errors
pnpm test:run           # All pass
pnpm quality            # export-map + JSDoc + NodeNext smoke
```

---

## Dependencies

```
schema (không depend ai)
    ↓
config (depend schema cho CredentialRef types)
    ↓
llm (depend config, schema)
providers (depend llm, config, schema)
    ↓
session (depend schema, config)
    ↓
sandbox (depend schema, config)
    ↓
tools (depend schema, permission)
tools-* (depend tools, sandbox)
    ↓
guard (depend tools, llm)
    ↓
plugin (depend schema)
    ↓
mcp (depend tools, schema)
    ↓
trace (depend schema, session, llm)
    ↓
core (depend tất cả)
```

---

## Changes

- 2026-08-25 — Tạo plan mới từ research 6 subagent (deepseek-harness, OpenAI/Anthropic/MCP standards, schema review, config patterns)
- 2026-08-25 — Phase 1 complete: Schema cleanup + type gaps fixed
- 2026-08-25 — Phase 2 complete: Error handling overhaul with taxonomy
- 2026-08-25 — Phase 3 complete: Token/Usage system integrated with Phase 1
- 2026-08-25 — Phase 4 complete: Agent loop refactor with prepareStep
- 2026-08-25 — Phase 5 complete: Configuration overhaul with DynamicArgument
- 2026-08-25 — Phase 6 complete: Extensibility with ToolMiddleware
- 2026-08-25 — Phase 7 complete: Observability with TelemetryProvider
- 2026-08-25 — Phase 8 complete: Testing with @vinhnt-sdk/test-utils
- 2026-09-19 — Documentation updated for 8-phase refactor