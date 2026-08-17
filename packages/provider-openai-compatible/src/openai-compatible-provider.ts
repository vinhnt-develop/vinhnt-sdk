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
} from "@vinhnt-sdk/schema";
import { ConfigurationError, NetworkError } from "@vinhnt-sdk/schema";
import { buildRequest } from "./build-request.js";
import type { BuildRequestOptions } from "./build-request.js";
import { toModelStreamEvents } from "./sse.js";
import { fromOpenAIResponse } from "./convert.js";
import type { RetryOptions } from "./error.js";
import {
  UpstreamError,
  retryableStatusSet,
  parseRetryAfterMs,
  waitForRetry,
  toUpstreamError,
} from "./error.js";

/** Configuration for the OpenAI-compatible provider. */
export interface OpenAICompatibleProviderOptions {
  /** Base URL without path, e.g. `https://api.openai.com/v1` or `http://localhost:11434/v1`. */
  readonly baseUrl: string;
  /** Bearer API key for `Authorization` (optional for local providers). */
  readonly apiKey?: string;
  /** Default model identifier sent in the request body. */
  readonly defaultModel: string;
  /** Extra headers merged over the defaults. */
  readonly headers?: Readonly<Record<string, string>>;
  readonly contextLimit?: number;
  readonly pricing?: ModelPricing;
  /** Overrides for the provider capability set (defaults: streaming+toolCalling). */
  readonly capabilities?: Partial<ModelCapabilities>;
  /** Retry/backoff policy. Default: 3 retries, 1s base, 30s cap. */
  readonly retry?: RetryOptions;
  /** Injectable fetch implementation (defaults to the global `fetch`). */
  readonly fetchImpl?: typeof fetch;
}

const DEFAULT_CAPABILITIES: ModelCapabilities = {
  streaming: true,
  toolCalling: true,
  imageInput: false,
  thinking: false,
  structuredOutput: false,
};

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
  readonly provider = "openai-compatible";
  readonly model: string;
  readonly contextLimit: number | undefined;
  readonly pricing?: ModelPricing;
  readonly capabilities: ModelCapabilities;

  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly headers: Readonly<Record<string, string>>;
  private readonly retry: RetryOptions | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: OpenAICompatibleProviderOptions) {
    this.model = opts.defaultModel;
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.headers = opts.headers ?? {};
    this.contextLimit = opts.contextLimit;
    this.pricing = opts.pricing;
    this.capabilities = { ...DEFAULT_CAPABILITIES, ...(opts.capabilities ?? {}) };
    this.retry = opts.retry;
    const globalFetch = (globalThis as { fetch?: typeof fetch }).fetch;
    if (opts.fetchImpl) {
      this.fetchImpl = opts.fetchImpl;
    } else if (globalFetch) {
      this.fetchImpl = globalFetch;
    } else {
      throw new ConfigurationError("OpenAICompatibleProvider requires a fetch implementation (Node >= 18)");
    }
  }

  async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    const res = await this.postCompletion(request, { stream: false, includeUsage: true }, signal);
    const body = await parseBody(res);
    if (!res.ok) {
      throw toUpstreamError(res.status, body, res.headers);
    }
    return fromOpenAIResponse(body as OpenAIResponse);
  }

  async *stream(request: ModelRequest, signal?: AbortSignal): AsyncIterable<ModelStreamEvent> {
    const res = await this.postCompletion(request, { stream: true, includeUsage: true }, signal);
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

  private async postCompletion(
    request: ModelRequest,
    opts: { stream: boolean; includeUsage: boolean },
    signal?: AbortSignal,
  ): Promise<Response> {
    const url = `${this.baseUrl}/chat/completions`;
    const body = buildRequest(request, {
      model: this.model,
      stream: opts.stream,
      includeUsage: opts.includeUsage,
    } satisfies BuildRequestOptions);
    const init: RequestInit = {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
      signal,
    };
    return this.fetchWithRetry(url, init, signal);
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...this.headers,
    };
    if (this.apiKey) {
      headers.authorization = `Bearer ${this.apiKey}`;
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
        res = await this.fetchImpl(url, init);
      } catch (err) {
        if (signal?.aborted) throw err;
        if (attempt >= maxRetries) {
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