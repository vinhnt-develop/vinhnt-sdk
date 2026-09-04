/**
 * Error classification utilities for detecting specific failure modes
 * across different LLM providers (OpenAI, Anthropic, DeepSeek, etc.).
 *
 * These classifiers use regex patterns to handle the varying error message
 * formats across providers, making error handling more robust than simple
 * string equality checks.
 */

const CONTEXT_WINDOW_PATTERNS = [
  /context\s*(?:window|length|limit)\s*(?:exceeded|overflow|too\s*long)/i,
  /maximum\s*(?:context|token)\s*(?:length|limit|window)\s*(?:exceeded|reached)/i,
  /input\s*(?:is\s*)?(?:too\s*long|exceeds?)/i,
  /prompt\s*(?:is\s*)?(?:too\s*long|exceeds?)/i,
  /token\s*(?:limit|count|count)\s*(?:exceeded|reached|too\s*high)/i,
  /too\s*many\s*tokens/i,
  /request\s*(?:body\s*)?too\s*large/i,
  /payload\s*too\s*large/i,
  /max\s*(?:_)?tokens\s*(?:exceeded|reached)/i,
  /context\s*length\s*exceeded/i,
  /prompt\s*too\s*long/i,
];

const QUOTA_PATTERNS = [
  /quota\s*(?:exceeded|reached|hausted)/i,
  /rate\s*limit\s*(?:exceeded|reached)/i,
  /too\s*many\s*(?:requests|calls)/i,
  /billing\s*(?:limit|quota|issue)/i,
  /payment\s*(?:required|issue)/i,
  /insufficient\s*(?:quota|credits|balance)/i,
  /usage\s*limit\s*(?:exceeded|reached)/i,
  /you\s*have\s*exceeded/i,
  /api\s*key\s*(?:limit|quota|exceeded)/i,
];

const AUTH_PATTERNS = [
  /invalid\s*(?:api\s*)?key/i,
  /authentication\s*(?:error|failed|invalid)/i,
  /unauthorized/i,
  /access\s*denied/i,
  /invalid\s*(?:credential|token)/i,
  /expired\s*(?:token|key|credential)/i,
  /permission\s*(?:denied|error)/i,
  /not\s*(?:authenticated|authorized)/i,
  /bad\s*request.*auth/i,
];

/**
 * Check if an error indicates context window exceeded.
 * Works across OpenAI, Anthropic, DeepSeek, and other providers.
 */
export function isContextWindowExceededError(detail: {
  message?: string;
  code?: string;
}): boolean {
  const text = `${detail.message || ''} ${detail.code || ''}`;
  return CONTEXT_WINDOW_PATTERNS.some((p) => p.test(text));
}

/**
 * Check if an error indicates quota/rate limit exceeded.
 */
export function isQuotaExceededError(detail: {
  message?: string;
  code?: string;
  status?: number;
}): boolean {
  if (detail.status === 429) return true;
  const text = `${detail.message || ''} ${detail.code || ''}`;
  return QUOTA_PATTERNS.some((p) => p.test(text));
}

/**
 * Check if an error indicates authentication failure.
 */
export function isAuthError(detail: {
  message?: string;
  code?: string;
  status?: number;
}): boolean {
  if (detail.status === 401 || detail.status === 403) return true;
  const text = `${detail.message || ''} ${detail.code || ''}`;
  return AUTH_PATTERNS.some((p) => p.test(text));
}

/**
 * Classify an error into a canonical category.
 */
export function classifyError(error: unknown): {
  category: 'context_window' | 'quota' | 'auth' | 'network' | 'unknown';
  retryable: boolean;
} {
  if (!(error instanceof Error)) {
    return { category: 'unknown', retryable: false };
  }

  const detail = {
    message: error.message,
    code: (error as any).code,
    status: (error as any).status || (error as any).statusCode,
  };

  if (isContextWindowExceededError(detail)) {
    return { category: 'context_window', retryable: false };
  }

  if (isQuotaExceededError(detail)) {
    return { category: 'quota', retryable: detail.status === 429 };
  }

  if (isAuthError(detail)) {
    return { category: 'auth', retryable: false };
  }

  if (
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('ETIMEDOUT') ||
    error.message.includes('ENOTFOUND') ||
    error.message.includes('fetch failed')
  ) {
    return { category: 'network', retryable: true };
  }

  return { category: 'unknown', retryable: false };
}
