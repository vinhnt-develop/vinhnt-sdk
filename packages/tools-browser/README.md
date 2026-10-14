# @vinhnt-sdk/tools-browser

Browser/computer-use + image-generation tools for vinhnt-sdk agents.

Two capability seams, both fully injected — **this package ships no browser
backend and no endpoint** (library design: nothing time- or vendor-sensitive
is hardcoded):

- **Browser tools** — wrap any automation backend (Playwright, Puppeteer, raw
  CDP, remote browser service) behind the `BrowserDriver` interface.
- **Image generation** — one `generate_image` tool that POSTs to any
  OpenAI-compatible `/images/generations` endpoint you configure.

## Installation

```bash
pnpm add @vinhnt-sdk/tools-browser @vinhnt-sdk/tools
```

## Browser tools

```typescript
import { createBrowserTools } from "@vinhnt-sdk/tools-browser";
import type { BrowserDriver } from "@vinhnt-sdk/tools-browser";

const driver: BrowserDriver = {
  async navigate(url, options) { /* call your backend */ return { url, title: "Page" }; },
  async snapshot() { return { url: "https://example.com", content: "<html>…" }; },
  async click(selector) { /* click */ },
  async type(selector, text, options) { /* type */ },
  async close() { /* cleanup */ },
};

const tools = createBrowserTools({ driver });
// browser_navigate (external), browser_snapshot (read),
// browser_click (external), browser_type (external), browser_close (external)
```

- `browser_snapshot` output is passed through `sanitizeForLLM` with
  `ctx.sanitizeLimitChars`, so huge pages never blow the context budget.
- Risk `external` means the permission floor asks until an allow rule exists;
  `browser_snapshot` is `read` and auto-proceeds.
- Provenance is off-wire: every tool carries `metadata.source: "browser"`.

## Image generation

```typescript
import { createImageGenerationTool } from "@vinhnt-sdk/tools-browser";

const tool = createImageGenerationTool({
  baseUrl: process.env.IMAGE_API_BASE_URL!, // required — no default URL
  apiKey: process.env.IMAGE_API_KEY,        // optional (local gateways)
  model: "my-image-model",                  // optional default, per-call override
  imageOutput: "url",                       // or "base64"
});
```

- Request body merges `defaultParams` with per-call `prompt`/`model`/`size`.
- `imageOutput: "url"` (default) returns the CDN URL; if the provider only
  returns `b64_json`, the result reports `b64_json_chars` plus a hint instead
  of dumping megabytes into the conversation. `"base64"` returns the payload.
- Non-2xx, invalid JSON, empty `data[]`, and transport failures throw
  `NetworkError` (retryable, surfaced through the normal tool error path).
- The run's abort signal (`ctx.signal`) is forwarded to `fetch`.

## Exports

| Export | Kind |
|--------|------|
| `createBrowserTools` | function |
| `BrowserToolsConfig` | type |
| `BrowserDriver` | type (injection seam) |
| `BrowserNavigateOptions` | type |
| `BrowserNavigationResult` | type |
| `BrowserSnapshot` | type |
| `BrowserTypeOptions` | type |
| `BrowserWaitUntil` | type (open union) |
| `createImageGenerationTool` | function |
| `ImageGenerationConfig` | type |

## License

MIT
