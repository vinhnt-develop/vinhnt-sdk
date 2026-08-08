# @vinhnt-sdk/lsp

> LSP client pool for code intelligence — diagnostics, symbols, hover, definitions.

**npm:** `npm install @vinhnt-sdk/lsp`  
**Size:** ~33 KB  
**Dependencies:** `@vinhnt-sdk/core`, `@vinhnt-sdk/schema`

---

## Overview

`lsp` connects to language servers to provide:

- **Diagnostics** — Errors, warnings, hints
- **Symbols** — Functions, classes, variables
- **Hover** — Type information, documentation
- **Definitions** — Go to definition
- **References** — Find all references

## Installation

```bash
npm install @vinhnt-sdk/lsp
```

## Exports

### LspPool

```typescript
import { LspPool } from "@vinhnt-sdk/lsp";

const pool = new LspPool({
  idleTimeout: 30000,  // Disconnect idle servers after 30s
});

// Auto-detect and connect to language servers
await pool.connectAll();

// Get diagnostics for a file
const diagnostics = await pool.getDiagnostics("src/main.ts");

// Get symbols
const symbols = await pool.getSymbols("src/main.ts");

// Disconnect
await pool.disconnectAll();
```

### LspClient

```typescript
import { LspClient } from "@vinhnt-sdk/lsp";

const client = new LspClient({
  serverId: "typescript",
  command: "typescript-language-server",
  args: ["--stdio"],
});

await client.connect();

// Get diagnostics
const diagnostics = await client.getDiagnostics("src/main.ts");

// Get hover info
const hover = await client.getHover("src/main.ts", { line: 10, character: 5 });

// Get definition location
const definition = await client.getDefinition("src/main.ts", { line: 10, character: 5 });

await client.disconnect();
```

### Diagnostics

```typescript
import { DiagnosticStore, formatDiagnostics, countErrors } from "@vinhnt-sdk/lsp";

const store = new DiagnosticStore();

// Store diagnostics
store.update("src/main.ts", diagnostics);

// Format for display
const formatted = formatDiagnostics(store.get("src/main.ts"));

// Count issues
const errors = countErrors(diagnostics);
```

### LSP Tools

```typescript
import { createLspTools } from "@vinhnt-sdk/lsp";

// Create all LSP tools
const lspTools = createLspTools({ pool });

// Or create individual tools
const diagTool = createLspDiagnosticsTool({ pool });
const symbolsTool = createLspSymbolsTool({ pool });
```

### Server Registry

```typescript
import { BUILTIN_SERVERS, findServerByExtension } from "@vinhnt-sdk/lsp";

// Find server for file extension
const server = findServerByExtension(".ts");
// { id: "typescript", command: "typescript-language-server", args: ["--stdio"] }

// List built-in servers
console.log(BUILTIN_SERVERS);
// [{ id: "typescript", ... }, { id: "python", ... }, ...]
```
