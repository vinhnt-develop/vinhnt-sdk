# vinhnt-sdk Documentation

> A modular, extensible SDK for building AI agent systems.

---

## What is vinhnt-sdk?

**vinhnt-sdk** is a collection of 9 npm packages that provide the **engine** for building AI agent systems. It contains types, schemas, business logic, and utility functions — but **no HTTP server or API layer**.

You use vinhnt-sdk as the foundation, then wrap it in your own backend (e.g., NestJS, Express) to expose REST/WebSocket APIs.

| What vinhnt-sdk provides | What you build |
|--------------------------|----------------|
| Agent runtime (`AgentKernel`) | HTTP/WebSocket server |
| Tool system (`defineTool`) | REST endpoints |
| Type schemas (Zod) | Authentication middleware |
| Model provider interfaces | Database migrations |
| Security (prompt protection, secret redaction) | Business logic layer |
| Protocol integrations (MCP, LSP) | API documentation (Swagger) |

---

## Packages at a Glance

| Package | Description | npm |
|---------|-------------|-----|
| `@vinhnt-sdk/schema` | Types, contracts, model interfaces | [npm](https://npmjs.com/package/@vinhnt-sdk/schema) |
| `@vinhnt-sdk/core` | Agent kernel, orchestration, workflows | [npm](https://npmjs.com/package/@vinhnt-sdk/core) |
| `@vinhnt-sdk/tools` | Built-in tools (file, shell, git, web) | [npm](https://npmjs.com/package/@vinhnt-sdk/tools) |
| `@vinhnt-sdk/knowledge` | Memory, compression, learning engine | [npm](https://npmjs.com/package/@vinhnt-sdk/knowledge) |
| `@vinhnt-sdk/security` | Prompt injection protection, secret redaction | [npm](https://npmjs.com/package/@vinhnt-sdk/security) |
| `@vinhnt-sdk/plugin` | Plugin SDK, npm loader | [npm](https://npmjs.com/package/@vinhnt-sdk/plugin) |
| `@vinhnt-sdk/mcp` | MCP client pool, ACP bridge | [npm](https://npmjs.com/package/@vinhnt-sdk/mcp) |
| `@vinhnt-sdk/lsp` | LSP client pool, code intelligence | [npm](https://npmjs.com/package/@vinhnt-sdk/lsp) |
| `@vinhnt-sdk/rag` | RAG indexing, semantic search | [npm](https://npmjs.com/package/@vinhnt-sdk/rag) |

---

## Architecture

### Dependency Graph

```mermaid
graph TD
    schema["schema<br/>Types & Contracts"]
    core["core<br/>Agent Kernel"]
    tools["tools<br/>Built-in Tools"]
    knowledge["knowledge<br/>Memory & Learning"]
    security["security<br/>Prompt Protection"]
    plugin["plugin<br/>Plugin System"]
    mcp["mcp<br/>MCP Client"]
    lsp["lsp<br/>LSP Client"]
    rag["rag<br/>RAG Search"]

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
    style tools fill:#51cf66,color:#fff
    style knowledge fill:#51cf66,color:#fff
    style security fill:#51cf66,color:#fff
    style plugin fill:#ff6b6b,color:#fff
    style mcp fill:#ffd43b,color:#000
    style lsp fill:#ffd43b,color:#000
    style rag fill:#ffd43b,color:#000
```

### Layer Model

| Layer | Packages | Purpose |
|-------|----------|---------|
| **Foundation** | `schema` | Types, contracts, model interfaces. Zero internal dependencies. |
| **Core** | `core`, `plugin` | Agent runtime, orchestration, plugin system. |
| **Tools** | `tools`, `knowledge`, `security` | Built-in tools, memory, security. |
| **Integrations** | `mcp`, `lsp`, `rag` | Protocol integrations. |

### How It Fits Together

```mermaid
graph LR
    subgraph "Your Backend (NestJS)"
        REST["REST Controllers"]
        WS["WebSocket Gateway"]
        SVC["Agent Service"]
    end

    subgraph "vinhnt-sdk (Engine)"
        KERNEL["AgentKernel"]
        TOOLS["Tool System"]
        EVENTS["Event Bus"]
    end

    subgraph "External"
        LLM["AI Providers<br/>(OpenAI, Anthropic)"]
        MCP["MCP Servers"]
        DB["Database<br/>(SQLite/PG)"]
    end

    REST --> SVC
    WS --> SVC
    SVC --> KERNEL
    KERNEL --> TOOLS
    KERNEL --> EVENTS
    KERNEL --> LLM
    TOOLS --> MCP
    KERNEL --> DB

    style REST fill:#4a9eff,color:#fff
    style WS fill:#4a9eff,color:#fff
    style SVC fill:#ff6b6b,color:#fff
    style KERNEL fill:#ff6b6b,color:#fff
    style TOOLS fill:#ff6b6b,color:#fff
    style EVENTS fill:#ff6b6b,color:#fff
    style LLM fill:#51cf66,color:#fff
    style MCP fill:#51cf66,color:#fff
    style DB fill:#51cf66,color:#fff
```

---

## Getting Started

- **[Quick Start](./guides/quick-start.md)** — Get up and running in 5 minutes
- **[Installation](./guides/installation.md)** — Package installation and setup
- **[Configuration](./guides/configuration.md)** — Config file format and options

## Guides

- **[Architecture](./guides/architecture.md)** — System design, dependency graph, layer model
- **[Creating Tools](./guides/creating-tools.md)** — How to define custom tools
- **[Plugin Development](./guides/plugins.md)** — Writing and loading plugins
- **[MCP Integration](./guides/mcp.md)** — Connecting to MCP tool servers

## Package Reference

- [schema](./packages/schema.md) | [core](./packages/core.md) | [tools](./packages/tools.md)
- [knowledge](./packages/knowledge.md) | [security](./packages/security.md)
- [plugin](./packages/plugin.md) | [mcp](./packages/mcp.md) | [lsp](./packages/lsp.md)
- [rag](./packages/rag.md)

## Examples

- [Minimal Agent](./examples/minimal-agent.md) — Simplest possible agent setup
- [Custom Tools](./examples/custom-tools.md) — Building tools that call external APIs
- [MCP Agent](./examples/mcp-agent.md) — Agent with MCP tool servers

---

## License

MIT
