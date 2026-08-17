import { z } from "zod";
import { defineTool } from "@vinhnt-sdk/tools";
import { sanitizeForLLM } from "@vinhnt-sdk/security";
import { NetworkError } from "@vinhnt-sdk/schema";

const WebFetchSchema = z.object({
  url: z.string().url().or(z.string().min(1)),
  format: z.enum(["markdown", "text", "html"]).optional(),
  timeout: z.number().positive().optional(),
});

export interface WebFetchToolConfig {
  /** Maximum response size in bytes (default: 524288) */
  maxResponseSize?: number;
}

export function createWebFetchTool(config?: WebFetchToolConfig) {
  return defineTool<{ url: string; format?: "markdown" | "text" | "html"; timeout?: number }, string>({
    name: "web_fetch",
    description: "Fetch content from a URL and return it as text. Max 512KB.",
    risk: "read",
    input: WebFetchSchema,
    jsonSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to fetch" },
        format: { type: "string", enum: ["text", "html"], description: "Response format (default: text)" },
        timeout: { type: "number", description: "Timeout in ms (default: 15000)" },
      },
      required: ["url"],
    },
    async execute(v, _ctx) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), v.timeout ?? 15000);
      try {
        const response = await fetch(v.url, {
          signal: controller.signal,
          headers: { "User-Agent": "VNT-Agent/0.1" },
        });
        if (!response.ok) {
          throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`);
        }
        const text = await response.text();
        const maxSize = config?.maxResponseSize ?? 524_288;
        const raw = text.length > maxSize
          ? text.slice(0, maxSize) + `\n\n[truncated: response exceeds ${maxSize} bytes]`
          : v.format === "html" ? text : stripHtml(text);
        return sanitizeForLLM(raw, "web_fetch");
      } finally {
        clearTimeout(timeout);
      }
    },
  }).toDefinition();
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
