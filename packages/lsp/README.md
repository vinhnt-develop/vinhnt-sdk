# @vinhnt-sdk/lsp

> Status: BETA

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
import { LspPool, formatDiagnostics } from "@vinhnt-sdk/lsp";

const pool = new LspPool();

// Dumps diagnostics for a file (starts the right language server on demand)
const diagnostics = await pool.getDiagnostics("/path/to/project/src/index.ts");
console.log(formatDiagnostics(diagnostics));
// ERROR [12:5] Cannot find name 'foo'.
// 1 error(s), 0 warning(s), 0 other

await pool.shutdownAll();
```

## API Reference

### `LspPool`

Managed pool of `LspClient`s keyed by workspace root. This is the main entry point.

```typescript
import { LspPool } from "@vinhnt-sdk/lsp";

const pool = new LspPool({
  idleTimeoutMs: 300_000,
  maxRetries: 3,
  initTimeoutMs: 45_000,
  waitDiagnosticsMs: 5_000,
});
```

**Constructor:** `new LspPool(config?: Partial<LspPoolConfig>)` — defaults from `DEFAULT_LSP_POOL_CONFIG`.

**Methods:**

| Method | Description |
|------|-------------|
| `getOrStart(filePath)` | Get (or spawn) the client for a file |
| `getOrStartForWorkspace(filePath, workspaceRoot)` | Same, with an explicit workspace root |
| `getDiagnostics(filePath)` | Diagnostics for a file (`LspDiagnostic[]`) |
| `waitAndGetDiagnostics(filePath, sinceVersion?)` | Wait for fresh diagnostics past a version |
| `diagnosticsVersion(filePath)` | Current diagnostics version |
| `touchFile(filePath, content)` | Notify the server of file content |
| `closeFile(filePath)` | Close a file on its server |
| `getClient(serverId, filePath?)` | Get a running client |
| `getStatus()` | Status of running servers (`LspServerStatus[]`) |
| `warmWorkspace(root)` | Pre-start servers for a workspace |
| `shutdownRoot(root)` / `shutdownAll()` | Stop servers |
| `detectMissing()` | Servers whose commands are not installed |
| `autoInstall(def)` / `autoInstallMissing()` | Install missing servers |
| `registerCustomServers(servers)` / `applyCustomServers(servers)` | Add custom server definitions |
| `setActiveRoots(roots)` | Restrict which workspace roots are active |

### `LspClient`

A single language server connection. Most users go through `LspPool`, which manages clients.

```typescript
const client = await pool.getOrStart("/path/to/file.ts");
if (client) {
  const hover = await client.getHover("file:///path/to/file.ts", { line: 4, character: 10 });
  const completions = await client.getCompletion("file:///path/to/file.ts", { line: 4, character: 10 });
}
```

**Constructor:** `new LspClient(definition, root, initTimeoutMs, events?)`.

**Lifecycle:** `start()`, `shutdown()`, `openFile(uri, languageId, text)`, `changeFile(uri, text)`, `closeFile(uri)`.

**Queries:**
`getDiagnostics(uri)`, `getSymbols(query)`, `getHover(uri, position)`, `getDefinition(uri, position)`, `getReferences(uri, position)`, `getCompletion(uri, position)`, `getTypeDefinition(uri, position)`, `getImplementation(uri, position)`, `getSignatureHelp(uri, position)`, `getDocumentSymbols(uri)`, `getCodeActions(uri, range, context)`, `getFormatting(uri, options)`, `getRename(uri, position, newName)`.

### `BUILTIN_SERVERS` / `LspServerRegistry`

```typescript
import { BUILTIN_SERVERS, LspServerRegistry } from "@vinhnt-sdk/lsp";

// Built-in definitions (TypeScript, JavaScript, Python, ...)
const ts = BUILTIN_SERVERS.find((s) => s.id === "typescript");

// Or a registry with custom lookups
const registry = new LspServerRegistry(BUILTIN_SERVERS);
registry.register({
  id: "golang",
  name: "Go",
  languageId: "go",
  extensions: [".go"],
  command: "gopls",
  args: ["stdio"],
  rootFiles: ["go.mod"],
});
const server = registry.findByExtension(".ts");
const languageId = registry.getLanguageId(".ts");
```

**Registry methods:** `register(def)`, `registerAll(defs)`, `findByExtension(ext)`, `findById(id)`, `getLanguageId(ext)`, `list()`.

### `DiagnosticStore` / `formatDiagnostics`

```typescript
import { DiagnosticStore, formatDiagnostics } from "@vinhnt-sdk/lsp";

const store = new DiagnosticStore();
store.set("file:///a.ts", diagnostics);
const current = store.get("file:///a.ts");
const fresh = await store.waitForDiagnostics("file:///a.ts", 5_000);

console.log(formatDiagnostics(diagnostics));
// ERROR [12:5] Cannot find name 'foo'.
// 1 error(s), 0 warning(s), 0 other
```

**DiagnosticStore methods:** `set(uri, diagnostics)`, `version(uri)`, `get(uri)`, `getAll()`, `clear(uri)`, `clearAll()`, `waitForDiagnostics(uri, timeoutMs, sinceVersion?)`.

**Helpers:** `formatDiagnostics(diagnostics): string` (grouped summary), `countErrors(diagnostics)`, `countWarnings(diagnostics)`.

### `createLspTools` / `LspToolProvider`

Expose LSP queries as agent tools (`lsp_diagnostics`, `lsp_symbols`, `lsp_hover`, `lsp_definition`, `lsp_references`, `lsp_completion`, `lsp_type_definition`, `lsp_implementation`, `lsp_signature_help`, `lsp_document_symbols`, `lsp_code_action`):

```typescript
import { LspPool, createLspTools, LspToolProvider } from "@vinhnt-sdk/lsp";

const pool = new LspPool();

// As plain ToolDefinitions
const tools = createLspTools(pool);

// Or as a ToolProvider for the ToolProviderRegistry
const provider = new LspToolProvider(pool);
registry.registerProvider(provider);
```

## Types

### `LspServerDefinition`

```typescript
interface LspServerDefinition {
  id: string;
  name: string;
  languageId: string;
  extensions: string[];
  command: string;
  args: string[];
  rootFiles: string[];
  autoInstall?: string;
  env?: Record<string, string>;
  initializationOptions?: Record<string, unknown>;
  isExperimental?: boolean;
  readonly metadata?: Record<string, unknown>;
}
```

### `LspDiagnostic`

```typescript
interface LspDiagnostic {
  range: LspRange;
  severity?: LspDiagnosticSeverity; // 1 = Error, 2 = Warning, 3 = Information, 4 = Hint
  code?: string | number;
  source?: string;
  message: string;
}

interface LspPosition { line: number; character: number; }
interface LspRange { start: LspPosition; end: LspPosition; }
```

## Dependencies

- `@vinhnt-sdk/schema` workspace:*
- `@vinhnt-sdk/tools` workspace:*
- `zod` ^4.4.3

## Peer Dependencies

None

## Usage Examples

### Get diagnostics for a workspace file

```typescript
import { LspPool, formatDiagnostics } from "@vinhnt-sdk/lsp";

const pool = new LspPool();
const diagnostics = await pool.getDiagnostics("/repo/src/app.ts");

for (const d of diagnostics) {
  console.log(`[${d.severity ?? 4}] Line ${d.range.start.line + 1}: ${d.message}`);
}

console.log(formatDiagnostics(diagnostics));
await pool.shutdownAll();
```

### Completions and hover

```typescript
import { LspPool } from "@vinhnt-sdk/lsp";

const pool = new LspPool();
const client = await pool.getOrStart("/repo/src/app.ts");
if (!client) throw new Error("no language server for this file");

const uri = "file:///repo/src/app.ts";
const position = { line: 10, character: 15 };

const [completions, hover] = await Promise.all([
  client.getCompletion(uri, position),
  client.getHover(uri, position),
]);

completions.forEach((c) => console.log(`${c.label}${c.detail ? ` — ${c.detail}` : ""}`));
if (hover) console.log(typeof hover.contents === "string" ? hover.contents : JSON.stringify(hover.contents));
```

### Wire LSP tools into the agent

```typescript
import { LspPool, LspToolProvider } from "@vinhnt-sdk/lsp";

const pool = new LspPool();
const provider = new LspToolProvider(pool);

registry.registerProvider(provider);
// Agent can now call lsp diagnostics / hover / definition / ... tools
```

## License

MIT
