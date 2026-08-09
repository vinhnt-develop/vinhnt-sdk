# @vinhnt-sdk/lsp

> Version: 0.1.2-beta.0 | Status: BETA

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
import { analyzeCode, getCompletions } from '@vinhnt-sdk/lsp';

// Analyze code
const diagnostics = analyzeCode('console.log("hello"); var x = 1;');
console.log(diagnostics);
// [
//   { message: "Avoid console.log in production code", severity: "warning" },
//   { message: "Use 'const' or 'let' instead of 'var'", severity: "warning" }
// ]

// Get completions
const completions = getCompletions("const x = console.", { line: 0, character: 18 });
console.log(completions);
// [{ label: "log", kind: "method" }, { label: "error", kind: "method" }, ...]
```

## API Reference

### analyzeCode

```typescript
import { analyzeCode } from '@vinhnt-sdk/lsp';

const diagnostics = analyzeCode(code: string, language?: string): Diagnostic[];
```

**Diagnostic:**
```typescript
interface Diagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: "error" | "warning" | "info" | "hint";
  message: string;
  source: string;
  code?: string;
}
```

### getCompletions

```typescript
import { getCompletions } from '@vinhnt-sdk/lsp';

const completions = getCompletions(
  code: string,
  position: { line: number; character: number }
): CompletionItem[];
```

**CompletionItem:**
```typescript
interface CompletionItem {
  label: string;
  kind: string;
  detail?: string;
  documentation?: string;
  insertText?: string;
}
```

### getHoverInfo

```typescript
import { getHoverInfo } from '@vinhnt-sdk/lsp';

const hover = getHoverInfo(code: string, position: { line: number; character: number }): string;
```

### findReferences

```typescript
import { findReferences } from '@vinhnt-sdk/lsp';

const references = findReferences(code: string, position: { line: number; character: number }): Reference[];
```

**Reference:**
```typescript
interface Reference {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  uri: string;
}
```

## Diagnostics Rules

| Rule | Severity | Description |
|------|----------|-------------|
| console.log | warning | Avoid console.log in production |
| var keyword | warning | Use const or let instead |
| empty catch | error | Handle errors properly |
| TODO comment | info | TODO found |
| debugger | warning | Remove debugger statement |
| alert | warning | Remove alert statement |

## Dependencies

- `@vinhnt-sdk/core` workspace:*
- `@vinhnt-sdk/schema` workspace:*
- `zod` ^4.4.3

## Peer Dependencies

None

## Usage Examples

### Analyze TypeScript Code

```typescript
import { analyzeCode } from '@vinhnt-sdk/lsp';

const code = `
function greet(name) {
  console.log("Hello " + name);
  var x = 1;
  try {} catch (e) {}
}
`;

const diagnostics = analyzeCode(code, "typescript");

diagnostics.forEach(d => {
  console.log(`[${d.severity}] Line ${d.range.start.line + 1}: ${d.message}`);
});
// [warning] Line 3: Avoid console.log in production code
// [warning] Line 4: Use 'const' or 'let' instead of 'var'
// [error] Line 5: Empty catch block - handle errors properly
```

### Get Completions

```typescript
import { getCompletions } from '@vinhnt-sdk/lsp';

const code = "const x = console.";
const position = { line: 0, character: 18 };

const completions = getCompletions(code, position);

completions.forEach(c => {
  console.log(`${c.label} (${c.kind})`);
});
// log (method)
// error (method)
// warn (method)
// info (method)
```

### Custom Diagnostics

```typescript
import { analyzeCode } from '@vinhnt-sdk/lsp';

// Analyze code with custom rules
const code = `
  // TODO: Fix this
  const API_KEY = "sk_12345678901234567890";
  console.log(API_KEY);
`;

const diagnostics = analyzeCode(code);

// Filter by severity
const errors = diagnostics.filter(d => d.severity === "error");
const warnings = diagnostics.filter(d => d.severity === "warning");
const infos = diagnostics.filter(d => d.severity === "info");

console.log(`Errors: ${errors.length}, Warnings: ${warnings.length}, Info: ${infos.length}`);
```

## License

MIT
