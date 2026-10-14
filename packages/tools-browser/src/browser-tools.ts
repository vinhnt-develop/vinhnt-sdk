import { z } from "zod";
import { sanitizeForLLM } from "@vinhnt-sdk/guard";
import { toolToDefinition, type ToolDefinition } from "@vinhnt-sdk/tools";
import type { BrowserDriver } from "./driver.js";

/** Configuration for {@link createBrowserTools}. */
export interface BrowserToolsConfig {
  /** The injected browser backend — required; there is no built-in driver. */
  readonly driver: BrowserDriver;
}

/** Attach the off-wire provenance badge (AGENTS §2b: never serialized). */
function withSource<I, O>(def: ToolDefinition<I, O>, source: string): ToolDefinition<I, O> {
  return { ...def, metadata: { source } };
}

/**
 * Create the browser/computer-use tool set over an injected driver.
 *
 * Tools: `browser_navigate` (external), `browser_snapshot` (read — content is
 * sanitized/truncated through `ctx.sanitizeLimitChars`), `browser_click`
 * (external), `browser_type` (external), `browser_close` (external, no-op when
 * the driver has no `close`). Risk `external` means the permission floor asks
 * on `acceptEdits`/`default` until an allow rule exists.
 *
 * @param config - Requires a {@link BrowserDriver} instance.
 * @returns Tool definitions ready for registration.
 *
 * @example
 * ```typescript
 * const tools = createBrowserTools({ driver });
 * const kernel = new AgentKernel({ tools: [...tools], model, store });
 * ```
 */
export function createBrowserTools(config: BrowserToolsConfig): readonly ToolDefinition[] {
  const driver = config.driver;
  return [
    withSource(
      toolToDefinition({
        name: "browser_navigate",
        description:
          "Navigate the browser to a URL and report the final address, page title, and status when available.",
        risk: "external",
        input: z.object({
          url: z.string().min(1),
          waitUntil: z.string().min(1).optional(),
        }),
        async execute({ url, waitUntil }) {
          const result = await driver.navigate(url, waitUntil !== undefined ? { waitUntil } : {});
          return {
            url: result.url,
            ...(result.title !== undefined ? { title: result.title } : {}),
            ...(result.status !== undefined ? { status: result.status } : {}),
          };
        },
      }),
      "browser",
    ),
    withSource(
      toolToDefinition({
        name: "browser_snapshot",
        description:
          "Capture the current page content (accessibility tree, HTML, or markdown depending on the driver) for reading without interacting.",
        risk: "read",
        input: z.object({}),
        async execute(_input, ctx) {
          const snap = await driver.snapshot();
          return {
            url: snap.url,
            ...(snap.title !== undefined ? { title: snap.title } : {}),
            content: sanitizeForLLM(snap.content, "browser_snapshot", ctx.sanitizeLimitChars),
          };
        },
      }),
      "browser",
    ),
    withSource(
      toolToDefinition({
        name: "browser_click",
        description: "Click the element matching a CSS selector in the current page.",
        risk: "external",
        input: z.object({ selector: z.string().min(1) }),
        async execute({ selector }) {
          await driver.click(selector);
          return { clicked: selector };
        },
      }),
      "browser",
    ),
    withSource(
      toolToDefinition({
        name: "browser_type",
        description: "Type text into the input matching a CSS selector in the current page.",
        risk: "external",
        input: z.object({
          selector: z.string().min(1),
          text: z.string(),
          clear: z.boolean().optional(),
        }),
        async execute({ selector, text, clear }) {
          await driver.type(selector, text, clear !== undefined ? { clear } : {});
          return { typed: text.length, selector };
        },
      }),
      "browser",
    ),
    withSource(
      toolToDefinition({
        name: "browser_close",
        description: "Close the browser session and release the driver's resources.",
        risk: "external",
        input: z.object({}),
        async execute() {
          if (driver.close === undefined) return { closed: false, note: "driver has no close()" };
          await driver.close();
          return { closed: true };
        },
      }),
      "browser",
    ),
  ];
}
