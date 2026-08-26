# Installation

> How to install and set up vinhnt-sdk in your project.

---

## Package Manager

```bash
# npm
npm install @vinhnt-sdk/core @vinhnt-sdk/schema

# pnpm
pnpm add @vinhnt-sdk/core @vinhnt-sdk/schema

# yarn
yarn add @vinhnt-sdk/core @vinhnt-sdk/schema
```

## Which Packages Do You Need?

### Minimum Viable Agent

```
@vinhnt-sdk/core      — Agent runtime, orchestration
@vinhnt-sdk/schema    — Types and schemas (installed automatically)
```

### With Built-in Tools

```
Everything above, plus:
@vinhnt-sdk/tools     — File, shell, git, web tools
@vinhnt-sdk/security  — Prompt injection protection
```

### Full Featured

```
Everything above, plus:
@vinhnt-sdk/knowledge  — Memory, compression, learning
@vinhnt-sdk/mcp       — MCP tool server connections
@vinhnt-sdk/lsp       — Code intelligence
@vinhnt-sdk/rag       — Semantic search
@vinhnt-sdk/plugin    — Plugin system
```

## Peer Dependencies

Some packages have optional peer dependencies:

| Package | Peer Dependency | Required? |
|---------|----------------|-----------|
| `@vinhnt-sdk/knowledge` | `@vinhnt-sdk/tools` | For tool definitions |
| `@vinhnt-sdk/rag` | `better-sqlite3` | For vector storage |

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
# Required for AI providers (if using)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db
```
