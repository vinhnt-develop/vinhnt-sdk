---
title: Architecture
description: System architecture and design principles
lang: en
type: concept
category: Architecture
sidebarPosition: 1
---

## Design Principles

vinhnt-sdk is built on four foundational principles that guide every architectural decision.

### Dependency Injection

All dependencies are injected rather than imported directly. This enables testability, modularity, and runtime flexibility.

```ts
const kernel = createKernel({
  model: openaiProvider({ apiKey: process.env.OPENAI_API_KEY }),
  tools: [searchTool, calculatorTool],
});
```

### No Hardcoded Values

Configuration, prompts, model parameters, and endpoint URLs are never hardcoded. Everything flows through configuration objects and environment variables.

### User Decisions

The agent cannot make autonomous decisions about destructive actions. Users retain control through permission gates and confirmation prompts.

### Extensibility

Every layer can be extended or replaced. Custom providers, tools, guards, and plugins integrate through well-defined interfaces.

## Package Ecosystem

The SDK consists of **18 packages** organized into two tiers.

| Tier | Packages | Purpose |
|------|----------|---------|
| Core (11) | kernel, agent, model, tool, memory, event, guard, config, provider, adapter, shared | Foundational runtime |
| Extension (7) | openai, anthropic, pinecone, web-browser, filesystem, mcp, logger | Platform integrations |

## High-Level Architecture

```mermaid
graph TB
    subgraph "Provider Layer"
        P1[OpenAI Provider]
        P2[Anthropic Provider]
        P3[Custom Providers]
    end

    subgraph "Extension Layer"
        E1[Web Browser]
        E2[Filesystem]
        E3[MCP Protocol]
        E4[Vector Store]
    end

    subgraph "Core Layer"
        K[AgentKernel]
        SE[StepExecutor]
        TR[ToolRegistry]
        PG[PermissionGate]
        EB[EventBus]
        MS[MemoryStore]
    end

    P1 --> K
    P2 --> K
    P3 --> K
    E1 --> TR
    E2 --> TR
    E3 --> TR
    E4 --> MS
    K --> SE
    SE --> PG
    SE --> EB
```

## Kernel Run-Loop

The kernel orchestrates the agent execution cycle. Each iteration processes one step through the pipeline.

```mermaid
flowchart LR
    A[User Input] --> B[AgentKernel]
    B --> C[StepExecutor]
    C --> D[Model Provider]
    D --> E{Tool Call?}
    E -->|Yes| F[ToolRegistry]
    F --> G[PermissionGate]
    G --> H[Sandbox]
    H --> I[Tool Execute]
    I --> J[Result]
    J --> C
    E -->|No| K[Guard Check]
    K --> L[Output]
```

**Step-by-step flow:**

1. **User Input** — Raw message enters the kernel
2. **AgentKernel** — Loads configuration, initializes context
3. **StepExecutor** — Manages single-step execution and history
4. **Model Provider** — Sends prompt to LLM, receives response
5. **Tool Call Decision** — Checks if model requests a tool invocation
6. **Tool Execution** — Resolves tool, checks permissions, runs in sandbox
7. **Guard Check** — Validates output against safety rules
8. **Output** — Returns final response or loops back for next step

## Tool System Flow

Tools are registered, validated, gated, and executed through a structured pipeline.

```mermaid
flowchart TD
    A[defineTool] --> B[ToolRegistry]
    B --> C[PermissionGate]
    C --> D{User Approved?}
    D -->|No| E[Rejected]
    D -->|Yes| F[Sandbox]
    F --> G[Execute]
    G --> H[Result]
    H --> I[EventBus]
```

**Key stages:**

- **defineTool** — Declare tool schema, parameters, and handler
- **ToolRegistry** — Store and lookup tools by name
- **PermissionGate** — Check if tool requires user confirmation
- **Sandbox** — Isolate execution with resource limits
- **Execute** — Run tool handler with validated parameters
- **Result** — Return structured output to the step executor

## Event System

The event bus enables decoupled communication between components.

```mermaid
flowchart LR
    A[EventDefinition] --> B[EventBus]
    B --> C[Handler 1]
    B --> D[Handler 2]
    B --> E[Handler N]
```

Events are typed and strongly defined. Handlers subscribe to specific event names and receive payloads matching the event schema.

```ts
const toolCalled = defineEvent<{
  toolName: string;
  params: Record<string, unknown>;
  timestamp: number;
}>("tool:called");

eventBus.on(toolCalled, (payload) => {
  logger.info(`Tool ${payload.toolName} invoked`);
});
```

## Data Flow

```mermaid
flowchart TD
    U[User Message] -->|string| K[Kernel Config]
    K -->|context| S[Step Executor]
    S -->|prompt| M[Model Provider]
    M -->|response| S
    S -->|tool call| T[Tool Registry]
    T -->|validated params| P[Permission Gate]
    P -->|approved| X[Sandbox Execute]
    X -->|result| S
    S -->|final| G[Guard Pipeline]
    G -->|safe| O[Output]
    G -->|blocked| R[Rejection]
    S -->|metadata| E[Event Bus]
    E -->|notifications| H[Handlers]
    S -->|history| MEM[Memory Store]
```

## Related Pages

- [Dependency Graph](/architecture/dependency-graph) — Full package dependency map
- [Design Patterns](/architecture/design-patterns) — Patterns used across the SDK
- [Package Layers](/architecture/package-layers) — Detailed layer breakdown
