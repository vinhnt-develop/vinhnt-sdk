# @vinhnt-sdk/security

Security utilities for vinhnt-sdk — prompt injection protection and secret redaction.

## Install

```bash
# npm
npm install @vinhnt-sdk/security

# pnpm (monorepo)
pnpm add @vinhnt-sdk/security
```

## Quick Start

```typescript
import { redactSecrets, detectSecrets, createRedactingLogger } from '@vinhnt-sdk/security';

// Redact secrets from text
const clean = redactSecrets("API key: sk-1234567890abcdef");
// → "API key: [REDACTED:generic-api-key]"

// Detect secrets without modifying
const detected = detectSecrets("Password: mypassword123");
// → ["generic-api-key"]

// Create a redacting logger
const logger = createRedactingLogger(console);
logger.log("Connection string: postgres://user:pass@host/db");
// → "Connection string: [REDACTED]" (password redacted)
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `redactSecrets` | Function | Redact all known secret patterns from text |
| `detectSecrets` | Function | Detect secrets without modifying text |
| `createRedactingLogger` | Function | Wrap logger to auto-redact secrets |
| `SecretRedactor` | Class | Customizable redactor with pattern registry |
| `DEFAULT_PATTERNS` | Const | Built-in secret patterns (AWS, GitHub, generic) |

## License

MIT
