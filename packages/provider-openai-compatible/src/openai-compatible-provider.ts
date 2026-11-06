/**
 * OpenAICompatibleProvider — ModelProvider implemented on raw `fetch`.
 *
 * Zero AI SDK. POSTs an OpenAI-formatted body to `{baseUrl}/chat/completions`,
 * streams SSE when `stream()` is requested, retries transient failures with
 * exponential backoff honouring `Retry-After`, and maps upstream failures to
 * `UpstreamError` (`ERR_UPSTREAM_*`) or `NetworkError`.
 */

import type {
  ModelProvider,
  ModelRequest,
  ModelResponse,
  ModelStreamEvent,
  ModelPricing,
  ModelCapabilities,
  OpenAIResponse,
  ModelId,
} from "@vinhnt-sdk/schema";
import { ConfigurationError, NetworkError, TimeoutError } from "@vinhnt-sdk/schema";
import { buildRequest } from "./build-request.js";
import type { BuildRequestOptions, OpenAICompatibleRequestBody } from "./build-request.js";
import type { PromptCacheShaping } from "./prompt-cache.js";
import { toModelStreamEvents } from "./sse.js";
import { fromOpenAIResponse } from "./convert.js";
import type { RetryOptions } from "./error.js";
import {
  UpstreamError,
  retryableStatusSet,
  parseRetryAfterMs,
  waitForRetry,
  toUpstreamError,
  isBillingError,
} from "./error.js";

/** Configuration for the OpenAI-compatible provider. */
export interface OpenAICompatibleProviderOptions {
  /** Base URL without path, e.g. `https://api.openai.com/v1` or `http://localhost:11434/v1`. */
  readonly baseUrl: string;
  /** Bearer API key for `Authorization` (optional for local providers). */
  readonly apiKey?: string;
  /** Default model identifier sent in the request body (REQUIRED - must be non-empty). */
  readonly defaultModel: string;
  /** Provider name reported on `ModelProvider.provider`. Defaults to `"openai-compatible"`. */
  readonly providerName?: string;
  /** Extra headers merged over the defaults. */
  readonly headers?: Readonly<Record<string, string>>;
  readonly contextLimit?: number;
  readonly pricing?: ModelPricing;
  /** Overrides for the provider capability set (defaults: streaming+toolCalling). */
  readonly capabilities?: Partial<ModelCapabilities>;
  /** Retry/backoff policy. Default: 3 retries, 1s base, 30s cap. */
  readonly retry?: RetryOptions;
  /**
   * Per-attempt request timeout in ms — bounds the time until the upstream
   * responds (headers arrive). A long-running stream is NOT cut off: the timer
   * is discarded once the response headers arrive. Default: 120000.
   */
  readonly timeoutMs?: number;
  /**
   * Whether to request token usage via `stream_options.include_usage` when
   * streaming. Some OpenAI-compatible shims (e.g. Ollama) reject unknown
   * `stream_options` fields — set `false` for those. Per-call override:
   * `request.streamOptions.includeUsage`. Default: true.
   */
  readonly includeUsage?: boolean;
  /**
   * Prompt-cache request shaping (P2-9): `cache_control` breakpoints or an
   * OpenAI `prompt_cache_key`. Default: none. Applied to every request this
   * provider builds.
   */
  readonly promptCache?: PromptCacheShaping;
  /** Injectable fetch implementation (defaults to the global `fetch`). */
  readonly fetchImpl?: typeof fetch;
  /**
   * Parameter names to strip from the request body before sending upstream.
   * Useful for providers that reject OpenAI-specific fields they don't
   * recognise (e.g. `parallel_tool_calls`, `stream_options`,
   * `presence_penalty`, `frequency_penalty` on Google's OpenAI-compatible
   * endpoint).
   */
  readonly stripParameters?: ReadonlySet<string>;
  /**
   * Called with the exact wire body right before POST (for debug/trajectory).
   * `url` is the endpoint; headers are NOT passed — redact secrets yourself
   * if you log beyond the JSON body.
   */
  readonly onWireRequest?: (url: string, body: OpenAICompatibleRequestBody) => void;
  readonly metadata?: Record<string, unknown>;
  /**
   * Authentication style for the API key.
   * - 'bearer' (default): `Authorization: Bearer <key>` — OpenAI, Groq, Mistral, …
   * - 'query': `?key=<key>` appended to URL — Google native models endpoint
   * - 'header-x-goog': `x-goog-api-key: <key>` — Google native generateContent
   * - 'header-x-api-key': `x-api-key: <key>` — Anthropic
   */
  readonly authStyle?: 'bearer' | 'query' | 'header-x-goog' | 'header-x-api-key';
  /**
   * Override chat/completions URL per provider.
   * Defaults to `${baseUrl}/chat/completions`.
   * Set this when the provider's chat endpoint differs from the standard path,
   * e.g. Google native: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`.
   */
  readonly nativeChatUrl?: string;
}

const DEFAULT_CAPABILITIES: ModelCapabilities = {
  streaming: true,
  toolCalling: true,
  imageInput: false,
  thinking: false,
  structuredOutput: false,
};

/** Default per-attempt request timeout (ms) — see `timeoutMs`. */
const DEFAULT_TIMEOUT_MS = 120000;

/**
 * OpenAI-compatible model provider.
 *
 * @example
 * ```ts
 * const provider = new OpenAICompatibleProvider({
 *   baseUrl: "https://api.openai.com/v1",
 *   apiKey: process.env.OPENAI_API_KEY,
 *   defaultModel: "gpt-4o",
 * });
 * ```
 */
export class OpenAICompatibleProvider implements ModelProvider {
  readonly provider: string;
  readonly model: ModelId;
  readonly contextLimit: number | undefined;
  readonly pricing?: ModelPricing;
  readonly capabilities: ModelCapabilities;

  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly headers: Readonly<Record<string, string>>;
  private readonly retry: RetryOptions | undefined;
  private readonly timeoutMs: number;
  private readonly includeUsage: boolean;
  private readonly promptCache: PromptCacheShaping | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly stripParameters: ReadonlySet<string>;
  private readonly onWireRequest?: ((url: string, body: OpenAICompatibleRequestBody) => void) | undefined;
  private readonly authStyle: 'bearer' | 'query' | 'header-x-goog' | 'header-x-api-key';
  private readonly nativeChatUrl: string | undefined;

  constructor(opts: OpenAICompatibleProviderOptions) {
    if (!opts.defaultModel || opts.defaultModel.trim() === "") {
      throw new ConfigurationError("OpenAICompatibleProvider requires a non-empty `defaultModel`");
    }
    this.provider = opts.providerName ?? "openai-compatible";
    this.model = opts.defaultModel as ModelId;
    this.baseUrl = normalizeBaseUrl(opts.baseUrl);
    this.apiKey = opts.apiKey;
    this.headers = opts.headers ?? {};
    this.contextLimit = opts.contextLimit;
    if (opts.pricing !== undefined) {
      this.pricing = opts.pricing;
    }
    this.capabilities = { ...DEFAULT_CAPABILITIES, ...(opts.capabilities ?? {}) };
    this.retry = opts.retry;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.includeUsage = opts.includeUsage ?? true;
    this.promptCache = opts.promptCache;
    this.onWireRequest = opts.onWireRequest;
    this.authStyle = opts.authStyle ?? 'bearer';
    this.nativeChatUrl = opts.nativeChatUrl;
    const globalFetch = (globalThis as { fetch?: typeof fetch }).fetch;
    if (opts.fetchImpl) {
      this.fetchImpl = opts.fetchImpl;
    } else if (globalFetch) {
      this.fetchImpl = globalFetch;
    } else {
      throw new ConfigurationError("OpenAICompatibleProvider requires a fetch implementation (Node >= 18)");
    }
    this.stripParameters = opts.stripParameters ?? new Set();
  }

  async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    const res = await this.postCompletion(request, { stream: false, includeUsage: this.usageFor(request) }, signal);
    const body = await parseBody(res);
    if (!res.ok) {
      throw toUpstreamError(res.status, body, res.headers);
    }
    return fromOpenAIResponse(body as OpenAIResponse, this.provider);
  }

  async *stream(request: ModelRequest, signal?: AbortSignal): AsyncIterable<ModelStreamEvent> {
    const res = await this.postCompletion(request, { stream: true, includeUsage: this.usageFor(request) }, signal);
    if (!res.ok) {
      // Reading the body consumes the stream — only do it for the error path.
      const body = await parseBody(res);
      throw toUpstreamError(res.status, body, res.headers);
    }
    if (!res.body) {
      yield { type: "error", error: "Empty response body from upstream" };
      return;
    }
    yield* toModelStreamEvents(res.body, signal);
  }

  /** Effective usage-request flag: per-call override wins, else the provider default. */
  private usageFor(request: ModelRequest): boolean {
    return request.streamOptions?.includeUsage ?? this.includeUsage;
  }

  private async postCompletion(
    request: ModelRequest,
    opts: { stream: boolean; includeUsage: boolean },
    signal?: AbortSignal,
  ): Promise<Response> {
    const url = this.nativeChatUrl ?? `${this.baseUrl}/chat/completions`;
    const fetchUrl = this.authStyle === 'query' && this.apiKey
      ? `${url}?key=${this.apiKey}`
      : url;
    const body = buildRequest(request, {
      model: request.model ?? this.model,
      stream: opts.stream,
      includeUsage: opts.includeUsage,
      ...(this.promptCache !== undefined ? { promptCache: this.promptCache } : {}),
      ...(this.stripParameters.size > 0 ? { stripParameters: this.stripParameters } : {}),
    } satisfies BuildRequestOptions);
    try {
      this.onWireRequest?.(url, body);
    } catch {
      // debug hook must never break the call
    }
    const init: RequestInit = {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
      ...(signal !== undefined ? { signal } : {}),
    };
    return this.fetchWithRetry(fetchUrl, init, signal);
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...this.headers,
    };
    if (this.apiKey) {
      if (this.authStyle === 'header-x-goog') {
        headers['x-goog-api-key'] = this.apiKey;
      } else if (this.authStyle === 'header-x-api-key') {
        headers['x-api-key'] = this.apiKey;
      } else if (this.authStyle !== 'query') {
        headers.authorization = `Bearer ${this.apiKey}`;
      }
    }
    return headers;
  }

  private async fetchWithRetry(url: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
    const statusSet = retryableStatusSet(this.retry);
    const maxRetries = this.retry?.maxRetries ?? 3;
    let attempt = 0;

    for (;;) {
      let res: Response;
      try {
        res = await fetchWithTimeout(this.fetchImpl, url, init, signal, this.timeoutMs);
      } catch (err) {
        if (signal?.aborted) throw err;
        if (attempt >= maxRetries) {
          if (err === TIMEOUT_SENTINEL) {
            throw new TimeoutError("Upstream request", this.timeoutMs);
          }
          throw new NetworkError(
            `Upstream request failed: ${err instanceof Error ? err.message : String(err)}`,
            err,
          );
        }
        await waitForRetry(attempt, this.retry, undefined, signal);
        attempt++;
        continue;
      }

      if (!statusSet.has(res.status) || attempt >= maxRetries) {
        return res;
      }

      // P0.2: a billing/quota 429 never succeeds on retry — peek the body
      // (clone, caller still gets the original) and return immediately so
      // the caller maps it to ERR_BILLING_REQUIRED instead of burning attempts.
      if (res.status === 429 && (await isBillingResponse(res))) {
        return res;
      }

      const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"));
      // Release the failed response body before retrying.
      await res.body?.cancel().catch(() => undefined);
      await waitForRetry(attempt, this.retry, retryAfterMs, signal);
      attempt++;
    }
  }
}

async function parseBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    try {
      return await res.text();
    } catch {
      return undefined;
    }
  }
}

/** Peek (non-destructive) whether a response body is a billing/quota error. */
async function isBillingResponse(res: Response): Promise<boolean> {
  try {
    const body = await res.clone().json();
    return isBillingError(body);
  } catch {
    return false;
  }
}

/**
 * Validate + normalize a provider `baseUrl` (RV-50). Must be an absolute
 * http(s) URL — a bare host or `ftp://` would silently misbehave downstream.
 */
function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ConfigurationError(`Invalid baseUrl "${baseUrl}": must be an absolute http(s) URL`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ConfigurationError(`Invalid baseUrl "${baseUrl}": protocol must be http or https`);
  }
  return trimmed;
}

/** Rejection sentinel distinguishing a request timeout from other failures. */
const TIMEOUT_SENTINEL: unique symbol = Symbol("provider-request-timeout");

/**
 * Run a fetch with a per-attempt timeout (RV-50). The timer bounds the time
 * until the upstream responds — once response headers arrive it is discarded,
 * so long-running streams are unaffected. The caller's signal still wins:
 * aborting it rejects the call with its abort reason (listeners removed, no
 * leak). A fetch implementation that never settles (hung connection) is cut
 * off via a race with the timeout.
 */
async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const onCallerAbort = () => ctrl.abort(signal?.reason);
  if (signal?.aborted) {
    ctrl.abort(signal?.reason);
  } else {
    signal?.addEventListener("abort", onCallerAbort, { once: true });
  }

  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const timeoutPromise = new Promise<never>((_, reject) => {
    ctrl.signal.addEventListener("abort", () => {
      // Only a timer firing is a timeout — a caller abort rejects via fetch.
      if (!signal?.aborted) reject(TIMEOUT_SENTINEL);
    }, { once: true });
  });

  try {
    const res = await Promise.race([
      fetchImpl(url, { ...init, signal: ctrl.signal }),
      timeoutPromise,
    ]);
    if (signal?.aborted) throw new DOMException("This operation was aborted", "AbortError");
    return res;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onCallerAbort);
  }
}