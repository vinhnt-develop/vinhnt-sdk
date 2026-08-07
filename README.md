# VinhNT SDK

AI Agent Core Libraries — publishable npm packages for building AI coding agents.

## Packages

| Package | Description |
|---------|-------------|
| `@vinhnt-sdk/agent-core` | Core agent engine — kernel, tools, sessions, plugins, permissions |
| `@vinhnt-sdk/schema` | Shared Zod schemas — tool definitions, event types, ACP protocol |
| `@vinhnt-sdk/config` | Typed configuration schema, validation, hierarchical config |
| `@vinhnt-sdk/mcp` | MCP client pool, transport, reconnect, ACP bridge |
| `@vinhnt-sdk/persistence` | Drizzle ORM stores — SQLite and PostgreSQL |
| `@vinhnt-sdk/model-adapters` | OpenAI, Anthropic, Google adapters via AI SDK |
| `@vinhnt-sdk/observability` | Logging, tracing, audit, OpenTelemetry |
| `@vinhnt-sdk/plugin-sdk` | Plugin SDK — define plugins with TypeScript hooks |
| `@vinhnt-sdk/lsp` | LSP client pool — 24 servers, 11 tools |
| `@vinhnt-sdk/rag` | RAG — indexing, embedding, semantic search |
| `@vinhnt-sdk/api-contract` | Shared Zod schemas for HTTP/WS API contracts |
| `@vinhnt-sdk/ui` | Shared React UI components |

## Install

```bash
npm install @vinhnt-sdk/agent-core @vinhnt-sdk/schema
```

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
