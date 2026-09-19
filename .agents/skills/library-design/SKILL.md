# Skill: Library Design Principles

> Nguyên tắc thiết kế thư viện TypeScript — Áp dụng cho vinhnt-sdk

## Khi nào dùng

- Viết code mới trong bất kỳ package nào
- Review code trước khi commit
- Tạo interface hoặc abstraction mới
- Refactor code hiện có

## Nguyên tắc Cốt lõi

### 1. vinhnt-sdk là LIBRARY, không phải PROVIDER

```
vinhnt-sdk = "tay chân" cho AI agent
- Nhận config từ bên ngoài
- Không quyết định thay user
- Không fix cứng dữ liệu thay đổi
- Không phụ thuộc vào package cụ thể (trừ peer deps)
```

### 2. KHÔNG Fix cứng Dữ liệu Thay đổi

**Tuyệt đối KHÔNG fix cứng:**
- Giá cả, pricing tables
- Tên model (gpt-4, claude-3, etc.)
- API endpoints, URLs
- Language patterns, file extensions
- Provider capabilities
- Tokenizer encodings

**Thay vào đó:**
- Accept config từ user
- Export defaults để user tự merge
- Registry pattern cho extension

### 3. Configuration Pattern

```typescript
// KHÔNG
const DEFAULT_PRICES = { "gpt-4o": 2.50 };

// MÀ
interface CostTrackerConfig {
  pricingTable?: Record<string, ModelPricing>;
  pricingResolver?: (model: string) => ModelPricing | null;
  fallbackPricing?: ModelPricing | null;
}
```

### 4. Registry Pattern

```typescript
// KHÔNG
type Provider = "openai" | "voyage" | "local"; // Closed union

// MÀ
type Provider = string; // Open

const registry = new EmbeddingProviderRegistry();
registry.register("cohere", (config) => new CohereProvider(config));
registry.register("custom", (config) => new CustomProvider(config));
```

### 5. Strict vs Open Unions — Nguyên tắc Vàng

**Câu hỏi quyết định:** *Field này là state machine core hay extension point?*

#### NHẤT ĐỊNH PHẢI GIỮ STRICT:

```typescript
// ❌ ĐỪNG MỞ — State machine core
type CircuitState = "closed" | "open" | "half_open";
type RunState = "pending" | "running" | "completed" | "failed" | "cancelled";
type MessageRole = "system" | "user" | "assistant" | "developer" | "tool";
```

**Lý do:**
- State machine chỉ có đúng N trạng thái — mở = phá vỡ logic switch/case
- Vi phạm nguyên tắc **exhaustive check** — TypeScript sẽ không cảnh báo khi thiếu case
- Dev khác truyền nhầm giá trị → bug khó tìm
- Mất đi tính **self-documenting** — người đọc type phải đoán "còn state nào nữa?"

#### NÊN MỞ KHI LÀ EXTENSION POINT:

```typescript
// ✅ MỞ — Plugin extension point
type CredentialSource = "env" | "managed" | "project-env" | "user-env" | (string & {});
type PermissionEffect = "allow" | "deny" | "ask" | (string & {});
type ToolRisk = "none" | "read-only" | "write" | "dangerous" | (string & {});
type SandboxScope = string; // Hoàn toàn mở
```

**Lý do:**
- Plugins cần register custom values mà không cần fork SDK
- Hệ thống có registry/handler xử lý fallback cho unknown values
- Không phá vỡ logic switch — có default handler

#### Checklist khi quyết định:

```
□ Field này là TRẠNG THÁI của hệ thống (state machine)?
  → STRICT. Không ngoại lệ.

□ Field này là TÊN plugin/provider/user define?
  → MỞ. Cần `(string & {})`.

□ Field này có switch/case xử lý logic?
  → Nếu Strict: thiếu case = bug. Nếu Mở: phải có default.

□ Field này có trong API contract mà user thường xuyên dùng?
  → Nếu user chỉ đọc: STRICT. Nếu user cần truyền custom: MỞ.
```

#### Khi cần custom state mà vẫn giữ strict:

```typescript
// ✅ THAY VÌ mở union, dùng generic
interface CircuitBreaker<State extends string = CircuitState> {
  readonly state: State;
}

// User extend:
type MyCircuitState = CircuitState | "degraded";
const cb: CircuitBreaker<MyCircuitState> = ...; // ❌ KHÔNG — vi phạm contract

// ✅ CÁCH ĐÚNG: Plugin có mechanism riêng
interface CircuitBreakerHooks {
  onStateTransition?: (from: CircuitState, to: CircuitState) => void;
  // Custom logic qua hooks, KHÔNG qua type
}
```

### 6. Client Extension Guide — Hướng dẫn cho người dùng SDK

**Nguyên tắc:** User có thể extend mà không cần fork SDK.

#### A. Thêm custom values vào open union:

```typescript
import type { CredentialSource } from "@vinhnt-sdk/config";

// Custom credential source
type MyCredentialSource = CredentialSource | "vault" | "aws-secrets-manager";

// Dùng trong custom CredentialProvider
const myProvider: CredentialProvider = {
  async resolve(ref) {
    // Xử lý "vault" và "aws-secrets-manager" ...
  }
};
```

#### B. Extend interface qua declaration merging:

```typescript
import type { AgentProfile } from "@vinhnt-sdk/schema";

// Thêm field mới vào AgentProfile
declare module "@vinhnt-sdk/schema" {
  interface AgentProfile {
    readonly team?: string;
    readonly costCenter?: string;
  }
}

// Giờ dùng được
const agent: AgentProfile = {
  id: AgentId("a1"),
  name: "my-agent",
  team: "platform",        // ✅ Không lỗi
  costCenter: "CC-1234",   // ✅ Không lỗi
};
```

#### C. Extend metadata field:

```typescript
import type { ToolDefinition } from "@vinhnt-sdk/tools";

const myTool: ToolDefinition = {
  name: "custom-tool",
  description: "...",
  inputSchema: { type: "object", properties: {} },
  execute: async (input) => { ... },
  metadata: {
    author: "my-team",
    version: "2.1.0",
    compliance: { soc2: true, gdpr: false },  // ✅ Tùy ý
  },
};
```

#### D. Custom permission effect:

```typescript
import type { PermissionEffect } from "@vinhnt-sdk/permission";

// Plugin thêm custom effect
type CustomEffect = PermissionEffect | "log" | "notify" | "defer";

// Custom evaluator xử lý
function evaluateCustomEffect(effect: CustomEffect): void {
  switch (effect) {
    case "allow": /* ... */ break;
    case "deny": /* ... */ break;
    case "ask": /* ... */ break;
    case "log": /* ... */ break;      // ✅ Custom
    case "notify": /* ... */ break;   // ✅ Custom
    default: /* fallback */ break;
  }
}
```

#### E. Custom provider preset:

```typescript
import { createProviderFromPreset } from "@vinhnt-sdk/provider-openai-compatible";

// Tạo provider custom
const myProvider = createProviderFromPreset({
  name: "my-llm",
  baseUrl: "https://my-llm.example.com/v1",
  defaultModel: "my-model",
  contextLimit: 32000,
  capabilities: { streaming: true, toolCalling: true },
}, { apiKey: process.env.MY_LLM_API_KEY });
```

### 7. Defaults as Constants

```typescript
// Export defaults cho user
export const DEFAULT_LANG_MAP = {
  ts: "typescript",
  js: "javascript",
  py: "python",
};

// User extend:
const myMap = { ...DEFAULT_LANG_MAP, dart: "dart" };
```

### 8. Dependency Injection

```typescript
// Factory function pattern
function createSDK(deps: {
  storage: StorageProvider;
  logger?: Logger;
}) {
  return { async doWork() { ... } };
}
```

## API Surface Guidelines

### Export Counter Guidelines

| Package | Target | Current | Action |
|---------|--------|---------|--------|
| schema | ~25 | ~80 | Review & reduce |
| core | ~20 | ~200+ | Review & reduce |
| tools | ~25 | ~80 | Review & reduce |
| knowledge | ~12 | ~19 | Keep |
| security | ~6 | ~6 | Keep |
| plugin | ~8 | ~19 | Review & reduce |
| lsp | ~20 | ~41 | Review & reduce |

### Internal vs Public API

```typescript
// ✅ PUBLIC - Users should import this
export { AgentKernel } from "./kernel/kernel.js";
export type { AgentKernelConfig } from "./kernel/kernel-types.js";

// ❌ INTERNAL - Users should NOT import this
// Do NOT export from index.ts
export { ToolSaga } from "./kernel/tool-saga.js";
export { canTransitionRun } from "./kernel/state-machine.js";
```

### @internal JSDoc Tag

```typescript
/**
 * Internal implementation detail — may change without notice.
 * @internal
 */
export class InternalHelper {
  // ...
}
```

## Error System Guidelines

### Custom Error Classes

```typescript
// ✅ GOOD - Custom error with code and retryable
export class ToolExecutionError extends SdkError {
  readonly domain = "tool";
  readonly category = "system";
  readonly code = "TOOL_EXECUTION_ERROR";
  readonly retryable = false;
  
  static isInstance(error: unknown): error is ToolExecutionError {
    return error instanceof ToolExecutionError;
  }
  
  constructor(toolName: string, cause: unknown) {
    super(`Tool ${toolName} failed`);
    this.cause = cause;
  }
}

// ❌ BAD - Generic error
throw new Error("Something went wrong");
```

### Error Code Categories

| Code | Package | Domain | Category | Retryable |
|------|---------|--------|----------|-----------|
| TOOL_NOT_FOUND | tools | tool | user | false |
| TOOL_EXECUTION_ERROR | tools | tool | system | false |
| TOOL_PERMISSION_DENIED | tools | tool | user | false |
| AGENT_NOT_FOUND | schema | agent | user | false |
| AGENT_VALIDATION_ERROR | schema | agent | user | false |
| RUN_NOT_FOUND | schema | run | user | false |
| RUN_ABORTED | schema | run | user | false |
| RUN_TIMEOUT | schema | run | system | true |
| KERNEL_CIRCUIT_OPEN | core | kernel | system | true |

## Event/Streaming Guidelines

### Typed Events

```typescript
// ✅ GOOD - Typed events with Zod schemas
export const TokenStreamedEvent = defineEvent({
  type: "token.streamed",
  schema: TokenStreamedDataSchema,
});

// ❌ BAD - Untyped events
eventBus.emit("token", { content: "..." });
```

### Streaming-First Design

```typescript
// ✅ GOOD - Streaming-first ModelProvider
interface ModelProvider {
  stream(request: ModelRequest, signal: AbortSignal): AsyncIterable<ModelStreamEvent>;
}

// ❌ BAD - Non-streaming
interface ModelProvider {
  complete(request: ModelRequest): Promise<ModelResponse>;
}
```

## Documentation Guidelines

### JSDoc Coverage Target

| Metric | Current | Target |
|--------|---------|--------|
| JSDoc coverage (public API, đo bằng `pnpm quality`) | 100% (651/651) | 80%+ (đã đạt, duy trì) |
| Package docs | 4/7 | 7/7 |
| TypeDoc generation | No | Yes |
| `verify-export-jsdoc --min` (gate) | 80% (enforced) | duy trì 80%+ |

### Required Documentation

```typescript
/**
 * Create a new agent with the given configuration.
 * 
 * @param params - Agent creation parameters
 * @returns Configured agent instance
 * 
 * @example
 * ```typescript
 * const agent = await createAgent({
 *   name: "my-agent",
 *   model: myModelProvider,
 *   tools: [readFileTool, writeFileTool],
 * });
 * ```
 */
export async function createAgent(params: CreateAgentParams): Promise<AgentKernel> {
  // ...
}
```

## Package-Split Criteria (từ deepseek-harness learnings)

- Mỗi **capability seam** = 1 package (session, event-bus, permission...).
- Mỗi **backend swappable** = 1 package (store-memory vs store-drizzle; sandbox-host vs process vs container; provider-*).
- Mỗi **tool family** = 1 package (fs, shell, web, git, search, agent).
- **Kernel primitives** tách riêng — cấm god-package core (model-caller, step-executor, tool-saga, event là package riêng).
- **Contract vs implementation**: schema/plugin là contract (zero/minim deps); implementation đóng gói riêng.
- Chỉ tách khi có **consumer thực sự**; dependency graph phải là DAG (kiểm tra bằng `pnpm check:deps` → `scripts/check-dep-graph.mjs` trong CI; đã thay dpdm để tránh false positives type-only/barrel cycles).

## Dependency Rules

- Không tạo cycle; mọi dependency nội bộ qua workspace (`workspace:*`) + tự pin khi publish.
- Contract package tối thiểu deps: `schema` chỉ zod; `plugin` chỉ phụ thuộc `@vinhnt-sdk/core` (host relationship — **không** phải zero-dep); `security`/`tool-saga` là zero-dep thực sự.
- Registry thay cho closed union; capability flags trên ModelProvider thay cho branch theo provider name.
- Vendor dependency luôn pin; re-scope nội bộ.

## NPM Publishing Rules

- Exports map phải có `./package.json` + `default` fallback; `sideEffects: false` (đã set ở MỌI package); ESM-only `.js`-extension relative imports.
- `LICENSE` có trong MỌI package (30/30); `.d.ts` không rò rỉ mojibake — `scripts/check-hygiene.mjs` (`pnpm check:hygiene`) quét UTF-8 hỏng trước publish.
- Không bypass changesets (`pub:beta`/`pub:release` đã bỏ); chuẩn hoá `changeset publish` sau `pnpm build` + `pnpm test` (`publish-packages`).
- Publish tự động qua `.github/workflows/release.yml` (changesets/action): job `verify` chạy check/build/typecheck/lint/test/coverage/quality rồi mới version + publish (cần secret `NPM_TOKEN`).
- CI gates (`pnpm quality` + `pnpm check:coverage`): export-map check (named export trong `src/index.ts` phải có trong `dist/index.d.ts`), `verify-export-jsdoc.mjs` (gate `--min=80%` trên **public API** — symbol reachable từ `src/index.ts`, bare re-export được gán cho package sở hữu; hiện 100%), per-file coverage regression gate (baseline `scripts/.coverage-baseline.json`; drift ≤ 10pts; total floors lines 70 / functions 70 / branches 75).

## Hardening / Fail-closed (từ deepseek-harness learnings)

- Sandbox **fail-closed**: backend không khả dụng phải throw `SandboxUnavailableError` (`ERR_SANDBOX_UNAVAILABLE`), không silent-downgrade xuống host/process — đã implement ở `sandbox-container` + `tools-shell`/`tool-sandbox`.
- **CAS/versioned writes**: ghi phải so sánh phiên bản trước khi upsert — snapshot/event dùng `(aggregate_id, seq)` làm PK + upsert theo seq (store-drizzle / store-drizzle-pg) để tránh lost-update giữa agent và observability.
- **Tree-scoped kill**: kill sandbox process phải diệt cả process tree (`killProcessTree`/`treeKillSpawnOptions` từ `@vinhnt-sdk/sandbox`, dùng trong `sandbox-process`) tránh orphan process.
- **Per-file semaphore**: tool edit file cần serialize write trên cùng một file (in-flight lock per-file) khi agent chạy concurrent — hiện là guideline cần enforce (tools-fs chưa có lock; theo dõi ISS-3).

## OpenAI Model Layer Standards

- `ModelProvider.stream` là **optional** (dùng khi có); kernel giữ 2 nhánh — không contract dối (`stream` required nhưng branch `if (!stream)`).
- Provider adapter package **dependency-free (raw fetch, KHÔNG AI SDK)**: request-body converter, SSE parser, `toModelResponse`/`fromOpenAIStreamChunk`.
- `provider-{deepseek,anthropic,ollama}` = tip package trên base `provider-openai-compatible` (conditional-import, không share implementation).
- Role union phải có `developer`/`function`; ModelRequest hỗ trợ `tools`/`tool_choice`/`max_completion_tokens`/`stream_options`/`response_format`.
- Error mapping HTTP → VntError code+retryable (kèm `Retry-After`).

## Checklist khi Review Code

- [ ] Có hardcoded data nào thay đổi theo thời gian không?
- [ ] **State machine types có giữ strict union không?** (CircuitState, RunState, MessageRole — KHÔNG `(string & {})`)
- [ ] **Extension point types có mở đúng cách không?** (CredentialSource, ToolRisk — dùng `(string & {})`)
- [ ] User có thể extend mà không cần fork không?
- [ ] **User có hướng dẫn extension không?** (Declaration merging, metadata, custom presets)
- [ ] Defaults có export để user tự merge không?
- [ ] Có registry pattern cho extension points không?
- [ ] Interface có clean và focused không?
- [ ] **Switch/case trên open union có default handler không?**
- [ ] Có phải peer dependency thay vì direct dependency không?
- [ ] Có @internal tag cho internal exports không?
- [ ] Có JSDoc cho public API không?
- [ ] Error classes có code và retryable flag không?
- [ ] Events có typed với Zod schemas không?
- [ ] Package có đúng 1 capability seam / backend / tool family không (không god-package)?
- [ ] Dependency graph có acyclic + `workspace:*` + peerDeps đúng không?
- [ ] Contract package có deps tối thiểu không (`schema` chỉ zod; `plugin` chỉ `@vinhnt-sdk/core`; `security`/`tool-saga` zero-dep)?
- [ ] ModelProvider stream có optional + 2 nhánh kernel không?
- [ ] Provider adapter có raw fetch, không AI SDK, không hardcoded model/URL không?
- [ ] Sandbox fail-closed (`SandboxUnavailableError`) hay silent-downgrade khi không khả dụng?
- [ ] Store write có versioned/CAS (so sánh seq trước upsert) để tránh lost-update không?
- [ ] Kill process có tree-scoped (`killProcessTree`) không?
- [ ] Edit file có serialize per-file khi agent concurrent không?

## Agent SDK Ecosystem Patterns (từ comprehensive research 2026-09-18)

### Guardrail Tripwires (từ OpenAI Agents SDK)

```typescript
// Input guardrail — tripwire pattern
interface InputGuardrail {
  name: string;
  check: (ctx: GuardContext, input: unknown) => Promise<GuardrailResult>;
}

interface GuardrailResult {
  tripwireTriggered: boolean;  // true = block execution
  outputInfo?: unknown;        // context for logging/UI
}

// Usage
const injectionGuard: InputGuardrail = {
  name: "injection-detection",
  check: async (ctx, input) => {
    if (containsInjection(input)) {
      return { tripwireTriggered: true, outputInfo: "Injection detected" };
    }
    return { tripwireTriggered: false };
  },
};
```

### Monotonic Guards (từ DeepSeek Harness)

```typescript
// Guards can ONLY deny, never reopen — prevents policy weakening
type GuardDecision = "allow" | "deny" | "escalate";

// Monotonic pipeline: once denied, stays denied
// Later listeners CANNOT override a deny decision
interface ToolGuard {
  check: (ctx: GuardContext, toolCall: ToolCall) => Promise<GuardDecision>;
}

// Example: permission guard denies, sandbox guard cannot reopen
const permissionGuard: ToolGuard = {
  check: async (ctx, toolCall) => {
    if (!isAllowed(toolCall)) return "deny";
    return "allow";
  },
};
// Even if later guard returns "allow", the "deny" sticks
```

### MCP 2026 Stateless Pattern

```typescript
// Per-request metadata (no session state)
interface McpRequestMeta {
  protocolVersion: string;      // "2026-07-28"
  clientInfo: { name: string; version: string };
  clientCapabilities: Record<string, unknown>;
}

// MRTR: Server returns InputRequiredResult instead of initiating requests
interface InputRequiredResult {
  resultType: "input_required";
  inputRequests: Record<string, InputRequest>;
  requestState: string;  // HMAC-protected
}

// Client retries with inputResponses
interface InputResponses {
  [requestId: string]: { type: string; value: unknown };
}
```

### Workflow Primitives (từ Google ADK)

```typescript
// Sequential — agents run in order
const result = await sequential([agentA, agentB, agentC], { input });

// Parallel — agents run concurrently
const results = await parallel([agentA, agentB], { input });

// Loop — agent runs until condition
const result = await loop(agent, {
  input,
  maxIterations: 10,
  until: (result) => result.quality > 0.8,
});

// Handoff — full control transfer
const triageAgent = defineAgent({
  handoffs: [billingAgent, refundAgent],
  // Model calls transfer_to_billing_agent → full control transfer
});
```

### Structured Tracing (từ OpenAI Agents SDK)

```typescript
// Span hierarchy
interface Trace {
  id: string;
  spans: Span[];
}

interface Span {
  type: "agent" | "turn" | "generation" | "tool" | "guardrail" | "handoff";
  name: string;
  startTime: number;
  endTime: number;
  attributes: Record<string, unknown>;
  parentSpanId?: string;
}

// OTel-compatible export
interface TracingProcessor {
  onTraceStart(trace: Trace): void;
  onSpanStart(span: Span): void;
  onSpanEnd(span: Span): void;
  onTraceEnd(trace: Trace): void;
}
```

### Plugin Hook System (từ OpenCode)

```typescript
// Typed hooks with before/after pattern
interface PluginHooks {
  "tool.execute.before": (ctx: HookContext, toolCall: ToolCall) => Promise<void>;
  "tool.execute.after": (ctx: HookContext, result: ToolResult) => Promise<void>;
  "session.create": (ctx: HookContext, session: Session) => Promise<void>;
  "agent.turn.start": (ctx: HookContext, turn: Turn) => Promise<void>;
  "agent.turn.end": (ctx: HookContext, turn: Turn) => Promise<void>;
}

// Plugin registers hooks
const auditPlugin: Plugin = {
  name: "audit",
  hooks: {
    "tool.execute.after": async (ctx, result) => {
      await auditLog.record({ tool: result.toolName, success: result.success });
    },
  },
};
```

### Permission Modes (từ Claude Agent SDK)

```typescript
type PermissionMode =
  | "default"           // Interactive approval
  | "acceptEdits"       // Auto-approve file edits
  | "plan"              // Explore only, no edits
  | "dontAsk"           // Never prompt, deny all that need approval
  | "auto"              // Model-based classifier decides
  | "bypassPermissions"; // Run everything (CI/containers only)
```

### ToolMiddleware (Phase 6 Pattern)

```typescript
// Intercept tool execution for logging, validation, transformation
interface ToolMiddleware {
  name: string;
  before?: (ctx: ToolContext, toolCall: ToolCall) => Promise<ToolCall | null>;
  after?: (ctx: ToolContext, result: ToolResult) => Promise<ToolResult>;
  error?: (ctx: ToolContext, error: SdkError) => Promise<SdkError>;
}

// Usage
const loggingMiddleware: ToolMiddleware = {
  name: "logging",
  before: async (ctx, toolCall) => {
    console.log(`Executing tool: ${toolCall.name}`);
    return toolCall;
  },
  after: async (ctx, result) => {
    console.log(`Tool ${result.toolName} completed in ${result.duration}ms`);
    return result;
  },
};
```

### TelemetryProvider (Phase 7 Pattern)

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

// Per-call override
const result = await agent.run({
  input: "Hello",
  telemetry: { isEnabled: true, recordInputs: true },
});
```

### Mock-First Testing (Phase 8 Pattern)

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

## Files tham khảo

- `.agents/research/hardcoded-data-violations.md` — 42 vi phạm hiện tại
- `.agents/research/library-design-violations.md` — Vi phạm theo package
- `.agents/research/library-design-principles.md` — Best practices
- `.agents/research/deepseek-harness-learnings.md` — Mọi thứ là plugin + package topology
- `.agents/research/opencode-learnings.md` — Boundary package + plugin v2 + SessionV2 replay
- `.agents/research/package-split-proposal.md` — Bảng tách 18–22 packages + 5 tiêu chí
- `.agents/research/openai-compat-gap-audit.md` — Gap table OpenAI-compat + thiết kế provider layer
- `.agents/research/agent-sdk-comprehensive-comparison-2026.md` — So sánh 8 agent SDKs + MCP 2026-07-28
- `.agents/plans/2026-09-18_agent-sdk-refactor-plan.md` — Plan refactor 7 phases基于 research
- `.agents/plans/2026-08-09_production-grade-roadmap.md` — Production-grade roadmap
- `.agents/plans/2026-08-16_multi-package-refactor.md` — Master plan thực thi 5 phases