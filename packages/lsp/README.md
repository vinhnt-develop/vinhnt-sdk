# @vinhnt-sdk/lsp

LSP client pool and tools for vinhnt-sdk — auto-detect, connect, and query language servers.

## Install

```bash
# npm
npm install @vinhnt-sdk/lsp

# pnpm (monorepo)
pnpm add @vinhnt-sdk/lsp
```

## Quick Start

```typescript
import { LspPool, createLspTools } from '@vinhnt-sdk/lsp';

const pool = new LspPool({ autoDetect: true, autoInstall: true });
await pool.start();

const tools = createLspTools(pool);
// Tools: lsp_diagnostics, lsp_symbols, lsp_hover, lsp_definition, lsp_references
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `LspPool` | Class | Connection pool for multiple LSP servers |
| `LspClient` | Class | Single LSP server connection |
| `DiagnosticStore` | Class | Version-aware diagnostic storage |
| `createLspTools` | Function | Create 5 LLM-facing LSP tools |
| `createLspToolHook` | Function | Post-tool hook for auto-diagnostics |
| `createLspContextSource` | Function | System context source for LSP data |
| `BUILTIN_SERVERS` | Const | Auto-detected server definitions |
| `findServerByExtension`, `findServerById` | Function | Server registry lookups |
| `formatDiagnostics`, `countErrors`, `countWarnings` | Function | Diagnostic formatting utilities |

## License

MIT
