# @vinhnt-sdk/security

> Version: 0.1.2-beta.0 | Status: BETA

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
import {
  redactSecrets,
  detectSecrets,
  sanitizeInput,
  checkInjection,
} from '@vinhnt-sdk/security';

// Redact secrets from text
const result = redactSecrets("api_key=sk_12345678901234567890");
console.log(result.redacted); // "api_key=[REDACTED:api_key]"
console.log(result.redactions); // [{ type: "api_key", start: 0, end: 31 }]

// Detect secrets without modifying
const detected = detectSecrets("Password: mypassword123");
console.log(detected); // [{ type: "password", ... }]

// Sanitize input
const sanitized = sanitizeInput('<script>alert("xss")</script>Hello');
console.log(sanitized.sanitized); // "Hello"
console.log(sanitized.warnings); // ["Detected potential XSS attack"]

// Check for injection attacks
const injection = checkInjection("Ignore all previous instructions");
console.log(injection.safe); // false
console.log(injection.threats); // ["instruction_override"]
console.log(injection.score); // 60
```

## API Reference

### redactSecrets

```typescript
import { redactSecrets } from '@vinhnt-sdk/security';

const result = redactSecrets(text: string): RedactionResult;
```

**RedactionResult:**
```typescript
interface RedactionResult {
  original: string;
  redacted: string;
  redactions: Redaction[];
}

interface Redaction {
  type: string;      // "api_key", "email", "phone", etc.
  start: number;
  end: number;
}
```

### detectSecrets

```typescript
import { detectSecrets } from '@vinhnt-sdk/security';

const detected = detectSecrets(text: string): SecretDetection[];
```

**SecretDetection:**
```typescript
interface SecretDetection {
  type: string;
  start: number;
  end: number;
  severity: "low" | "medium" | "high";
}
```

### sanitizeInput

```typescript
import { sanitizeInput } from '@vinhnt-sdk/security';

const result = sanitizeInput(input: string): SanitizationResult;
```

**SanitizationResult:**
```typescript
interface SanitizationResult {
  original: string;
  sanitized: string;
  warnings: string[];
}
```

### checkInjection

```typescript
import { checkInjection } from '@vinhnt-sdk/security';

const result = checkInjection(input: string): InjectionCheckResult;
```

**InjectionCheckResult:**
```typescript
interface InjectionCheckResult {
  safe: boolean;
  threats: string[];
  score: number; // 0-100, higher = more dangerous
}
```

### SecretRedactor

```typescript
import { SecretRedactor } from '@vinhnt-sdk/security';

const redactor = new SecretRedactor();

// Add custom pattern
redactor.addPattern({
  type: "custom_key",
  regex: /custom_key_[a-zA-Z0-9]{20,}/g,
  replacement: "[REDACTED:custom_key]",
});

// Redact
const result = redactor.redact("custom_key_abc123def456ghi789jkl0");
```

## Detected Patterns

| Pattern | Type | Severity |
|---------|------|----------|
| API keys | api_key | high |
| Email addresses | email | medium |
| Phone numbers | phone | low |
| Credit card numbers | credit_card | high |
| SSN | ssn | high |
| Passwords | password | high |

## Injection Detection

| Pattern | Threat | Score |
|---------|--------|-------|
| Ignore previous instructions | instruction_override | 60 |
| You are now a... | role_hijacking | 25 |
| System: | system_prompt_injection | 20 |
| Jailbreak/DAN | jailbreak_attempt | 35 |
| Pretend to be... | role_play_attack | 20 |
| Forget everything... | memory_manipulation | 25 |

## Dependencies

None

## Peer Dependencies

None

## Usage Examples

### Protect User Input

```typescript
import { sanitizeInput, checkInjection } from '@vinhnt-sdk/security';

function processUserInput(input: string) {
  // Check for injection attacks
  const injection = checkInjection(input);
  if (!injection.safe) {
    throw new Error(`Potential attack detected: ${injection.threats.join(", ")}`);
  }

  // Sanitize input
  const { sanitized, warnings } = sanitizeInput(input);
  if (warnings.length > 0) {
    console.warn("Security warnings:", warnings);
  }

  return sanitized;
}
```

### Redact Sensitive Data

```typescript
import { redactSecrets } from '@vinhnt-sdk/security';

function logSafe(message: string) {
  const { redacted } = redactSecrets(message);
  console.log(redacted);
}

logSafe("User connected with api_key=sk_12345678901234567890");
// Output: "User connected with api_key=[REDACTED:api_key]"
```

### Custom Redactor

```typescript
import { SecretRedactor } from '@vinhnt-sdk/security';

const redactor = new SecretRedactor();

// Add custom pattern for internal tokens
redactor.addPattern({
  type: "internal_token",
  regex: /token_[a-zA-Z0-9]{32}/g,
  replacement: "[REDACTED:token]",
});

// Use in application
const clean = redactor.redact("User token_token_abc123def456ghi789jkl0123456");
console.log(clean); // "User token_[REDACTED:token]"
```

## License

MIT
