/**
 * Input sanitization and output validation for prompt injection protection.
 *
 * @module security/input-sanitizer
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Common prompt injection patterns (case-insensitive match) */
const INJECTION_PATTERNS: RegExp[] = [
  // Direct instruction overrides
  /(?:^|\n)\s*(?:SYSTEM|INST(?:RUCTION)?S?)\s*[:=]\s*/im,
  /(?:^|\n)\s*\[INST\]/im,
  /(?:^|\n)\s*<<SYS>>/im,

  // XML / HTML injection tags
  /<\/?(?:instructions?|system|prompt|assistant|user|context)>/gi,

  // Unicode bidirectional overrides (U+202A–U+202E, U+2066–U+2069)
  /[\u202A-\u202E\u2066-\u2069]/g,

  // Zero-width characters used for stealth injection
  /[\u200B\u200C\u200D\uFEFF]/g,

  // "Ignore previous" / "Forget everything" style overrides
  /(?:ignore|disregard|forget|override|replace)\s+(?:all\s+)?(?:previous|above|earlier|prior|your)\s+(?:instructions?|prompts?|rules?|guidelines?|context)/gi,

  // New role assignment
  /(?:you\s+are\s+now|from\s+now\s+on|act\s+as\s+if|pretend\s+(?:you\s+are|to\s+be))/gi,
];

/** Maximum length for tool output before truncation (tokens ≈ chars / 4) */
const MAX_SANITIZE_LENGTH = 128_000;

/** Canary token prefix injected into tool outputs for later detection */
const CANARY_PREFIX = "[CANARY:";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sanitize external text before it enters the LLM context window.
 *
 * Strips known prompt-injection markers, unicode control characters,
 * and truncates excessively long content.
 *
 * @param text   - Raw text from external source (file, web, tool output)
 * @param source - Human-readable label for logging (e.g. "web_fetch", "read_file")
 * @returns Sanitized text safe for LLM context
 */
export function sanitizeForLLM(text: string, source?: string): string {
  if (!text) return "";

  let clean = text;

  // 1. Strip unicode bidirectional overrides and zero-width chars
  for (const re of INJECTION_PATTERNS) {
    clean = clean.replace(re, "");
  }

  // 2. Normalize excessive newlines
  clean = clean.replace(/\n{4,}/g, "\n\n\n");

  // 3. Truncate if too long
  if (clean.length > MAX_SANITIZE_LENGTH) {
    const truncated = clean.slice(0, MAX_SANITIZE_LENGTH);
    clean = truncated + `\n\n[truncated by ${source ?? "sanitizer"}: exceeds ${MAX_SANITIZE_LENGTH} chars]`;
  }

  return clean;
}

/**
 * Validate and post-process tool output before it enters context.
 *
 * - Injects a canary token so downstream consumers can detect if output
 *   was tampered with after sanitization.
 * - Strips injection patterns.
 *
 * @param output   - Raw tool output
 * @param toolName - Name of the tool that produced the output
 * @returns Sanitized output with canary token
 */
export function validateToolOutput(output: string, toolName: string): string {
  if (!output) return "";

  const sanitized = sanitizeForLLM(output, toolName);
  const canaryId = generateCanaryId(toolName);

  return `${CANARY_PREFIX}${canaryId}]${sanitized}`;
}

/**
 * Check whether a string contains suspected prompt injection patterns.
 *
 * Useful for logging / audit without modifying the text.
 *
 * @param text - Text to inspect
 * @returns Array of matched pattern descriptions (empty = clean)
 */
export function detectInjectionPatterns(text: string): string[] {
  const findings: string[] = [];

  if (/(?:^|\n)\s*(?:SYSTEM|INST(?:RUCTION)?S?)\s*[:=]\s*/im.test(text)) {
    findings.push("SYSTEM/INSTRUCTIONS override");
  }
  if (/<\/?(?:instructions?|system|prompt|assistant|user|context)>/gi.test(text)) {
    findings.push("XML injection tag");
  }
  if (/[\u202A-\u202E\u2066-\u2069]/.test(text)) {
    findings.push("Unicode bidi override");
  }
  if (/[\u200B\u200C\u200D\uFEFF]/.test(text)) {
    findings.push("Zero-width character");
  }
  if (/(?:ignore|disregard|forget|override|replace)\s+(?:all\s+)?(?:previous|above|earlier|prior|your)\s+(?:instructions?|prompts?|rules?|guidelines?|context)/gi.test(text)) {
    findings.push("Ignore-instructions override");
  }
  if (/(?:you\s+are\s+now|from\s+now\s+on|act\s+as\s+if|pretend\s+(?:you\s+are|to\s+be))/gi.test(text)) {
    findings.push("Role reassignment");
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function generateCanaryId(toolName: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${toolName}-${ts}-${rand}`;
}
