---
title: "@vinhnt-sdk/lsp"
description: "LSP integration and diagnostics"
lang: "en"
type: "reference"
category: "API Reference"
version: "0.1.3"
sidebarLabel: "lsp"
---

# @vinhnt-sdk/lsp

Language Server Protocol integration for code intelligence — diagnostics, completions, and symbol information.

## Exports

### `LspPool`

Manage multiple LSP server connections efficiently.

```ts
import { LspPool } from "@vinhnt-sdk/lsp";

const pool = new LspPool({
  maxConnections: 5,
  idleTimeout: 30000,
});

const client = await pool.acquire("typescript");
// ... use client
pool.release(client);

await pool.shutdown();
```

**Methods:**

| Method | Description |
| --- | --- |
| `acquire(language)` | Acquire a client for a language |
| `release(client)` | Release a client back to the pool |
| `getActiveCount()` | Get number of active connections |
| `shutdown()` | Close all connections |

---

### `LspClient`

Individual LSP server connection.

```ts
import { LspClient } from "@vinhnt-sdk/lsp";

const client = new LspClient({
  serverId: "typescript",
  rootUri: "file:///workspace",
});

await client.initialize();
const diagnostics = await client.getDiagnostics("file:///src/index.ts");
await client.shutdown();
```

**Methods:**

| Method | Description |
| --- | --- |
| `initialize()` | Start and initialize the LSP server |
| `getDiagnostics(uri)` | Get diagnostics for a file |
| `getCompletions(uri, position)` | Get completions at a position |
| `getSymbols(uri)` | Get document symbols |
| `didOpen(uri, text)` | Notify server of opened file |
| `didChange(uri, text)` | Notify server of file changes |
| `shutdown()` | Shut down the server |

---

### `DiagnosticStore`

Store and query diagnostics across files.

```ts
import { DiagnosticStore } from "@vinhnt-sdk/lsp";

const store = new DiagnosticStore();

store.set("file:///src/a.ts", [...diagnostics]);
store.set("file:///src/b.ts", [...diagnostics]);

const errors = store.getBySeverity("error");
const fileDiags = store.get("file:///src/a.ts");
const summary = store.getSummary(); // { files: 2, errors: 3, warnings: 5 }
```

**Methods:**

| Method | Description |
| --- | --- |
| `set(uri, diagnostics)` | Set diagnostics for a file |
| `get(uri)` | Get diagnostics for a file |
| `getBySeverity(severity)` | Get all diagnostics of a severity |
| `getSummary()` | Get diagnostic count summary |
| `clear()` | Clear all stored diagnostics |

---

### `LspServerRegistry`

Registry of LSP server definitions.

```ts
import { LspServerRegistry } from "@vinhnt-sdk/lsp";

const registry = new LspServerRegistry();
registry.register({
  id: "custom-lang",
  name: "Custom Language",
  command: "custom-lsp",
  args: ["--stdio"],
  languages: ["custom"],
});

const def = registry.get("custom-lang");
const all = registry.getAll();
```

---

### `createLspTools(pool)`

Create LSP tool definitions for use with agent tooling.

```ts
import { createLspTools, LspPool } from "@vinhnt-sdk/lsp";

const pool = new LspPool();
const tools = createLspTools(pool);

// tools can be passed to an agent's tool registry
agent.registerTools(tools);
```

---

### `DEFAULT_LSP_SERVERS`

Built-in server definitions for common languages.

```ts
import { DEFAULT_LSP_SERVERS } from "@vinhnt-sdk/lsp";

// Available servers:
// typescript, python, go, rust, java, csharp, ruby, php, swift, kotlin
const tsServer = DEFAULT_LSP_SERVERS.typescript;
```

---

## Deprecated Functions

The following functions use a cached singleton and are deprecated:

| Function | Replacement |
| --- | --- |
| `findServerByExtension(ext)` | Use `LspServerRegistry.get()` |
| `findServerById(id)` | Use `LspServerRegistry.get()` |
| `getLanguageId(filename)` | Use `LspServerRegistry` directly |

## Types

### `LspServerDefinition`

```ts
interface LspServerDefinition {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  languages: string[];
  extensions: string[];
  initializationOptions?: Record<string, unknown>;
}
```

### `LspServerConfig`

```ts
interface LspServerConfig {
  rootUri: string;
  capabilities?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  trace?: "off" | "messages" | "verbose";
}
```

### `LspDiagnostics`

```ts
interface LspDiagnostics {
  uri: string;
  version: number;
  diagnostics: Array<{
    range: { start: { line: number; character: number }; end: { line: number; character: number } };
    severity: 1 | 2 | 3 | 4;
    source: string;
    message: string;
    code?: string | number;
  }>;
}
```

## Dependencies

- `@vinhnt-sdk/schema` — validation of server definitions and configs
- `@vinhnt-sdk/tools` — tool definition creation for agent integration
- `@vinhnt-sdk/core` — event system and lifecycle management
