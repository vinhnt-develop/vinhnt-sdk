/**
 * Secret detection and redaction for logs and error messages.
 *
 * @module security/secret-redactor
 * @packageDocumentation

 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SecretPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

/**
 * Secret redactor configuration — injectable dependency.
 * Users can register custom patterns without forking.
 */
export interface SecretRedactorConfig {
  /** Custom patterns — merged with DEFAULT_SECRET_PATTERNS */
  patterns?: SecretPattern[];
  /** Override default patterns completely */
  overridePatterns?: SecretPattern[];
}

// ---------------------------------------------------------------------------
// Default patterns — exported for user merge/override
// ---------------------------------------------------------------------------

/**
 * Default secret patterns — convenience only.
 * User merge: `[...DEFAULT_SECRET_PATTERNS, { name: "custom", pattern: /.../g, replacement: "..." }]`
 */
export const DEFAULT_SECRET_PATTERNS: SecretPattern[] = [
  // Anthropic
  { name: "anthropic-key", pattern: /sk-ant-[A-Za-z0-9_-]{20,}/g, replacement: "[REDACTED:anthropic-key]" },
  // OpenAI
  { name: "openai-key", pattern: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g, replacement: "[REDACTED:openai-key]" },
  // Google AI / Gemini
  { name: "google-ai-key", pattern: /AIza[A-Za-z0-9_-]{35}/g, replacement: "[REDACTED:google-ai-key]" },
  // AWS Access Key
  { name: "aws-access-key", pattern: /(?:^|[^A-Za-z0-9])(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}(?:[^A-Za-z0-9]|$)/g, replacement: "[REDACTED:aws-access-key]" },
  // AWS Secret Key (approximate)
  { name: "aws-secret-key", pattern: /(?:aws_secret_access_key|secret_key)\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi, replacement: "aws_secret_access_key=[REDACTED:aws-secret-key]" },
  // Bearer tokens
  { name: "bearer-token", pattern: /Bearer\s+[A-Za-z0-9_-]{20,}/g, replacement: "Bearer [REDACTED:token]" },
  // Private keys
  { name: "private-key", pattern: /-----BEGIN(?:\s+RSA)?\s+PRIVATE\s+KEY-----[\s\S]*?-----END(?:\s+RSA)?\s+PRIVATE\s+KEY-----/g, replacement: "[REDACTED:private-key]" },
  // GitHub tokens
  { name: "github-token", pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g, replacement: "[REDACTED:github-token]" },
  // GitLab tokens
  { name: "gitlab-token", pattern: /glpat-[A-Za-z0-9_-]{20,}/g, replacement: "[REDACTED:gitlab-token]" },
  // Generic API keys (key=..., api_key=..., etc.) — kept LAST so specific
  // patterns above win first; the replacement must never echo the secret back.
  { name: "generic-api-key", pattern: /(?:api[_-]?key|apikey|token|secret|password|passwd|pwd)\s*[:=]\s*['"]?([A-Za-z0-9_./-]{16,})['"]?/gi, replacement: "[REDACTED:generic-api-key]" },
  // RV-43: short/truncated key-prefix tokens. Specific providers often include
  // the key verbatim in error messages (`Incorrect API key provided: sk-...`).
  // The full-length patterns above miss masked/short keys (>= 20 chars in the
  // body), so catch ANY `sk-`/`sk-ant-`/`sk-proj-` shaped token of 6+ chars as
  // a last line of defence. Runs last so full keys get their specific label.
  // Lookbehind/lookahead so surrounding punctuation is preserved.
  { name: "api-key-prefix", pattern: /(?<![A-Za-z0-9])(sk-(?:ant-|proj-)?[A-Za-z0-9_-]{6,})(?![A-Za-z0-9_-])/g, replacement: "[REDACTED:api-key-prefix]" },
];

// ---------------------------------------------------------------------------
// SecretRedactor class — injectable dependency
// ---------------------------------------------------------------------------

/**
 * Secret redactor with injectable patterns.
 * Users can register custom patterns without forking.
 */
export class SecretRedactor {
  private patterns: SecretPattern[];

  constructor(config?: SecretRedactorConfig) {
    if (config?.overridePatterns) {
      this.patterns = config.overridePatterns;
    } else {
      this.patterns = [...DEFAULT_SECRET_PATTERNS, ...(config?.patterns ?? [])];
    }
  }

  /** Register a custom secret pattern */
  register(pattern: SecretPattern): void {
    this.patterns.push(pattern);
  }

  /** Remove a pattern by name */
  unregister(name: string): void {
    this.patterns = this.patterns.filter((p) => p.name !== name);
  }

  /** Redact secrets from text */
  redact(text: string): string {
    if (!text) return "";
    let redacted = text;
    for (const { pattern, replacement } of this.patterns) {
      pattern.lastIndex = 0;
      redacted = redacted.replace(pattern, replacement);
    }
    return redacted;
  }

  /** Detect secrets in text */
  detect(text: string): string[] {
    const found: string[] = [];
    for (const { name, pattern } of this.patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) {
        found.push(name);
      }
    }
    return found;
  }
}

/** Default redactor instance — exported for convenience */
export const defaultSecretRedactor = new SecretRedactor();

// ---------------------------------------------------------------------------
// Public API (backward compatible)
// ---------------------------------------------------------------------------

/**
 * Redact secrets from text.
 *
 * Scans the input for known secret patterns and replaces them with
 * placeholder tokens. Safe to use on log messages, error output, and
 * arbitrary strings.
 *
 * @param text - Text that may contain secrets
 * @returns Text with secrets replaced by placeholders
 */
export function redactSecrets(text: string): string {
  return defaultSecretRedactor.redact(text);
}

/**
 * Check whether text contains suspected secrets (without modifying it).
 *
 * @param text - Text to inspect
 * @returns Array of detected secret type names (empty = clean)
 */
export function detectSecrets(text: string): string[] {
  return defaultSecretRedactor.detect(text);
}

/**
 * Deep-redact secrets inside an object/array tree.
 *
 * Serializes the value to JSON, redacts known secret patterns, then parses
 * it back so nested secrets (e.g. `{ apiKey: "sk-..." }` inside tool args)
 * are scrubbed while the structure is preserved. Falls back to the original
 * value if it cannot be serialized (circular refs, functions, etc.).
 *
 * @param value - Value that may contain nested secrets
 * @returns Deep copy with secrets redacted (original returned if unserializable)
 */
export function redactObjectSecrets<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  try {
    return JSON.parse(redactSecrets(JSON.stringify(value))) as T;
  } catch {
    return value;
  }
}

/**
 * Create a redaction middleware for a logger.
 *
 * Returns a function that wraps log output, automatically redacting
 * any detected secrets before the message is written. Strings, error
 * messages and nested object values are all scrubbed.
 *
 * @param originalLog - The original log function (e.g. console.log)
 * @returns Redacted log function with the same signature
 */
export function createRedactingLogger<A extends unknown[]>(
  originalLog: (...args: A) => void,
): (...args: A) => void {
  return ((...args: unknown[]) => {
    const redacted = args.map((arg) => {
      if (typeof arg === "string") return redactSecrets(arg);
      if (arg instanceof Error) {
        arg.message = redactSecrets(arg.message);
        return arg;
      }
      if (arg !== null && typeof arg === "object") return redactObjectSecrets(arg);
      return arg;
    });
    originalLog(...(redacted as A));
  }) as (...args: A) => void;
}
