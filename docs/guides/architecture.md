# Architecture

> System design, dependency graph, and layer model of vinhnt-sdk.

---

## Design Principles

### 1. Modularity

Each package is independently publishable and can be used in isolation. You can use `@vinhnt-sdk/core` without `@vinhnt-sdk/tools`, or `@vinhnt-sdk/schema` without anything else.

### 2. Separation of Concerns

| Layer | Responsibility |
|-------|---------------|
| **Foundation** | Types, schemas, contracts |
| **Core** | Agent runtime, orchestration, workflows |
| **Tools** | Built-in tools, memory, security |
| **Integrations** | MCP, LSP, RAG |

### 3. Convention over Configuration

- Tool discovery: `.vnt/tools/`
- Skill discovery: `.vnt/skills/`, `.claude/skills/`, `.agents/skills/`
- Agent discovery: `.vnt/agents/`
- Config: `vnt.config.json` or `.vnt/config.json`

### 4. Dependency Injection

The kernel accepts interfaces, not implementations. Swap `NullRunEventStore` for your custom implementation without changing business logic.

---

## Package Dependency Graph

```mermaid
graph TD
    subgraph "Foundation (no internal deps)"
        schema["schema"]
    end

    subgraph "Core"
        core["core"]
        plugin["plugin"]
    end

    subgraph "Tools"
        tools["tools"]
        knowledge["knowledge"]
        security["security"]
    end

    subgraph "Integrations"
        mcp["mcp"]
        lsp["lsp"]
        rag["rag"]
    end

    core --> schema
    tools --> schema
    tools --> security
    knowledge --> schema
    knowledge --> tools
    plugin --> core
    mcp --> core
    mcp --> schema
    lsp --> core
    lsp --> schema
    rag --> core
    rag --> schema

    style schema fill:#4a9eff,color:#fff
    style core fill:#ff6b6b,color:#fff
    style plugin fill:#ff6b6b,color:#fff
    style tools fill:#51cf66,color:#fff
    style knowledge fill:#51cf66,color:#fff
    style security fill:#51cf66,color:#fff
    style mcp fill:#ffd43b,color:#000
    style lsp fill:#ffd43b,color:#000
    style rag fill:#ffd43b,color:#000
```

---

## Core Architecture

### The Kernel

The `AgentKernel` is the central runtime. It orchestrates the entire agent loop:

```mermaid
graph TD
    PROMPT["User Prompt"] --> KERNEL["AgentKernel"]
    KERNEL --> CTX["Build System Context"]
    CTX --> MODEL["Model Caller"]
    MODEL -->|"text response"| DONE["Run Completed"]
    MODEL -->|"tool calls"| TOOLS["Tool Registry"]
    TOOLS --> EXEC["Tool Execution"]
    EXEC --> PERM["Permission Gate"]
    PERM -->|"allow"| RUN["Execute Tool"]
    PERM -->|"ask"| USER["Ask User"]
    PERM -->|"deny"| SKIP["Skip Tool"]
    RUN --> EVENTS["Event Bus"]
    SKIP --> EVENTS
    USER --> EVENTS
    EVENTS -->|"loop back"| MODEL

    style KERNEL fill:#ff6b6b,color:#fff
    style MODEL fill:#4a9eff,color:#fff
    style TOOLS fill:#51cf66,color:#fff
    style PERM fill:#ffd43b,color:#000
    style EVENTS fill:#ff922b,color:#fff
```

**Run Loop:**
1. Receive prompt
2. Build system context (agent config, skills, memory)
3. Call model with messages + tool definitions
4. If model returns tool calls → execute tools → loop back to step 3
5. If model returns text → emit completion event
6. Check termination conditions (max steps, doom detection, etc.)

### Tool System

Tools are the primary extension point:

```mermaid
graph LR
    DEFINE["defineTool()"] --> REGISTRY["ToolRegistry"]
    REGISTRY --> KERNEL["AgentKernel"]
    KERNEL --> GATE["Permission Gate"]
    GATE --> EXEC["Tool Sandbox"]
    EXEC --> RESULT["Tool Result"]

    style DEFINE fill:#4a9eff,color:#fff
    style REGISTRY fill:#51cf66,color:#fff
    style GATE fill:#ffd43b,color:#000
    style EXEC fill:#ff6b6b,color:#fff
```

Each tool has:
- **Name** — Unique identifier
- **Description** — What the tool does (used by LLM for selection)
- **Input Schema** — Zod schema for input validation
- **Risk Level** — `low`, `medium`, `high` (gates permission checks)
- **Execute** — The actual implementation

### Permission System

```mermaid
graph TD
    CALL["Tool Call"] --> GATE{"Permission Gate"}
    GATE -->|"rule: allow"| ALLOW["Allow"]
    GATE -->|"rule: deny"| DENY["Deny"]
    GATE -->|"rule: ask"| ASK["Ask User"]
    GATE -->|"no rule"| DEFAULT["Default Policy"]

    ALLOW --> EXEC["Execute Tool"]
    DENY --> BLOCK["Block"]
    ASK --> USER{"User Decides"}
    USER -->|approve| EXEC
    USER -->|reject| BLOCK
    DEFAULT --> EXEC

    style GATE fill:#ffd43b,color:#000
    style ALLOW fill:#51cf66,color:#fff
    style DENY fill:#ff6b6b,color:#fff
    style ASK fill:#ff922b,color:#fff
```

Rules use glob patterns:
```jsonc
{
  "rules": [
    { "pattern": "read_*", "effect": "allow" },
    { "pattern": "write_*", "effect": "ask" },
    { "pattern": "delete_*", "effect": "deny" }
  ]
}
```

### Event System

The kernel emits typed events throughout the run lifecycle:

| Event | When |
|-------|------|
| `run.started` | Run begins |
| `step.started` | Each step begins |
| `tool.invoked` | Tool call starts |
| `tool.completed` | Tool call succeeds |
| `tool.failed` | Tool call fails |
| `token.streamed` | Streaming token received |
| `step.completed` | Step finishes |
| `run.completed` | Run finishes |
| `permission.requested` | User approval needed |
| `context.compressed` | Context window compacted |

### Agent Lifecycle Events

For higher-level lifecycle tracking, use `createRunHandle()`:

| Event | When |
|-------|------|
| `agent.started` | Agent run begins |
| `agent.completed` | Agent run finishes |
| `agent.error` | Agent run fails |

```typescript
const handle = kernel.createRunHandle(prompt, ctx);

handle.onEvent((event) => {
  switch (event.type) {
    case "agent.started":
      console.log("Started:", event.prompt);
      break;
    case "agent.completed":
      console.log("Status:", event.status);
      break;
    case "agent.error":
      console.log("Error:", event.error);
      break;
  }
});

const result = await handle.completed;
```

### Circuit Breaker & Retry

The kernel includes a circuit breaker with exponential backoff for model call resilience:

```typescript
const kernel = new AgentKernel({
  model,
  store,
  // Retry configuration
  maxRetries: 3,           // Max retry attempts (default: 3)
  retryBackoffMs: 1000,    // Base delay for backoff (default: 1000ms)
  maxRetryBackoffMs: 30000, // Max backoff delay (default: 30000ms)
});
```

### Event Bus Stream with Replay

For durable event streaming with historical replay:

```typescript
const bus = new InMemoryEventBus();

// Publish durable events
bus.publish(DurableEvent, { data: 1 }, { aggregateId: "run-1" });

// Stream with replay - yields historical events first, then live events
for await (const event of bus.streamWithReplay(DurableEvent, "run-1")) {
  console.log(event);
}
```

---

## Data Flow

```mermaid
graph TD
    USER["User Prompt"] --> KERNEL["AgentKernel"]
    KERNEL --> MODEL["Model Caller"]
    MODEL --> TOOLS["Tool Registry"]
    TOOLS --> SESSION["Session State"]
    TOOLS --> EVENTS["Event Bus"]
    SESSION --> STORE["Store"]
    EVENTS --> OBSERVE["Observability"]
    MODEL --> RESULT["Result"]

    style USER fill:#4a9eff,color:#fff
    style KERNEL fill:#ff6b6b,color:#fff
    style STORE fill:#51cf66,color:#fff
    style OBSERVE fill:#ff922b,color:#fff
```

---

## Conventions

### File Structure

```
project/
├── .vnt/
│   ├── config.json          # Agent configuration
│   ├── tools/               # Custom tools (auto-discovered)
│   │   └── my-tool.ts
│   ├── skills/              # Skill definitions
│   │   └── coding.yaml
│   └── agents/              # Agent definitions
│       └── assistant.yaml
├── vnt.config.json          # Alternative config location
└── package.json
```

### Tool Naming

- Use `snake_case` for tool names
- Prefix with domain: `file_read`, `git_commit`, `web_fetch`
- Use wildcards in permissions: `file_*`, `git_*`
