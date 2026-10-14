// @vinhnt-sdk/tools-browser
// Browser/computer-use + image-generation tools (P2-8 / G7.3).
// Driver-injected seam: no browser backend and no endpoint is shipped.

export { createBrowserTools } from "./browser-tools.js";
export type { BrowserToolsConfig } from "./browser-tools.js";
export type {
  BrowserDriver,
  BrowserNavigateOptions,
  BrowserNavigationResult,
  BrowserSnapshot,
  BrowserTypeOptions,
  BrowserWaitUntil,
} from "./driver.js";
export { createImageGenerationTool } from "./image-gen.js";
export type { ImageGenerationConfig } from "./image-gen.js";
