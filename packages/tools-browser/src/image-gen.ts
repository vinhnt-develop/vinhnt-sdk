import { z } from "zod";
import { NetworkError } from "@vinhnt-sdk/schema";
import { toolToDefinition, type ToolDefinition, type ToolContext } from "@vinhnt-sdk/tools";

/**
 * Configuration for {@link createImageGenerationTool}.
 *
 * Everything time- or vendor-sensitive is injected: endpoint, model, key,
 * extra params, and even the `fetch` implementation — nothing is hardcoded
 * (AGENTS golden rule 2).
 */
export interface ImageGenerationConfig {
  /**
   * OpenAI-compatible images endpoint base (e.g. `https://api.openai.com/v1`).
   * REQUIRED — this package ships no default URL. Trailing slashes are trimmed.
   */
  readonly baseUrl: string;
  /** Bearer token; omit for unauthenticated/local gateways. */
  readonly apiKey?: string | undefined;
  /** Default model identifier (per-call `model` input overrides it). */
  readonly model?: string | undefined;
  /** Default image size (provider-specific string, e.g. `1024x1024`). */
  readonly size?: string | undefined;
  /** Extra body fields merged into every request (vendor-specific knobs). */
  readonly defaultParams?: Record<string, unknown> | undefined;
  /**
   * How to return generated images. `"url"` (default) prefers `url` and, when
   * the provider only returns `b64_json`, reports its size instead of the
   * payload. `"base64"` returns the full `b64_json` data.
   */
  readonly imageOutput?: "url" | "base64" | undefined;
  /** Fetch override (tests, custom agents, instrumented HTTP). Default: global `fetch`. */
  readonly fetchImpl?: typeof fetch | undefined;
}

/**
 * Create a `generate_image` tool that POSTs to an OpenAI-compatible
 * `/images/generations` endpoint. Risk `external` (permission floor asks by
 * default); the run's abort signal is forwarded to `fetch`.
 *
 * @param config - Endpoint + credentials; `baseUrl` required.
 * @returns A single tool definition.
 *
 * @example
 * ```typescript
 * const tool = createImageGenerationTool({
 *   baseUrl: process.env.IMAGE_API_BASE_URL!,
 *   apiKey: process.env.IMAGE_API_KEY,
 *   model: "my-image-model",
 * });
 * ```
 */
export function createImageGenerationTool(config: ImageGenerationConfig): ToolDefinition<unknown, unknown> {
  if (config.baseUrl.trim() === "") {
    throw new TypeError("createImageGenerationTool: baseUrl is required (no hardcoded default endpoint)");
  }
  const fetchImpl: typeof fetch = config.fetchImpl ?? fetch;
  return {
    ...toolToDefinition({
      name: "generate_image",
      description:
        "Generate an image from a text prompt via an OpenAI-compatible images endpoint and return its URL (or base64 data when configured).",
      risk: "external",
      input: z.object({
        prompt: z.string().min(1),
        model: z.string().min(1).optional(),
        size: z.string().min(1).optional(),
      }),
      async execute(input, ctx: ToolContext) {
        const baseUrl = config.baseUrl.replace(/\/+$/, "");
        const body: Record<string, unknown> = { ...config.defaultParams, prompt: input.prompt };
        const model = input.model ?? config.model;
        if (model !== undefined) body.model = model;
        const size = input.size ?? config.size;
        if (size !== undefined) body.size = size;

        const headers: Record<string, string> = { "content-type": "application/json" };
        if (config.apiKey !== undefined && config.apiKey !== "") {
          headers["authorization"] = `Bearer ${config.apiKey}`;
        }

        let response: Response;
        try {
          response = await fetchImpl(`${baseUrl}/images/generations`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: ctx.signal,
          });
        } catch (err) {
          throw new NetworkError(`image generation request failed: ${(err as Error).message}`, err);
        }
        if (!response.ok) {
          const detail = (await response.text().catch(() => "")).slice(0, 300);
          throw new NetworkError(
            `HTTP ${response.status}: ${response.statusText}${detail ? ` — ${detail}` : ""}`,
          );
        }

        let parsed: unknown;
        try {
          parsed = await response.json();
        } catch (err) {
          throw new NetworkError("image generation response is not valid JSON", err);
        }
        const data = (parsed as { data?: unknown }).data;
        if (!Array.isArray(data) || data.length === 0) {
          throw new NetworkError("image generation response has no data[] entries");
        }
        const first = (data[0] ?? {}) as { url?: unknown; b64_json?: unknown; revised_prompt?: unknown };
        const url = typeof first.url === "string" ? first.url : undefined;
        const b64 = typeof first.b64_json === "string" ? first.b64_json : undefined;
        const revised = typeof first.revised_prompt === "string" ? first.revised_prompt : undefined;
        const withRevised = <T extends Record<string, unknown>>(out: T): Record<string, unknown> =>
          revised !== undefined ? { ...out, revised_prompt: revised } : out;

        if (config.imageOutput === "base64") {
          if (b64 !== undefined) return withRevised({ b64_json: b64, ...(url !== undefined ? { url } : {}) });
          if (url !== undefined) return withRevised({ url });
          throw new NetworkError("image generation response has neither url nor b64_json");
        }
        if (url !== undefined) return withRevised({ url });
        if (b64 !== undefined) {
          return {
            note: 'provider returned only b64_json; recreate the tool with imageOutput: "base64" to receive the data',
            b64_json_chars: b64.length,
          };
        }
        throw new NetworkError("image generation response has neither url nor b64_json");
      },
    }),
    metadata: { source: "image" },
  };
}
