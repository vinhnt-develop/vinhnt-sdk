# Installation

> How to install and set up vinhnt-sdk in your project.

---

## Package Manager

```bash
# npm
npm install @vinhnt-sdk/core @vinhnt-sdk/schema @vinhnt-sdk/adapters

# pnpm
pnpm add @vinhnt-sdk/core @vinhnt-sdk/schema @vinhnt-sdk/adapters

# yarn
yarn add @vinhnt-sdk/core @vinhnt-sdk/schema @vinhnt-sdk/adapters
```

## Which Packages Do You Need?

### Minimum Viable Agent

```
@vinhnt-sdk/core      — Agent runtime, tool system
@vinhnt-sdk/schema    — Types and schemas (installed automatically)
@vinhnt-sdk/adapters  — AI model providers
```

### Production Agent

```
Everything above, plus:
@vinhnt-sdk/store     — Database persistence
@vinhnt-sdk/otel      — Logging and tracing
```

### Full Platform

```
Everything above, plus:
@vinhnt-sdk/mcp       — MCP tool server connections
@vinhnt-sdk/lsp       — Code intelligence
@vinhnt-sdk/rag       — Semantic search
@vinhnt-sdk/plugin    — Plugin system
@vinhnt-sdk/api       — WebSocket/REST contracts
@vinhnt-sdk/ui        — React components
```

## Peer Dependencies

Some packages have optional peer dependencies:

| Package | Peer Dependency | Required? |
|---------|----------------|-----------|
| `@vinhnt-sdk/adapters` | `ai` | Yes (Vercel AI SDK) |
| `@vinhnt-sdk/adapters` | `@ai-sdk/openai` | For OpenAI |
| `@vinhnt-sdk/adapters` | `@ai-sdk/anthropic` | For Anthropic |
| `@vinhnt-sdk/adapters` | `@ai-sdk/google` | For Gemini |
| `@vinhnt-sdk/adapters` | `tiktoken` | For token counting |
| `@vinhnt-sdk/store` | `better-sqlite3` | For SQLite |
| `@vinhnt-sdk/store` | `pg` | For PostgreSQL |
| `@vinhnt-sdk/rag` | `better-sqlite3` | For vector storage |
| `@vinhnt-sdk/core` | `better-sqlite3` | For local caching |
| `@vinhnt-sdk/core` | `tiktoken` | For token counting |

Install peers as needed:

```bash
# For OpenAI + SQLite
npm install ai @ai-sdk/openai better-sqlite3

# For Anthropic + PostgreSQL
npm install ai @ai-sdk/anthropic pg

# For full featured
npm install ai @ai-sdk/openai @ai-sdk/anthropic better-sqlite3 tiktoken
```

## TypeScript Configuration

vinhnt-sdk requires TypeScript 5.0+ and targets ES2022.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  }
}
```

## Environment Variables

```bash
# Required for AI providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional: API authentication
VNT_API_TOKEN=your-api-token

# Optional: Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db
```
