# GitHub Issues Templates for vinhnt-sdk Improvements

> Generated from comprehensive review (August 2026)
> Use these templates to create issues on GitHub

---

## Issue 1: [SECURITY/P0] Add Process Sandbox for Shell Tools

**Title:** `[SECURITY] Add process sandbox for shell execution tools`

**Description:**
The `createShellTool` and `execute_command` tools pass user input directly to shell execution without sandboxing. The `ToolSandbox` only provides timeout wrappers, not process isolation.

**Current Behavior:**
- User input passed directly to shell
- No process group isolation
- No filesystem/network restrictions
- Windows process tree cleanup silently skipped (`descendants()` returns `[]`)

**Expected Behavior:**
- Docker container or nsjail sandbox for shell execution
- Process group isolation at minimum
- Filesystem access restricted to workspace root
- Network access configurable per tool risk level

**References:**
- OpenAI Codex uses Seatbelt (macOS) and bubblewrap (Linux) for sandboxing
- Industry best practice: all production coding agents sandbox shell execution

**Labels:** `security`, `priority/critical`, `area/core`

---

## Issue 2: [SECURITY/P0] Add Prompt Injection Protection

**Title:** `[SECURITY] Add input sanitization and output escaping for LLM interactions`

**Description:**
No sanitization of user input before sending to the model. Tool outputs are injected into context without escaping. Model responses are not validated against a schema.

**Current Behavior:**
- Raw user input sent to model
- Tool outputs interpolated directly into context
- Model could return arbitrary text interpreted as tool calls

**Expected Behavior:**
- Input sanitization layer before model calls
- Tool output escaping to prevent context manipulation
- Model response validation against expected schema
- Structured error handling for malformed responses

**Labels:** `security`, `priority/critical`, `area/core`

---

## Issue 3: [SECURITY/P1] Add API Key Redaction in Logs

**Title:** `[SECURITY] Redact API keys and secrets in logs and error messages`

**Description:**
`MultiProviderRegistry` stores API keys in-memory as plain strings. `ProviderConfig.apiKey` is never redacted in logs or error messages. The `config` package marks `apiKey` fields with `validation: { secret: true }` but only for UI display.

**Current Behavior:**
- API keys stored as plain strings in memory
- Keys may appear in error messages and logs
- No redaction middleware for logging

**Expected Behavior:**
- API keys encrypted at rest (or at minimum redacted in logs)
- Log redaction middleware that strips secrets
- Error messages never include raw API keys
- Consider using OS keychain for key storage

**Labels:** `security`, `priority/high`, `area/adapters`

---

## Issue 4: [ARCHITECTURE/P1] Decompose AgentKernelConfig God-Object

**Title:** `[ARCH] Decompose AgentKernelConfig into nested config groups`

**Description:**
`AgentKernelConfig` has 45+ optional properties, making it a god-object configuration interface. This should be decomposed into focused, nested config groups.

**Current:**
```typescript
interface AgentKernelConfig {
  // 45+ properties mixed together
}
```

**Proposed:**
```typescript
interface AgentKernelConfig {
  sandbox: SandboxConfig;
  circuitBreaker: CircuitBreakerConfig;
  permissions: PermissionConfig;
  model: ModelConfig;
  session: SessionConfig;
  tools: ToolConfig;
  plugins: PluginConfig;
  // Each group has its own validation and defaults
}
```

**Benefits:**
- Easier to understand and maintain
- Each group can be validated independently
- Better TypeScript inference
- Smaller API surface per group

**Labels:** `architecture`, `priority/high`, `area/core`

---

## Issue 5: [FEATURE/P1] Add Streaming Support in Kernel Run Loop

**Title:** `[FEATURE] Integrate streaming into AgentKernel run loop`

**Description:**
The `AiSdkModelProvider` has a `stream()` method but the kernel's `runLoop` only uses `generate()`. This prevents real-time UI updates and streaming responses.

**Current Behavior:**
- `runLoop` calls `generate()` which blocks until complete
- No intermediate tokens sent to UI
- User waits for full response

**Expected Behavior:**
- Kernel run loop supports streaming mode
- Tokens streamed to UI in real-time
- Tool calls still work with streaming
- Fallback to non-streaming when needed

**Labels:** `feature`, `priority/high`, `area/core`, `area/ui`

---

## Issue 6: [FEATURE/P1] Add Cost Tracking Dashboard

**Title:** `[FEATURE] Add aggregated token cost tracking and budget enforcement`

**Description:**
Token counting exists but there is no aggregated cost dashboard or budget enforcement. Enterprise users need cost visibility and controls.

**Expected Features:**
- Real-time token cost tracking per session/run
- Budget limits with automatic shutdown
- Cost breakdown by model, tool, agent
- Historical cost analysis
- Cost optimization suggestions (e.g., "use cheaper model for this task")

**Labels:** `feature`, `priority/high`, `area/otel`

---

## Issue 7: [RELIABILITY/P2] Add Graceful Shutdown Orchestration

**Title:** `[RELIABILITY] Add lifecycle manager for graceful shutdown`

**Description:**
No graceful shutdown orchestration for MCP clients, LSP servers, and database connections. Process termination may leave resources in inconsistent state.

**Expected Behavior:**
- Shutdown hook that closes all MCP client connections
- LSP server process cleanup
- Database connection pool draining
- In-flight tool executions completed or aborted cleanly
- Signal handlers for SIGTERM/SIGINT

**Labels:** `reliability`, `priority/medium`, `area/core`

---

## Issue 8: [FEATURE/P2] Add Agent-to-Agent Protocol (A2A) Support

**Title:** `[FEATURE] Add A2A protocol support for agent-to-agent communication`

**Description:**
Google's A2A (Agent-to-Agent) protocol is becoming the industry standard for agent-to-agent communication (Linux Foundation). Adding support would enable interop with other agent frameworks.

**Current:** Only MCP (agent-to-tool) is supported.
**Proposed:** Add A2A client/server alongside MCP.

**Benefits:**
- Interop with Google ADK, Microsoft Agent Framework
- Multi-agent orchestration across frameworks
- Future-proofing as A2A adoption grows

**Labels:** `feature`, `priority/medium`, `area/mcp`

---

## Issue 9: [FEATURE/P2] Add Graph-Based Workflow Engine

**Title:** `[FEATURE] Add graph-based workflow execution engine`

**Description:**
Google ADK and Microsoft Agent Framework both offer graph-based workflow execution for deterministic multi-agent orchestration. This is a key pattern for production agent systems.

**Expected Features:**
- Visual workflow definition (DAG)
- Node types: Agent, Tool, Condition, Loop
- Fan-out/fan-in patterns
- Checkpointing and resume
- Human-in-the-loop nodes
- Type-safe routing between nodes

**Labels:** `feature`, `priority/medium`, `area/core`

---

## Issue 10: [QUALITY/P2] Fix Documentation Sync Issues

**Title:** `[DOCS] Fix out-of-sync documentation examples`

**Description:**
Several documentation examples are out of sync with the actual API:

1. Quick-start shows `handle.events` (async iterable) but actual API is `handle.completed` (Promise)
2. No JSDoc on public interfaces (`ModelProvider`, `ToolDefinition`, `EventBus`, `AgentKernelConfig`)
3. No CHANGELOG despite versioning infrastructure in `versioned.ts`

**Labels:** `documentation`, `priority/medium`

---

## Issue 11: [QUALITY/P3] Add Tool Search / Deferred Loading

**Title:** `[FEATURE] Add tool search and deferred loading for large tool sets`

**Description:**
OpenAI and Anthropic both support deferred tool loading (tool_search, defer_loading). When agents have 50+ tools, loading all tool definitions into context wastes tokens.

**Expected Behavior:**
- Mark tools with `defer_loading: true`
- Agent searches for relevant tools on-demand
- Only matched tools loaded into context
- Reduces initial context consumption

**Labels:** `feature`, `priority/low`, `area/core`

---

## Issue 12: [QUALITY/P3] Refactor EventRegistry to Instance-Based

**Title:** `[REFACTOR] Replace EventRegistry global static state with instance-based`

**Description:**
`EventRegistry` uses a module-level static `Map` for global event registration. This makes testing harder (requires `EventRegistry.clear()`). Consider instance-based registry for better testability.

**Labels:** `refactor`, `priority/low`, `area/schema`
