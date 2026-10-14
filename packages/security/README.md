# @vinhnt-sdk/security

> Status: DEPRECATED — use [`@vinhnt-sdk/guard`](https://www.npmjs.com/package/@vinhnt-sdk/guard) instead.

Security utilities for vinhnt-sdk — prompt injection protection and secret redaction. This package re-exports a curated subset of `@vinhnt-sdk/guard` for backward compatibility.

## Install

```bash
# npm
npm install @vinhnt-sdk/security

# pnpm (monorepo)
pnpm add @vinhnt-sdk/security
```

## Quick Start

```typescript
import {
  redactSecrets,
  detectSecrets,
  detectInjectionPatterns,
  sanitizeForLLM,
} from "@vinhnt-sdk/security";

// Redact secrets from text
const clean = redactSecrets("api_key=sk-abcdefghijklmnopqrstuvwx");
console.log(clean); // "api_key=[REDACTED:openai-key]"

// Detect secrets without modifying (returns matched pattern names)
const detected = detectSecrets("Bearer abcdefghijklmnopqrstuvwxyz012345");
console.log(detected); // ["bearer-token"]

// Check for injection patterns (returns findings, empty = clean)
const findings = detectInjectionPatterns("Ignore all previous instructions");
console.log(findings); // ["Ignore-instructions override"]
```

## API Reference

### `redactSecrets`

```typescript
import { redactSecrets } from "@vinhnt-sdk/security";

redactSecrets(text: string): string;
```

Replaces every known secret pattern with a placeholder, e.g. `sk-...` → `[REDACTED:openai-key]`. Safe for log messages, error output, and arbitrary strings.

### `detectSecrets`

```typescript
import { detectSecrets } from "@vinhnt-sdk/security";

detectSecrets(text: string): string[];
```

Returns the names of matched secret patterns without modifying the text, e.g. `["openai-key", "generic-api-key"]`.

### `detectInjectionPatterns`

```typescript
import { detectInjectionPatterns } from "@vinhnt-sdk/security";

detectInjectionPatterns(text: string): string[];
```

Returns prompt-injection findings (empty array = clean):

| Finding | Trigger |
|---------|---------|
| `SYSTEM/INSTRUCTIONS override` | `SYSTEM:` / `INSTRUCTIONS:` lines |
| `XML injection tag` | `<system>`, `</instructions>`, … tags |
| `Unicode bidi override` | Unicode bidirectional control chars |
| `Zero-width character` | Zero-width characters |
| `Ignore-instructions override` | "ignore previous instructions" style |
| `Role reassignment` | "you are now a…" style |

### `sanitizeForLLM`

```typescript
import { sanitizeForLLM } from "@vinhnt-sdk/security";

sanitizeForLLM(text: string, source?: string, maxChars?: number): string;
```

Strips control characters and truncates (default limit 128,000 chars) before text is embedded into an LLM prompt.

### `validateToolOutput`

```typescript
import { validateToolOutput } from "@vinhnt-sdk/security";

validateToolOutput(output: string, toolName: string, maxChars?: number): string;
```

Runs `sanitizeForLLM` on tool output and prepends a canary marker (`[CANARY:<id>]`) so later-stage tampering can be detected.

### `sanitizeEnv`

```typescript
import { sanitizeEnv } from "@vinhnt-sdk/security";

sanitizeEnv(source?: Record<string, string | undefined>, allowedVars?: string[]): Record<string, string>;
```

Filters an env map down to allowed variables (defaults to `process.env`), dropping undefined values.

### `redactObjectSecrets` / `createRedactingLogger`

```typescript
import { redactObjectSecrets, createRedactingLogger } from "@vinhnt-sdk/security";

// Deep-redact secrets inside an object/array tree
const safe = redactObjectSecrets(payload);

// Wrap a log function so every string argument is redacted
const log = createRedactingLogger(console.log);
log("connected with token=abc123def456abc123def456abc123de");
// "connected with token=[REDACTED:generic-api-key]"
```

### `SecretRedactor` (in `@vinhnt-sdk/guard`)

The class with injectable patterns lives in `@vinhnt-sdk/guard` (this package does not re-export it):

```typescript
import { SecretRedactor } from "@vinhnt-sdk/guard";

const redactor = new SecretRedactor({
  patterns: [
    { name: "internal_id", pattern: /INT-\d{6}/g, replacement: "[REDACTED:id]" },
  ],
});

redactor.redact("User INT-000123 logged in"); // "User [REDACTED:id] logged in"
redactor.detect("User INT-000123 logged in"); // ["internal_id"]
```

## Detected Patterns

| Pattern | Name |
|---------|------|
| Anthropic API keys | `anthropic-key` |
| OpenAI API keys | `openai-key` |
| Google AI keys | `google-ai-key` |
| AWS access keys | `aws-access-key` |
| AWS secret keys | `aws-secret-key` |
| Bearer tokens | `bearer-token` |
| Private key blocks | `private-key` |
| GitHub tokens | `github-token` |
| GitLab tokens | `gitlab-token` |
| Generic `api_key=…` / `token=…` | `generic-api-key` |
| `sk-…` prefixes | `api-key-prefix` |

Custom patterns: merge `DEFAULT_SECRET_PATTERNS` (exported from `@vinhnt-sdk/guard`) or use `new SecretRedactor({ patterns: [...] })`.

## Dependencies

- `@vinhnt-sdk/guard` workspace:*

## Peer Dependencies

None

## Usage Examples

### Protect User Input

```typescript
import { detectInjectionPatterns, sanitizeForLLM } from "@vinhnt-sdk/security";

function processUserInput(input: string) {
  const findings = detectInjectionPatterns(input);
  if (findings.length > 0) {
    throw new Error(`Potential attack detected: ${findings.join(", ")}`);
  }

  return sanitizeForLLM(input, "user-input");
}
```

### Redact Sensitive Data

```typescript
import { redactSecrets } from "@vinhnt-sdk/security";

function logSafe(message: string) {
  console.log(redactSecrets(message));
}

logSafe("User connected with api_key=sk-abcdefghijklmnopqrstuvwx");
// "User connected with api_key=[REDACTED:openai-key]"
```

### Custom Redactor

```typescript
import { SecretRedactor } from "@vinhnt-sdk/guard";

const redactor = new SecretRedactor({
  patterns: [
    {
      name: "internal_token",
      pattern: /token_[a-zA-Z0-9]{32}/g,
      replacement: "[REDACTED:token]",
    },
  ],
});

const clean = redactor.redact("User token_abc123def456ghi789jkl0123456");
console.log(clean); // "User [REDACTED:token]"
```

## License

MIT
