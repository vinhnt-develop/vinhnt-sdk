/**
 * Secret detection and redaction for logs and error messages.
 *
 * @module security/secret-redactor
 * @packageDocumentation

 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SecretPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

/**
 * Secret redactor configuration — injectable dependency.
 * User register custom patterns mà không cần fork.
 */
export interface SecretRedactorConfig {
  /** Custom patterns — merge với DEFAULT_SECRET_PATTERNS */
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
  // OpenAI
  { name: "openai-key", pattern: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g, replacement: "[REDACTED:openai-key]" },
  // Anthropic
  { name: "anthropic-key", pattern: /sk-ant-[A-Za-z0-9_-]{20,}/g, replacement: "[REDACTED:anthropic-key]" },
  // Google AI / Gemini
  { name: "google-ai-key", pattern: /AIza[A-Za-z0-9_-]{35}/g, replacement: "[REDACTED:google-ai-key]" },
  // AWS Access Key
  { name: "aws-access-key", pattern: /(?:^|[^A-Za-z0-9])(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}(?:[^A-Za-z0-9]|$)/g, replacement: "[REDACTED:aws-access-key]" },
  // AWS Secret Key (approximate)
  { name: "aws-secret-key", pattern: /(?:aws_secret_access_key|secret_key)\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi, replacement: "aws_secret_access_key=[REDACTED:aws-secret-key]" },
  // Bearer tokens
  { name: "bearer-token", pattern: /Bearer\s+[A-Za-z0-9_-]{20,}/g, replacement: "Bearer [REDACTED:token]" },
  // Generic API keys (key=..., api_key=..., etc.)
  { name: "generic-api-key", pattern: /(?:api[_-]?key|apikey|token|secret|password|passwd|pwd)\s*[:=]\s*['"]?([A-Za-z0-9_./-]{16,})['"]?/gi, replacement: "$1=[REDACTED]" },
  // Private keys
  { name: "private-key", pattern: /-----BEGIN(?:\s+RSA)?\s+PRIVATE\s+KEY-----[\s\S]*?-----END(?:\s+RSA)?\s+PRIVATE\s+KEY-----/g, replacement: "[REDACTED:private-key]" },
  // GitHub tokens
  { name: "github-token", pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g, replacement: "[REDACTED:github-token]" },
  // GitLab tokens
  { name: "gitlab-token", pattern: /glpat-[A-Za-z0-9_-]{20,}/g, replacement: "[REDACTED:gitlab-token]" },
];

// ---------------------------------------------------------------------------
// SecretRedactor class — injectable dependency
// ---------------------------------------------------------------------------

/**
 * Secret redactor with injectable patterns.
 * User register custom patterns mà không cần fork.
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
 * Create a redaction middleware for a logger.
 *
 * Returns a function that wraps log output, automatically redacting
 * any detected secrets before the message is written.
 *
 * @param originalLog - The original log function (e.g. console.log)
 * @returns Redacted log function
 */
export function createRedactingLogger<T extends (...args: unknown[]) => void>(
  originalLog: T,
): T {
  return ((...args: unknown[]) => {
    const redacted = args.map((arg) => {
      if (typeof arg === "string") return redactSecrets(arg);
      if (arg instanceof Error) {
        arg.message = redactSecrets(arg.message);
        return arg;
      }
      return arg;
    });
    originalLog(...redacted);
  }) as T;
}
